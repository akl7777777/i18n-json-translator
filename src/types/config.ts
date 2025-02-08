export type Provider = 'openai' | 'claude';

export interface TranslationConfig {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    provider?: Provider;
    model?: string;
    sourceLanguage?: string;
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
