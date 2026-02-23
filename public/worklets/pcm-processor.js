class PcmProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputData = input[0];

            // Calculate RMS (volume)
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);

            // Convert to Int16 PCM for Gemini
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)));
            }

            // Send to main thread
            this.port.postMessage({
                pcm: pcmData.buffer, // Send buffer to avoid clone issues
                rms: rms
            }, [pcmData.buffer]); // Transferable
        }
        return true;
    }
}

registerProcessor('pcm-processor', PcmProcessor);
