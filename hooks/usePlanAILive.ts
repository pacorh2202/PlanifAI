
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
  const [isThinking, setIsThinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Added isProcessing state

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const playbackNodeRef = useRef<AudioWorkletNode | null>(null);
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
    setIsProcessing(false); // Clear processing flag
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
    if (playbackNodeRef.current) {
      playbackNodeRef.current.disconnect();
      playbackNodeRef.current = null;
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
    setIsThinking(false);
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
    setIsProcessing(false); // Reset processing flag
    nextStartTimeRef.current = 0;
    activeSourceCountRef.current = 0;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log('[AI] 🔑 API Key status:', apiKey ? `Found (length: ${apiKey.length})` : 'NOT FOUND');

    if (!apiKey) {
      console.error('[AI] ❌ VITE_GEMINI_API_KEY not found in import.meta.env');
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

      console.log('[AI] 📦 Loading AudioWorklets...');
      await Promise.all([
        audioContextRef.current.audioWorklet.addModule('/worklets/pcm-processor.js'),
        outputContextRef.current.audioWorklet.addModule('/worklets/playback-processor.js')
      ]);
      console.log('[AI] ✅ AudioWorklets loaded');

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

      console.log('[AI] 📡 Connecting to Gemini Live API with origin:', window.location.origin);
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025', // User requested exact model
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [calendarTool] }],
          systemInstruction: `Eres ${assistantName}, el asistente inteligente de ${userName} en PlanifAI.

## Personalidad y Tono
- **Natural y Humano**: Habla de forma fluida, como un amigo eficiente. Evita sonar como un robot.
- **Brevedad Extrema**: Nunca des explicaciones largas. Si puedes decir algo en 5 palabras, no uses 10.
- **Sin Repeticiones**: Si ya has confirmado algo o el usuario lo sabe, no lo repitas. 

## Protocolo de Acción (CRÍTICO)
1. **Ejecución Directa**: Cuando el usuario pida algo, llama a la herramienta manageCalendar INMEDIATAMENTE. No pidas permiso ni digas "vale, lo hago".
2. **Confirmación Única**: Tras una acción EXITOSA, di SOLO: "${confirmationPhrase}". NADA MÁS.
3. **Manejo de Errores**: Si algo falla, explica brevemente por qué y pregunta qué quieres hacer.

## Capacidades de Optimización
Puedes y DEBES modificar tareas existentes si el usuario lo pide. Trata las tareas como objetos editables. Puedes:
- Cambiar hora de inicio/fin o duración.
- Repriorizar o mover de día.
- Añadir detalles, subtareas o recordatorios.
- Dividir una tarea en varias.
NO crees una tarea nueva si el usuario solo quiere editar una existente. Usa \`actionType: 'update'\`.

## Contexto Temporal y Amigos
- Fecha actual: ${localTimeFull} (Llevamos cuenta de la zona horaria UTC${tzOffset >= 0 ? '+' : ''}${-tzOffset / 60}).
- Amigos disponibles: ${friendsSummary}
- Eventos hoy: ${eventsSummary || "No hay eventos hoy."}

Habla siempre en ${language === 'es' ? 'Español' : 'Inglés'} con gramática perfecta.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
          }
        },
        callbacks: {
          onopen: async () => {
            console.log('[AI] ✅ WebSocket connection opened');
            await audioContextRef.current?.resume();
            await outputContextRef.current?.resume();

            setConnected(true);
            setIsConnecting(false);
            if (audioContextRef.current && mediaStreamRef.current && outputContextRef.current) {
              const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);

              // 1. Input Processor
              const pcmNode = new AudioWorkletNode(audioContextRef.current, 'pcm-processor');
              processorRef.current = pcmNode;

              pcmNode.port.onmessage = (e) => {
                const { pcm, rms } = e.data;
                // Periodic log to verify worklet is alive
                if (Math.random() < 0.01) console.log('[AI] 🎙️ AudioWorklet active, rms:', rms.toFixed(4));

                setVolume(rms);

                sessionPromise.then(session => {
                  try {
                    // Correct conversion: Uint8Array(pcm) -> base64
                    const uint8 = new Uint8Array(pcm);
                    let binary = '';
                    for (let i = 0; i < uint8.length; i++) {
                      binary += String.fromCharCode(uint8[i]);
                    }
                    const base64 = btoa(binary);
                    session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
                  } catch (err) {
                    // Silently warn, don't flood console
                  }
                });
              };

              // 2. Playback Processor
              const playbackNode = new AudioWorkletNode(outputContextRef.current, 'playback-processor');
              playbackNodeRef.current = playbackNode;
              playbackNode.port.onmessage = (e) => {
                if (e.data === 'playback-ended') {
                  setIsTalking(false);
                }
              };
              playbackNode.connect(outputContextRef.current.destination);

              source.connect(pcmNode);
              pcmNode.connect(audioContextRef.current.destination);
            }
            if (isFirstRun) {
              const session = await sessionPromise;
              const greeting = language === 'es' ? `Hola ${userName}, soy ${assistantName}. ${t.onboarding_msg}` : `Hello ${userName}, I'm ${assistantName}. ${t.onboarding_msg}`;
              session.sendRealtimeInput({ text: greeting });
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!connected) return; // Ignore messages if disconnected

            if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
              console.log('[AI] 💬 Text message:', msg.serverContent.modelTurn.parts[0].text);
            }
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && playbackNodeRef.current) {
              setIsTalking(true);
              setIsThinking(false);
              const buffer = base64ToArrayBuffer(audioData);
              const pcmData = new Int16Array(buffer);
              playbackNodeRef.current.port.postMessage(pcmData);
            }
            if (msg.toolCall) {
              // Fix: Prevent duplicate processing
              if (isProcessing) {
                console.log('[AI] ⚠️ Ignoring duplicate tool call while processing.');
                return;
              }

              console.log('[AI] 🔧 Tool call received:', JSON.stringify(msg.toolCall, null, 2));
              setIsThinking(true);
              setIsProcessing(true); // Set processing flag

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

              setIsProcessing(false); // Clear processing flag

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
  }, [connected, isConnecting, events, executeAction, userName, assistantName, activeTemplate, disconnect, language, t, isProcessing]); // Added isProcessing to deps

  return { connect, disconnect, connected, isTalking, isThinking, volume };
};
