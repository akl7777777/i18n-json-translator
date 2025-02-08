import { CustomProviderConfig } from '../types/config';
import chalk from 'chalk';

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
    private requestCount: number = 0;

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
        this.requestCount++;
        const currentRequest = this.requestCount;

        console.log(chalk.blue(`\n[Request #${currentRequest}] Starting translation:`));
        console.log(chalk.gray('Source text:'), chalk.yellow(text));
        console.log(chalk.gray(`Translating from ${sourceLang} to ${targetLang}`));

        if (this.format === 'openai') {
            return this.translateWithOpenAIFormat(text, sourceLang, targetLang, model, currentRequest);
        }
        throw new Error(`Unsupported API format: ${this.format}`);
    }

    private async translateWithOpenAIFormat(
      text: string,
      sourceLang: string,
      targetLang: string,
      model: string,
      requestNumber: number
    ): Promise<string> {
        const startTime = Date.now();

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
            temperature: 0.3,
            max_tokens: 2048
        };

        console.log(chalk.gray(`[Request #${requestNumber}] Sending request to API...`));

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
                console.error(chalk.red(`[Request #${requestNumber}] API Error:`, errorText));
                throw new Error(`API request failed: ${response.status} ${errorText}`);
            }

            const data = await response.json() as OpenAIResponse;
            const translatedText = data.choices[0].message.content.trim();
            const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log(chalk.green(`[Request #${requestNumber}] Translation completed in ${timeTaken}s`));
            console.log(chalk.gray('Translated text:'), chalk.yellow(translatedText));

            return translatedText;
        } catch (error) {
            console.error(chalk.red(`[Request #${requestNumber}] Error:`, error));
            if (error instanceof Error) {
                throw new Error(`Custom API request failed: ${error.message}`);
            }
            throw error;
        }
    }
}
