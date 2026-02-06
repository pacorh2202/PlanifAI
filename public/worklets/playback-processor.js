class PlaybackProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
        this.port.onmessage = (event) => {
            // Receive Int16 PCM data from main thread
            const pcmData = event.data;
            // Convert to Float32 for Web Audio API
            const floatData = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                floatData[i] = pcmData[i] / 32768;
            }
            this.buffer.push(floatData);
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const outputChannel = output[0];

        if (this.buffer.length > 0) {
            const currentChunk = this.buffer[0];
            for (let i = 0; i < outputChannel.length; i++) {
                if (currentChunk.length > 0) {
                    outputChannel[i] = currentChunk[0];
                    this.buffer[0] = currentChunk.subarray(1);
                    if (this.buffer[0].length === 0) {
                        this.buffer.shift();
                        if (this.buffer.length === 0) break;
                    }
                }
            }
        }
        return true;
    }
}

registerProcessor('playback-processor', PlaybackProcessor);
