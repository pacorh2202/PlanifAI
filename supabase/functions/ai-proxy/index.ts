import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Initialize Gemini client with secret API key
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');

Deno.serve(async (req: Request) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Verify user authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing authorization header');
        }

        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') || '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        );

        // Get user from auth header
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        // Fetch profile with tier and usage
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('subscription_tier, monthly_token_usage, last_usage_reset')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            throw new Error('Profile not found');
        }

        // Logic for Tier Enforcement
        const tierLimits = {
            free: 50000,
            pro: 500000,
            premium: 5000000 // High fair use
        };

        const currentTier = profile.subscription_tier || 'free';
        const currentUsage = profile.monthly_token_usage || 0;
        const limit = tierLimits[currentTier as keyof typeof tierLimits];

        if (currentUsage >= limit) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Has alcanzado tu límite mensual de tokens. Pásate a Pro para continuar.',
                    code: 'LIMIT_EXCEEDED'
                }),
                { status: 402, headers: corsHeaders }
            );
        }

        // Parse request body
        const { message, history, tools } = await req.json();

        // Validate input
        if (!message || typeof message !== 'string') {
            throw new Error('Invalid message format');
        }

        // Tier Gating for Tools (Free users can only create)
        let allowedTools = tools || [];
        if (currentTier === 'free') {
            // Filter tools or add system instruction override
            // Assuming manageCalendar tool is passed, we could filter its schema or just instruct the AI
        }

        // Initialize Gemini model based on tier
        const modelName = currentTier === 'premium' ? "gemini-2.0-pro-exp-02-05" : "gemini-2.0-flash-exp";
        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: `Eres PlanifAI, un asistente de calendario amigable y bilingüe. Ayuda a los usuarios a gestionar su agenda.

## Tu Función
Gestiona el calendario de forma eficiente. Tras realizar una acción de herramientas (como manageCalendar), responde ÚNICAMENTE: "La tarea ha sido confirmada". NO repitas los detalles de la descripción ni hagas resúmenes innecesarios.

${currentTier === 'free' ? '## REGLA CRÍTICA DE NIVEL GRATUITO\nSolo puedes agendar (crear) tareas. Si el usuario pide modificar o borrar una tarea existente, explícale amablemente que esa función solo está disponible en la versión Pro.' : ''}

## Reglas de Interpretación Temporal
- "Por la tarde": Horario tardío (12:00h - 00:00h).
- "Hora de comer": Entre las 12:00h y las 16:00h.
- "Cena": Entre las 20:00h y las 00:00h.
- Sé preciso con estos rangos y pregunta si hay ambigüedad insalvable.

## Estilo de Respuesta
- Habla con naturalidad pero sé extremadamente conciso tras ejecutar acciones.
- No uses emojis en los títulos de las tareas.`,
            tools: allowedTools,
        });

        // Start chat with history
        const chat = model.startChat({ history: history || [] });

        // Send message and get response
        const result = await chat.sendMessage(message);
        const response = result.response;
        const usage = response.usageMetadata;

        // Update usage in DB
        if (usage) {
            await supabase.rpc('increment_token_usage', {
                user_id_param: user.id,
                tokens: usage.totalTokenCount
            });
        }

        // Return AI response
        return new Response(
            JSON.stringify({
                success: true,
                candidates: response.candidates,
                usageMetadata: usage,
                tier: currentTier
            }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        );

    } catch (error) {
        console.error('AI Proxy Error:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Internal server error',
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        );
    }
});
