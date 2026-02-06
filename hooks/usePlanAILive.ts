
import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, FunctionDeclaration, Type, Modality } from '@google/genai';
import { useCalendar } from '../contexts/CalendarContext';
import { createPcmBlob, decodeAudioData, base64ToArrayBuffer } from './audio-utils';
import { CalendarEvent } from '../types';

export const usePlanAILive = () => {
  const { events, executeAction, userName, assistantName, activeTemplate, language, t, friends } = useCalendar();
  const [connected, setConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<Promise<any> | null>(null);
  const activeSourceCountRef = useRef<number>(0);

  const categoryLabels = activeTemplate.categories.map(c => c.label);

  const calendarTool: FunctionDeclaration = {
    name: 'manageCalendar',
    description: 'Crea, actualiza, elimina o mueve eventos y tareas. Úsala para CUALQUIER cambio en la agenda.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        actionType: {
          type: Type.STRING,
          enum: ['create', 'update', 'delete', 'move'],
          description: "Tipo de operación a realizar en el calendario."
        },
        eventId: {
          type: Type.STRING,
          description: "El ID único del evento. OBLIGATORIO para update, delete y move."
        },
        replaceEventId: {
          type: Type.STRING,
          description: "SOLO para resolver conflictos: ID del evento a reemplazar. Si se proporciona, se eliminará este evento antes de crear el nuevo."
        },
        eventData: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título de la tarea sin emojis (el icono se asignará automáticamente según la categoría)." },
            start: { type: Type.STRING, description: "Fecha y hora de inicio (ISO 8601). OBLIGATORIO." },
            end: { type: Type.STRING, description: "Fecha y hora de fin (ISO 8601). OBLIGATORIO. Si no se especifica duración, asume 1 hora." },
            type: { type: Type.STRING, enum: categoryLabels, description: "Categoría exacta del evento." },
            location: { type: Type.STRING, description: "Ubicación o dirección física, si se menciona." },
            descriptionPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de detalles, notas, o subtareas mencionadas." },
            allDay: { type: Type.BOOLEAN },
            attendees: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nombres EXACTOS de los amigos invitados." }
          },
          required: ['title', 'start', 'end', 'type']
        }
      },
      required: ['actionType']
    }
  };

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      try {
        const session = await sessionRef.current;
        await session.close();
      } catch (error) {
        console.warn(error);
      }
      sessionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputContextRef.current) {
      if (outputContextRef.current.state !== 'closed') await outputContextRef.current.close();
      outputContextRef.current = null;
    }
    setConnected(false);
    setIsTalking(false);
    setVolume(0);
    setIsConnecting(false);
    activeSourceCountRef.current = 0;
  }, []);

  const connect = useCallback(async (voiceName: string = 'Zephyr', isFirstRun: boolean = false) => {
    console.log('[AI] 🚀 Connect function called');
    console.log('[AI] 📊 Current state - connected:', connected, 'isConnecting:', isConnecting);

    if (connected || isConnecting) {
      console.log('[AI] ⚠️ Already connected or connecting, returning');
      return;
    }
    setIsConnecting(true);
    nextStartTimeRef.current = 0;
    activeSourceCountRef.current = 0;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process as any)?.env?.GEMINI_API_KEY;
    console.log('[AI] 🔑 API Key status:', apiKey ? `Found (length: ${apiKey.length})` : 'NOT FOUND');

    if (!apiKey) {
      console.error('[AI] ❌ VITE_GEMINI_API_KEY not found in import.meta.env or process.env');
      alert('ERROR: API Key no encontrada. Asegúrate de que VITE_GEMINI_API_KEY esté correctamente configurada en las Variables de Entorno de tu hosting (Cloudflare/Vercel).');
      setIsConnecting(false);
      return;
    }

    const eventsSummary = events.map(e =>
      `- ID: ${e.id} | Titulo: ${e.title} | Inicio: ${e.start} | Fin: ${e.end} | Estado: ${e.status}${e.attendees && e.attendees.length > 0 ? ` | Participantes: ${e.attendees.join(', ')}` : ''}`
    ).join('\n');

    const friendsSummary = friends.length > 0
      ? friends.map(f => `* NOMBRE: "${f.name}" | HANDLE: "@${f.handle}"`).join('\n')
      : "No tienes amigos agregados todavía.";

    const now = new Date();
    const localTimeFull = now.toString();
    const tzOffset = now.getTimezoneOffset();

    console.log('[AI] 📝 Initializing GoogleGenAI and AudioContext...');
    try {
      const ai = new GoogleGenAI({ apiKey });
      console.log('[AI] ✅ GoogleGenAI initialized');

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      console.log('[AI] 🔊 AudioContext class found:', !!AudioContextClass);

      audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      console.log('[AI] ✅ AudioContexts created');

      console.log('[AI] 🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[AI] ✅ Microphone access granted');
      mediaStreamRef.current = stream;

      // Traducción dinámica de la instrucción del sistema y confirmación
      const langContext = language === 'es'
        ? `Habla SIEMPRE en Español. Entiende formatos de hora españoles. Tu confirmación debe ser SIEMPRE: "La tarea ha sido confirmada".`
        : `Speak ALWAYS in English. Understand English time formats (AM/PM). Your confirmation MUST ALWAYS be exactly: "The task has been confirmed".`;

      const confirmationPhrase = language === 'es' ? "La tarea ha sido confirmada" : "The task has been confirmed";

      console.log('[AI] Connecting with voice:', voiceName);
      console.log('[AI] Calendar tool configured:', calendarTool.name);

      console.log('[AI] 📡 Connecting to Gemini Live API...');
      const modelIdentifier = 'gemini-2.0-flash-exp'; // Updated to a more stable live model if needed, but keeping logic
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.0-flash-exp', // Using the recommended stable flash model for Live API
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [calendarTool] }],
          systemInstruction: `Eres ${assistantName}, asistente de voz de ${userName} en PlanifAI.

${langContext}

## Tu Función
Gestiona el calendario de forma eficiente y precisa. Prioriza ejecutar acciones sobre explicarlas. 

## Protocolo de Respuesta (CRÍTICO)
1. **Confirma UNA SOLA VEZ**: Tras ejecutar manageCalendar con éxito, di ÚNICAMENTE: "${confirmationPhrase}". 
2. **NO repitas**: No repitas los detalles de la tarea, ni la hora, ni pidas más confirmación después de decir la frase.
3. **Idioma Estricto**: Si el contexto es Inglés, NO uses ninguna palabra en Español. Si el contexto es Español, NO uses ninguna palabra en Inglés.
4. **Gramática y Pronunciación**: Habla de forma clara, con gramática perfecta y pronunciación natural. No cometas errores gramaticales.

## Protocolo de Alta Velocidad
1. **Extrae TODO lo mencionado**:
   - Título SIN emoji (el icono se asigna automáticamente según categoryLabel)
   - Inicio + Fin (si no dice fin: +1 hora)
   - Ubicación (ej: "en casa de Ana")
   - Notas/tareas (todo lo adicional)
   - Participantes (nombres de personas)

2. **Ejecuta inmediatamente**: Apenas tengas datos mínimos, llama a manageCalendar. No expliques antes de llamar a la herramienta.

## Reglas de Interpretación Temporal (MÁXIMA PRIORIDAD)
- **"Por la tarde"**: Se refiere a horario tardío, desde las 12:00h hasta las 24:00h (prioriza tarde/noche).
- **"Hora de comer"**: Rango del mediodía, estrictamente entre las 12:00h y las 16:00h.
- **"Cena"**: Rango nocturno, estrictamente entre las 20:00h y las 00:00h.
- **Horarios ambiguos**: Si dice "a las 3" pregunta AM o PM si no es obvio por el contexto.

## Reglas Críticas Amigos
- **Participantes**: 
  * Si mencionan "con [Nombre]": añade el nombre al array attendees.
  * El sistema buscará automáticamente en la red de amigos.
  * NO inventes participantes, solo añade los que mencionen explícitamente.

## Contexto Temporal
Fecha y hora local: ${localTimeFull}
Zona horaria: UTC${tzOffset >= 0 ? '+' : ''}${-tzOffset / 60}

## Red de Amigos
${friendsSummary}

## Eventos Programados
${eventsSummary || "Sin eventos actualmente."}

Habla con naturalidad, precisión y profesionalismo.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
          }
        },
        callbacks: {
          onopen: async () => {
            console.log('[AI] ✅ WebSocket connection opened');
            setConnected(true);
            setIsConnecting(false);
            if (audioContextRef.current && mediaStreamRef.current) {
              const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;
              processor.onaudioprocess = (e) => {
                if (!connected) return;
                const inputData = e.inputBuffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                setVolume(rms);

                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then(session => {
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch (err) {
                    console.warn('[AI] ⚠️ Failed to send audio (socket might be closed):', err);
                  }
                });
              };
              source.connect(processor);
              processor.connect(audioContextRef.current.destination);
            }
            if (isFirstRun) {
              const session = await sessionPromise;
              const greeting = language === 'es' ? `Hola ${userName}, soy ${assistantName}. ${t.onboarding_msg}` : `Hello ${userName}, I'm ${assistantName}. ${t.onboarding_msg}`;
              session.sendRealtimeInput({ text: greeting });
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
              console.log('[AI] 💬 Text message:', msg.serverContent.modelTurn.parts[0].text);
            }
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              activeSourceCountRef.current += 1;
              setIsTalking(true);
              const ctx = outputContextRef.current;
              if (ctx) {
                if (nextStartTimeRef.current < ctx.currentTime) nextStartTimeRef.current = ctx.currentTime;
                try {
                  const audioBuffer = await decodeAudioData(new Uint8Array(base64ToArrayBuffer(audioData)), ctx);
                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(ctx.destination);
                  source.start(nextStartTimeRef.current);
                  source.onended = () => {
                    activeSourceCountRef.current -= 1;
                    if (activeSourceCountRef.current <= 0) {
                      activeSourceCountRef.current = 0;
                      setIsTalking(false);
                    }
                  };
                  nextStartTimeRef.current += audioBuffer.duration;
                } catch (e) {
                  activeSourceCountRef.current -= 1;
                  if (activeSourceCountRef.current <= 0) setIsTalking(false);
                }
              }
            }
            if (msg.toolCall) {
              console.log('[AI] 🔧 Tool call received:', JSON.stringify(msg.toolCall, null, 2));
              const functionResponses = [];
              for (const fc of msg.toolCall.functionCalls) {
                console.log('[AI] 📞 Function:', fc.name, '| Args:', JSON.stringify(fc.args, null, 2));
                if (fc.name === 'manageCalendar') {
                  console.log('[AI] 📅 Executing manageCalendar...');
                  try {
                    console.log('[AI] 📅 Executing manageCalendar with args:', fc.args);
                    const result = await executeAction(fc.args as any);
                    console.log('[AI] ✅ Result:', result);
                    functionResponses.push({ id: fc.id, name: fc.name, response: { result: result } });
                  } catch (error) {
                    console.error('[AI] ❌ Error:', error);
                    functionResponses.push({ id: fc.id, name: fc.name, response: { error: String(error) } });
                  }
                } else {
                  console.warn('[AI] ⚠️ Unknown function:', fc.name);
                }
              }
              if (functionResponses.length > 0) {
                console.log('[AI] 📤 Sending responses:', functionResponses);
                const session = await sessionPromise;
                session.sendToolResponse({ functionResponses });
              }
            }
          },
          onclose: (e: any) => {
            console.log('[AI] 🔌 WebSocket connection closed:', e.code, e.reason);
            setConnected(false);
            setIsTalking(false);
            setIsConnecting(false);
          },
          onerror: (e: any) => {
            console.error('[AI] ⚠️ WebSocket error event:', e);
            setConnected(false);
            setIsConnecting(false);
            disconnect();
          }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error('[AI] ❌ Critical connect error:', err);

      // Categorizar errores comunes para el usuario
      let userFriendlyMessage = 'Error desconocido al conectar.';
      if (err.message?.includes('403') || err.message?.includes('permission')) {
        userFriendlyMessage = 'Error 403: Acceso denegado. Verifica que tu API Key tenga habilitada la "Generative Language API" y que las restricciones de dominio en Google Cloud permitan este sitio.';
      } else if (err.message?.includes('404')) {
        userFriendlyMessage = `Error 404: Modelo no encontrado. Puede que el modelo preview no esté disponible en tu región actual.`;
      } else if (err.message?.includes('API_KEY_INVALID')) {
        userFriendlyMessage = 'La API Key proporcionada no es válida.';
      } else {
        userFriendlyMessage = err.message || String(err);
      }

      alert('ERROR ASISTENTE DE VOZ: ' + userFriendlyMessage);
      setConnected(false);
      setIsConnecting(false);
      disconnect();
    }
  }, [connected, isConnecting, events, executeAction, userName, assistantName, activeTemplate, disconnect, language, t]);

  return { connect, disconnect, connected, isTalking, volume };
};
