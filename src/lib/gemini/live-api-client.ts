import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export enum ClientState {
    IDLE = 'IDLE',
    CONNECTING = 'CONNECTING',
    OPEN = 'OPEN',
    TALKING = 'TALKING',
    THINKING = 'THINKING',
    ERROR = 'ERROR',
    CLOSED = 'CLOSED'
}

export type ClientEvent =
    | { type: 'STATE_CHANGE'; state: ClientState }
    | { type: 'MESSAGE'; message: LiveServerMessage }
    | { type: 'ERROR'; error: Error }
    | { type: 'VOLUME'; volume: number }
    | { type: 'AUDIO_DATA'; data: Int16Array };

export interface ClientConfig {
    apiKey: string;
    model: string;
    systemInstruction: string;
    voiceName: string;
    tools: any[];
}

export class GeminiLiveClient {
    private state: ClientState = ClientState.IDLE;
    private ai: GoogleGenAI;
    private session: any = null;
    private abortController: AbortController | null = null;
    private listeners: ((event: ClientEvent) => void)[] = [];
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private timeoutId: any = null;

    constructor(private config: ClientConfig) {
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    }

    public on(listener: (event: ClientEvent) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emit(event: ClientEvent) {
        this.listeners.forEach(l => l(event));
    }

    private setState(newState: ClientState) {
        if (this.state === newState) return;
        this.state = newState;
        this.log(`State transition -> ${newState}`);
        this.emit({ type: 'STATE_CHANGE', state: newState });
    }

    private log(msg: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[GeminiClient][${level}][${timestamp}] ${msg}`);
    }

    public async connect() {
        if (this.state !== ClientState.IDLE && this.state !== ClientState.CLOSED && this.state !== ClientState.ERROR) {
            this.log('Already connecting or open', 'WARN');
            return;
        }

        this.setState(ClientState.CONNECTING);
        this.abortController = new AbortController();

        // Set a tough timeout for connection
        this.timeoutId = setTimeout(() => {
            if (this.state === ClientState.CONNECTING) {
                this.handleError(new Error('Connection timeout after 10s'));
            }
        }, 10000);

        try {
            this.log(`Connecting to model: ${this.config.model}`);
            const sessionPromise = this.ai.live.connect({
                model: this.config.model,
                config: {
                    responseModalities: [Modality.AUDIO, Modality.TEXT],
                    tools: this.config.tools,
                    systemInstruction: this.config.systemInstruction,
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: this.config.voiceName } }
                    }
                },
                callbacks: {
                    onopen: async () => {
                        clearTimeout(this.timeoutId);
                        this.session = await sessionPromise;
                        this.setState(ClientState.OPEN);
                        this.reconnectAttempts = 0;
                    },
                    onmessage: (msg: LiveServerMessage) => {
                        this.emit({ type: 'MESSAGE', message: msg });
                        this.handleIncomingMessage(msg);
                    },
                    onclose: (e: any) => {
                        this.log(`Connection closed: ${e.code} ${e.reason}`, 'WARN');
                        this.cleanup();
                        if (this.reconnectAttempts < this.maxReconnectAttempts) {
                            this.retry();
                        } else {
                            this.setState(ClientState.CLOSED);
                        }
                    },
                    onerror: (e: any) => {
                        this.handleError(e instanceof Error ? e : new Error('WebSocket error'));
                    }
                }
            });
        } catch (err: any) {
            this.handleError(err);
        }
    }

    private handleIncomingMessage(msg: LiveServerMessage) {
        if (msg.serverContent?.modelTurn?.parts) {
            const hasAudio = msg.serverContent.modelTurn.parts.some(p => p.inlineData);
            if (hasAudio) {
                this.setState(ClientState.TALKING);
            }
        }
        if (msg.toolCall) {
            this.setState(ClientState.THINKING);
        }
    }

    private handleError(err: Error) {
        clearTimeout(this.timeoutId);
        this.log(`Error: ${err.message}`, 'ERROR');
        this.emit({ type: 'ERROR', error: err });
        this.setState(ClientState.ERROR);
        this.cleanup();
    }

    private retry() {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        this.reconnectAttempts++;
        this.log(`Retrying in ${delay}ms (Attempt ${this.reconnectAttempts})`, 'INFO');
        setTimeout(() => this.connect(), delay);
    }

    public sendAudio(base64Data: string) {
        if (this.state !== ClientState.OPEN && this.state !== ClientState.TALKING && this.state !== ClientState.THINKING) return;
        try {
            this.session?.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
        } catch (err: any) {
            this.log(`Failed to send audio: ${err.message}`, 'ERROR');
        }
    }

    public sendText(text: string) {
        if (this.state !== ClientState.OPEN) return;
        this.session?.sendRealtimeInput({ text });
    }

    public sendToolResponse(functionResponses: any[]) {
        this.session?.sendToolResponse({ functionResponses });
    }

    public disconnect() {
        this.log('User requested disconnect');
        this.cleanup();
        this.setState(ClientState.CLOSED);
    }

    private cleanup() {
        clearTimeout(this.timeoutId);
        if (this.session) {
            try {
                this.session.close();
            } catch (e) { }
            this.session = null;
        }
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}
