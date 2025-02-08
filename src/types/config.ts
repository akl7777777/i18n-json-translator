export type Provider = 'openai' | 'claude' | 'custom';

export interface CustomProviderConfig {
    apiUrl: string;
    apiKey: string;
    format: 'openai'; // 将来可以支持更多格式
}

export interface TranslationConfig {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    provider?: Provider;
    model?: string;
    sourceLanguage?: string;
    customProvider?: CustomProviderConfig;
}

export interface SupportedLanguage {
    code: string;
    name: string;
    nativeName: string;
}

export type TranslationResult = {
    [key: string]: string | TranslationResult;
};

export interface TranslationError extends Error {
    code: string;
    details?: unknown;
}

export interface ITranslator {
    translateObject(obj: Record<string, unknown>, targetLang: string): Promise<TranslationResult>;
    getModel(): string;
}
