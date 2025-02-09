export type Provider = 'openai' | 'claude' | 'custom';

export interface CustomProviderConfig {
    apiUrl: string;
    apiKey: string;
    format: 'openai' | 'claude'; // 将来可以支持更多格式
}

export interface TranslationConfig {
    provider?: Provider;
    model?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    customProvider?: CustomProviderConfig;
    sourceLanguage?: string;  // 添加源语言配置
}

export interface SupportedLanguage {
    code: string;
    name: string;
    nativeName: string;
}

export interface RetryOptions {
    maxRetries?: number;    // 最大重试次数
    retryDelay?: number;    // 初始重试延迟(ms)
    retryMultiplier?: number; // 重试延迟倍数
}

export interface TranslationOptions extends RetryOptions {
    maxWorkers?: number;    // 最大并行工作线程数
    batchDelay?: number;    // 批次间延迟(ms)
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
