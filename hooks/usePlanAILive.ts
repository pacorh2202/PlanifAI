
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const playbackNodeRef = useRef<AudioWorkletNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<Promise<any> | null>(null);
  const activeSourceCountRef = useRef<number>(0);
  const turnActiveRef = useRef<boolean>(false);
  const isTalkingRef = useRef<boolean>(false);
  const unmuteCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            start: { type: Type.STRING, description: "Fecha y hora de inicio en ISO 8601 con offset de zona horaria (ej: 2026-02-12T17:00:00+01:00). OBLIGATORIO para create." },
            end: { type: Type.STRING, description: "Fecha y hora de fin en ISO 8601 con offset de zona horaria. OBLIGATORIO para create. Si no se especifica duración, asume 1 hora." },
            type: { type: Type.STRING, enum: categoryLabels, description: "Categoría exacta del evento." },
            location: { type: Type.STRING, description: "Ubicación o dirección física, si se menciona." },
            descriptionPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de detalles, notas, o subtareas mencionadas." },
            allDay: { type: Type.BOOLEAN },
            attendees: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nombres EXACTOS de los amigos invitados." }
          },
          description: "Para 'create': title, start, end, type son obligatorios. Para 'update': envía SOLO los campos que cambian."
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

    // Build a rich event summary with ALL fields, dates in local timezone
    const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. 'Europe/Madrid'
    const fmtLocal = (iso: string) => {
      try {
        return new Date(iso).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
          timeZone: userTZ, weekday: 'short', day: 'numeric', month: 'short',
          hour: '2-digit', minute: '2-digit', hour12: false
        });
      } catch { return iso; }
    };
    const eventsSummary = events.map(e => {
      const parts = [
        `ID: ${e.id}`,
        `Título: ${e.title}`,
        `Inicio: ${fmtLocal(e.start)}`,
        `Fin: ${fmtLocal(e.end)}`,
        `Categoría: ${e.categoryLabel || e.type}`,
        `Estado: ${e.status}`
      ];
      if (e.location) parts.push(`Ubicación: ${e.location}`);
      if (e.descriptionPoints && e.descriptionPoints.length > 0) parts.push(`Notas: ${e.descriptionPoints.join('; ')}`);
      if (e.attendees && e.attendees.length > 0) parts.push(`Participantes: ${e.attendees.join(', ')}`);
      if (e.allDay) parts.push('Todo el día: sí');
      return `- ${parts.join(' | ')}`;
    }).join('\n');

    const friendsSummary = friends.length > 0
      ? friends.map(f => `* NOMBRE: "${f.name}" | HANDLE: "@${f.handle}"`).join('\n')
      : "No tienes amigos agregados todavía.";

    const now = new Date();
    const localTimeFull = now.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
      timeZone: userTZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const tzOffset = now.getTimezoneOffset();
    const tzSign = tzOffset <= 0 ? '+' : '-';
    const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
    const isoOffset = `${tzSign}${tzHours}:${tzMins}`; // e.g. +01:00

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
          systemInstruction: {
            parts: [{
              text: `Eres ${assistantName}, el asistente inteligente de ${userName} en PlanifAI.

## Personalidad y Tono
- **Natural y Humano**: Habla de forma fluida, como un amigo eficiente. Evita sonar como un robot.
- **Brevedad Extrema**: Nunca des explicaciones largas. Si puedes decir algo en 5 palabras, no uses 10.
- **Sin Repeticiones**: NUNCA repitas una frase que ya hayas dicho. Cada respuesta se dice UNA SOLA VEZ. Cuando termines de hablar, detente limpiamente. No añadas nada más después de la despedida o confirmación.

## Calidad de Habla (CRÍTICO)
- Pronuncia cada palabra COMPLETA y CLARA, especialmente la ÚLTIMA palabra de cada frase.
- Nunca trunces, acortes ni deformes palabras.
- Habla como si leyeras en voz alta a una persona, con ritmo natural.
- Termina cada frase con una pausa limpia y natural.

## Protocolo de Acción (CRÍTICO)
1. **Ejecución Directa**: Cuando el usuario pida algo, llama a la herramienta manageCalendar INMEDIATAMENTE. No pidas permiso ni digas "vale, lo hago".
2. **Extracción de Títulos Limpios (ESTRICTO)**: NUNCA incluyas nombres de personas en el título de la tarea (ej. "con Pepe", "y María"). El título debe ser solo la actividad. El nombre debe ir EXCLUSIVAMENTE al campo \`attendees\`. Ejemplo: "Inglés con Pepe" -> title: "Inglés", attendees: ["Pepe"].
3. **Confirmación Única**: Tras una acción EXITOSA, di EXACTAMENTE: "${confirmationPhrase}". Esa frase se pronuncia UNA ÚNICA VEZ. Después de decirla, CALLA y espera al usuario. PROHIBIDO repetirla o añadir variaciones.
4. **Manejo de Errores**: Si algo falla, explica brevemente por qué y pregunta qué quieres hacer.

## Zona Horaria (MUY IMPORTANTE)
- Zona horaria del usuario: ${userTZ} (UTC${isoOffset}).
- Fecha y hora actual: ${localTimeFull}.
- SIEMPRE genera fechas ISO 8601 CON el offset de zona horaria del usuario. Ejemplo: 2026-02-12T17:00:00${isoOffset}.
- NUNCA uses UTC puro (que termina en Z). SIEMPRE incluye el offset ${isoOffset}.
- Los horarios mostrados abajo ya están en la hora LOCAL del usuario.

## Eventos Actuales
${eventsSummary || "No hay eventos hoy."}

## Capacidades de Consulta y Edición (COMPLETAS)
Tienes acceso TOTAL a todos los campos de cada evento. Puedes:
- **Consultar** CUALQUIER dato: título, horario, ubicación, categoría, notas/subtareas, participantes, estado.
- **Editar** CUALQUIER campo individualmente con actionType 'update': envía SOLO el campo que cambia en eventData.
  Ejemplos: cambiar solo la ubicación, añadir/modificar notas, cambiar la categoría, actualizar participantes.
- **No alterar** otros campos al editar: si el usuario pide cambiar la ubicación, envía solo { location: "nuevo valor" } en eventData.

## Amigos Disponibles
${friendsSummary}

## Manejo de Amigos y Nombres Duplicados
- Para referirte a otras personas: USA SIEMPRE SU @handle (nombre de usuario).
- NUNCA uses el nombre real de otras personas, es información privada.
- Solo usa el nombre real del usuario (${userName}) para dirigirte a él/ella con naturalidad.
- Si el usuario dice "Invita a Juan", y el handle es @juan123, di: "Entendido, invito a @juan123".
- Si hay ambigüedad, pregunta usando los @handles: "¿Te refieres a @juan123 o a @juan456?".

Habla siempre en ${language === 'es' ? 'Español' : 'Inglés'} con gramática perfecta.`
            }]
          },
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

                // CRITICAL: Mute mic input while AI is speaking to prevent echo feedback
                if (isTalkingRef.current) return;

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
                  // DON'T unmute mic immediately — audio chunks arrive with gaps.
                  // Schedule unmute after cooldown; cancel if new audio arrives.
                  if (unmuteCooldownRef.current) clearTimeout(unmuteCooldownRef.current);
                  unmuteCooldownRef.current = setTimeout(() => {
                    isTalkingRef.current = false;
                    unmuteCooldownRef.current = null;
                  }, 1500);
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
            // Detect turn completion to prevent duplicate audio
            if (msg.serverContent?.turnComplete) {
              turnActiveRef.current = false;
              // Schedule unmute after turnComplete + cooldown
              if (unmuteCooldownRef.current) clearTimeout(unmuteCooldownRef.current);
              unmuteCooldownRef.current = setTimeout(() => {
                isTalkingRef.current = false;
                setIsTalking(false);
                unmuteCooldownRef.current = null;
              }, 1500);
              return;
            }

            if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
              console.log('[AI] 💬 Text message:', msg.serverContent.modelTurn.parts[0].text);
            }
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && playbackNodeRef.current) {
              // Cancel any pending unmute — new audio is arriving
              if (unmuteCooldownRef.current) {
                clearTimeout(unmuteCooldownRef.current);
                unmuteCooldownRef.current = null;
              }
              turnActiveRef.current = true;
              isTalkingRef.current = true;
              setIsTalking(true);
              setIsThinking(false);
              const buffer = base64ToArrayBuffer(audioData);
              const pcmData = new Int16Array(buffer);
              playbackNodeRef.current.port.postMessage(pcmData);
            }
            if (msg.toolCall) {
              console.log('[AI] 🔧 Tool call received:', JSON.stringify(msg.toolCall, null, 2));
              setIsThinking(true);
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

  return { connect, disconnect, connected, isTalking, isThinking, volume };
};
