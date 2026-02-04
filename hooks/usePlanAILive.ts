
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
    if (connected || isConnecting) return;
    setIsConnecting(true);
    nextStartTimeRef.current = 0;
    activeSourceCountRef.current = 0;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('VITE_GEMINI_API_KEY not found in environment variables');
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

    const ai = new GoogleGenAI({ apiKey });
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
    outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Traducción dinámica de la instrucción del sistema
      const langContext = language === 'es'
        ? `Habla SIEMPRE en Español. Entiende formatos de hora españoles.`
        : `Talk ALWAYS in English. Understand English time formats (AM/PM).`;

      console.log('[AI] Connecting with voice:', voiceName);
      console.log('[AI] Calendar tool configured:', calendarTool.name);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [calendarTool] }],
          systemInstruction: `Eres ${assistantName}, asistente de voz de ${userName} en PlanifAI.

${langContext}

## Tu Función
Gestiona el calendario de forma eficiente y precisa. Prioriza ejecutar acciones sobre explicarlas. Tras confirmar una tarea vía manageCalendar, responde ÚNICAMENTE: "La tarea ha sido confirmada". NO repitas los detalles de la descripción.

## Protocolo de Alta Velocidad
1. **Extrae TODO lo mencionado**:
   - Título SIN emoji (el icono se asigna automáticamente según categoryLabel)
   - Inicio + Fin (si no dice fin: +1 hora)
   - Ubicación (ej: "en casa de Ana")
   - Notas/tareas (todo lo adicional)
   - Participantes (nombres de personas)

2. **Ejecuta inmediatamente**: Apenas tengas datos mínimos, llama a manageCalendar. No expliques antes.

3. **Confirma brevemente**: Tras ejecutar manageCalendar, di "La tarea ha sido confirmada".

## Reglas de Interpretación Temporal (MÁXIMA PRIORIDAD)
- **"Por la tarde"**: Se refiere a horario tardío, desde las 12:00h hasta las 24:00h (prioriza tarde/noche).
- **"Hora de comer"**: Rango del mediodía, estrictamente entre las 12:00h y las 16:00h.
- **"Cena"**: Rango nocturno, estrictamente entre las 20:00h y las 00:00h.
- **Horarios ambiguos**: Si dice "a las 3" pregunta AM o PM. NUNCA asumas fuera de estos rangos.

## Reglas Críticas
- **Participantes (MUY IMPORTANTE)**: 
  * Título = solo la actividad (ejemplo: Cena, Reunión, etc)
  * Si mencionan "con María" o "con Pedro": añade los nombres al array attendees
  * El sistema buscará automáticamente en la red de amigos
  * NO inventes participantes, solo añade los que mencionen explícitamente
- **No encontrado**: Si menciona a alguien que no está en tu red, pregunta quién es
- **Múltiples tareas**: Confirma que entendiste todas, luego ejecuta manageCalendar una vez por cada una.
- **CONFLICTOS DE HORARIO (CRÍTICO)**:
  * Si el sistema retorna "CONFLICTO DE HORARIO: Ya tienes..." con lista de eventos
  * Lee los detalles del/los evento(s) existente(s) al usuario
  * Pregunta: "¿Quieres reemplazar [evento antiguo] con [evento nuevo]?"
  * Espera respuesta del usuario
  * Si dice que SÍ: llama manageCalendar de nuevo con el mismo evento NUEVO pero agregando replaceEventId=[ID del evento a eliminar]
  * Si dice que NO: confirma que mantienes el evento original y cancelas el nuevo

## Normas Culturales (Fallback)
Comida: 14:00 | Cena: 21:00

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
            setConnected(true);
            setIsConnecting(false);
            if (audioContextRef.current && mediaStreamRef.current) {
              const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                setVolume(rms);

                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
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
          onclose: () => {
            setConnected(false);
            setIsTalking(false);
            setIsConnecting(false);
          },
          onerror: () => {
            setConnected(false);
            setIsConnecting(false);
            disconnect();
          }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err) {
      setConnected(false);
      setIsConnecting(false);
      disconnect();
    }
  }, [connected, isConnecting, events, executeAction, userName, assistantName, activeTemplate, disconnect, language, t]);

  return { connect, disconnect, connected, isTalking, volume };
};
