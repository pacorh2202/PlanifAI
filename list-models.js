import { GoogleGenAI } from '@google/genai';

async function listModels() {
    const apiKey = 'AIzaSyD1sV4wOeReO2zGzF4REnoZXPNVIgfHK7Y';
    const genAI = new GoogleGenAI({ apiKey });

    try {
        const models = await genAI.getModels();
        console.log('Available models:');
        models.forEach(m => {
            if (m.supportedGenerationMethods.includes('bidiGenerateContent')) {
                console.log(`- ${m.name} (Supports bidiGenerateContent)`);
            }
        });
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
