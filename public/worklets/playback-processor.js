class PlaybackProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.queue = [];
        this.bufferOffset = 0;

        this.port.onmessage = (event) => {
            const pcm16 = event.data;
            const float32 = new Float32Array(pcm16.length);
            for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / 32768;
            }
            this.queue.push(float32);
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const channel = output[0];
        const sampleCount = channel.length; // Usually 128

        let samplesFilled = 0;

        while (samplesFilled < sampleCount && this.queue.length > 0) {
            const currentChunk = this.queue[0];
            const remainingInChunk = currentChunk.length - this.bufferOffset;
            const toCopy = Math.min(sampleCount - samplesFilled, remainingInChunk);

            for (let i = 0; i < toCopy; i++) {
                channel[samplesFilled + i] = currentChunk[this.bufferOffset + i];
            }

            samplesFilled += toCopy;
            this.bufferOffset += toCopy;

            if (this.bufferOffset >= currentChunk.length) {
                this.queue.shift();
                this.bufferOffset = 0;
            }
        }

        return true;
    }
}

registerProcessor('playback-processor', PlaybackProcessor);
