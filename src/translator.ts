import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CustomAPIClient } from './utils/custom-client';
import {
    TranslationConfig,
    TranslationResult,
    TranslationError,
    Provider
} from './types/config';
import { isChineseText, validateConfig, validateLanguageCode } from './utils';

export class Translator {
    private readonly openaiClient?: OpenAI;
    private readonly anthropicClient?: Anthropic;
    private readonly customClient?: CustomAPIClient;
    private readonly provider: Provider;
    private readonly model: string;
    private readonly sourceLanguage: string;

    constructor(config: TranslationConfig) {
        validateConfig(config);

        this.provider = config.provider || 'openai';
        this.model = config.model || (this.provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet');
        this.sourceLanguage = config.sourceLanguage || 'zh';

        if (this.provider === 'openai' && config.openaiApiKey) {
            this.openaiClient = new OpenAI({
                apiKey: config.openaiApiKey
            });
        } else if (this.provider === 'claude' && config.anthropicApiKey) {
            this.anthropicClient = new Anthropic({
                apiKey: config.anthropicApiKey
            });
        } else if (this.provider === 'custom' && config.customProvider) {
            this.customClient = new CustomAPIClient(config.customProvider);
        }
    }

    public async translateObject(
      obj: Record<string, unknown>,
      targetLang: string
    ): Promise<TranslationResult> {
        validateLanguageCode(targetLang);
        const result: TranslationResult = {};

        for (const [key, value] of Object.entries(obj)) {
            if (value && typeof value === 'object') {
                result[key] = await this.translateObject(
                  value as Record<string, unknown>,
                  targetLang
                );
            } else if (typeof value === 'string' && isChineseText(value)) {
                try {
                    result[key] = await this.translateText(value, targetLang);
                } catch (error) {
                    throw this.handleError(error, key);
                }
            } else {
                result[key] = value as string;
            }
        }

        return result;
    }

    private async translateText(text: string, targetLang: string): Promise<string> {
        switch (this.provider) {
            case 'openai':
                return this.translateWithOpenAI(text, targetLang);
            case 'claude':
                return this.translateWithClaude(text, targetLang);
            case 'custom':
                if (!this.customClient) {
                    throw new Error('Custom client not initialized');
                }
                return this.customClient.translate(text, this.sourceLanguage, targetLang, this.model);
            default:
                throw new Error(`Unsupported provider: ${this.provider}`);
        }
    }

    private async translateWithOpenAI(
      text: string,
      targetLang: string
    ): Promise<string> {
        if (!this.openaiClient) {
            throw new Error('OpenAI client not initialized');
        }

        try {
            const response = await this.openaiClient.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional translator. Translate the given Chinese text to ${targetLang}. Keep any special characters and formatting. Only return the translated text without any explanations.`
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ]
            });

            return response.choices[0].message.content?.trim() || text;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    private async translateWithClaude(
      text: string,
      targetLang: string
    ): Promise<string> {
        if (!this.anthropicClient) {
            throw new Error('Claude client not initialized');
        }

        try {
            const response = await this.anthropicClient.messages.create({
                model: this.model,
                max_tokens: 1024,
                system: "You are a professional translator. Only return the translated text without any explanations.",
                messages: [{
                    role: 'user',
                    content: `Translate the following text from ${this.sourceLanguage} to ${targetLang}: ${text}`
                }]
            });

            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Claude API');
            }

            return content.text.trim();
        } catch (error) {
            throw this.handleError(error);
        }
    }

    private handleError(error: unknown, key?: string): TranslationError {
        const translationError = new Error() as TranslationError;
        translationError.name = 'TranslationError';

        if (error instanceof Error) {
            translationError.message = error.message;
            translationError.stack = error.stack;
        } else {
            translationError.message = 'Unknown translation error occurred';
        }

        translationError.code = 'TRANSLATION_FAILED';
        translationError.details = { error, key };

        return translationError;
    }
}
