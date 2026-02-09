import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveServerMessage, Modality } from '@google/genai';
import { useCalendar } from '../contexts/CalendarContext';
import { GEMINI_CONFIG } from '../src/lib/ai-config';
import { GeminiLiveClient, ClientState } from '../src/lib/gemini/live-api-client';
import { base64ToArrayBuffer } from './audio-utils';

export const usePlanAILive = () => {
  const { events, executeAction, userName, assistantName, activeTemplate, language, t, friends } = useCalendar();
  const [connected, setConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const playbackNodeRef = useRef<AudioWorkletNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);

  const categoryLabels = activeTemplate.categories.map(c => c.label);

  const calendarTool = {
    name: 'manageCalendar',
    description: 'Crea, actualiza, elimina o mueve eventos y tareas. Úsala para CUALQUIER cambio en la agenda.',
    parameters: {
      type: 'OBJECT',
      properties: {
        actionType: {
          type: 'STRING',
          enum: ['create', 'update', 'delete', 'move'],
          description: "Tipo de operación a realizar en el calendario."
        },
        eventId: {
          type: 'STRING',
          description: "El ID único del evento."
        },
        eventData: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            start: { type: 'STRING' },
            end: { type: 'STRING' },
            type: { type: 'STRING', enum: categoryLabels }
          }
        }
      },
      required: ['actionType']
    }
  };

  const cleanupAudio = useCallback(async () => {
    console.log('[usePlanAILive] 🧹 Cleaning up audio resources...');
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
    setVolume(0);
    setIsTalking(false);
    setIsThinking(false);
    setIsProcessing(false);
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    cleanupAudio();
    setConnected(false);
    setIsConnecting(false);
  }, [cleanupAudio]);

  const connect = useCallback(async (voiceName: string = 'Zephyr', isFirstRun: boolean = false) => {
    if (connected || isConnecting) return;

    setIsConnecting(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || GEMINI_CONFIG.API_KEY;

    if (!apiKey) {
      alert('Error: API Key missing');
      setIsConnecting(false);
      return;
    }

    try {
      // 1. Setup Audio
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });

      await Promise.all([
        audioContextRef.current.audioWorklet.addModule('/worklets/pcm-processor.js'),
        outputContextRef.current.audioWorklet.addModule('/worklets/playback-processor.js')
      ]);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const pcmNode = new AudioWorkletNode(audioContextRef.current, 'pcm-processor');
      processorRef.current = pcmNode;

      const playbackNode = new AudioWorkletNode(outputContextRef.current, 'playback-processor');
      playbackNodeRef.current = playbackNode;
      playbackNode.connect(outputContextRef.current.destination);

      source.connect(pcmNode);
      pcmNode.connect(audioContextRef.current.destination);

      // 2. Initialize Client
      const eventsSummary = events.map(e => `- ID: ${e.id} | Titulo: ${e.title} | Inicio: ${e.start}`).join('\n');
      const friendsSummary = friends.map(f => `* ${f.name}`).join('\n');
      const now = new Date();

      clientRef.current = new GeminiLiveClient({
        apiKey,
        model: GEMINI_CONFIG.MODEL,
        voiceName,
        tools: [{ functionDeclarations: [calendarTool] }],
        systemInstruction: GEMINI_CONFIG.SYSTEM_INSTRUCTION(
          userName,
          assistantName,
          language as 'es' | 'en',
          eventsSummary,
          friendsSummary,
          now.toString(),
          now.getTimezoneOffset()
        )
      });

      // 3. Bind Events
      clientRef.current.on(async (event) => {
        switch (event.type) {
          case 'STATE_CHANGE':
            setConnected(event.state === ClientState.OPEN || event.state === ClientState.TALKING || event.state === ClientState.THINKING);
            setIsConnecting(event.state === ClientState.CONNECTING);
            setIsTalking(event.state === ClientState.TALKING);
            setIsThinking(event.state === ClientState.THINKING);
            if (event.state === ClientState.OPEN && isFirstRun) {
              const greeting = language === 'es' ? `Hola ${userName}. ${t.onboarding_msg}` : `Hello ${userName}. ${t.onboarding_msg}`;
              clientRef.current?.sendText(greeting);
            }
            break;

          case 'MESSAGE':
            const msg = event.message;
            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                const audioData = part.inlineData?.data;
                if (audioData && playbackNodeRef.current) {
                  if (outputContextRef.current?.state === 'suspended') await outputContextRef.current.resume();
                  const pcmData = new Int16Array(base64ToArrayBuffer(audioData));
                  playbackNodeRef.current.port.postMessage(pcmData);
                }
              }
            }
            if (msg.toolCall) {
              setIsProcessing(true);
              const functionResponses = [];
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'manageCalendar') {
                  const result = await executeAction(fc.args as any);
                  functionResponses.push({ id: fc.id, name: fc.name, response: { result } });
                }
              }
              clientRef.current?.sendToolResponse(functionResponses);
              setIsProcessing(false);
            }
            break;

          case 'ERROR':
            console.error('[usePlanAILive] Client Error:', event.error);
            break;
        }
      });

      pcmNode.port.onmessage = (e) => {
        const { pcm, rms } = e.data;
        setVolume(rms);
        if (clientRef.current) {
          const uint8 = new Uint8Array(pcm);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
          clientRef.current.sendAudio(btoa(binary));
        }
      };

      playbackNode.port.onmessage = (e) => {
        if (e.data === 'playback-ended') setIsTalking(false);
      };

      await clientRef.current.connect();

    } catch (err) {
      console.error('[usePlanAILive] Connection failed:', err);
      cleanupAudio();
      setIsConnecting(false);
    }
  }, [connected, isConnecting, events, executeAction, userName, assistantName, language, t, friends, cleanupAudio]);

  useEffect(() => {
    return () => {
      if (clientRef.current) clientRef.current.disconnect();
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return { connect, disconnect, connected, isTalking, isThinking, volume };
};
