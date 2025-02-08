import { CustomProviderConfig } from '../types/config';

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenAIRequest {
    model: string;
    messages: OpenAIMessage[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
}

interface OpenAIResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

export class CustomAPIClient {
    private readonly apiUrl: string;
    private readonly apiKey: string;
    private readonly format: string;

    constructor(config: CustomProviderConfig) {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
        this.format = config.format;
    }

    async translate(
        text: string,
        sourceLang: string,
        targetLang: string,
        model: string
    ): Promise<string> {
        if (this.format === 'openai') {
            return this.translateWithOpenAIFormat(text, sourceLang, targetLang, model);
        }
        throw new Error(`Unsupported API format: ${this.format}`);
    }

    private async translateWithOpenAIFormat(
        text: string,
        sourceLang: string,
        targetLang: string,
        model: string
    ): Promise<string> {
        const messages: OpenAIMessage[] = [
            {
                role: 'system',
                content: `You are a professional translator. Translate from ${sourceLang} to ${targetLang}. Only return the translated text without any explanations.`
            },
            {
                role: 'user',
                content: text
            }
        ];

        const requestBody: OpenAIRequest = {
            model: model,
            messages: messages,
            stream: false,
            temperature: 0.3, // 较低的温度以保持翻译的一致性
            max_tokens: 2048
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${errorText}`);
            }

            const data = await response.json() as OpenAIResponse;
            return data.choices[0].message.content.trim();
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Custom API request failed: ${error.message}`);
            }
            throw error;
        }
    }
}
