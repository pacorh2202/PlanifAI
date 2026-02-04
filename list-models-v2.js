
import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
    const apiKey = 'AIzaSyD1sV4wOeReO2zGzF4REnoZXPNVIgfHK7Y';
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const result = await genAI.listModels();
        console.log('Available models for bidiGenerateContent:');
        result.models.forEach(m => {
            if (m.supportedGenerationMethods.includes('bidiGenerateContent')) {
                console.log(`- ${m.name} (${m.displayName})`);
            }
        });
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
