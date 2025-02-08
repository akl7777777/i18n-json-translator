import { TranslationConfig } from '../types/config';

/**
 * Check if text contains Chinese characters
 */
export function isChineseText(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * Validate translation configuration
 */
export function validateConfig(config: TranslationConfig): void {
    if (!config.openaiApiKey && !config.anthropicApiKey) {
        throw new Error('Either OpenAI or Anthropic API key must be provided');
    }

    if (config.provider === 'openai' && !config.openaiApiKey) {
        throw new Error('OpenAI API key is required when using OpenAI provider');
    }

    if (config.provider === 'claude' && !config.anthropicApiKey) {
        throw new Error('Anthropic API key is required when using Claude provider');
    }
}

/**
 * Supported language codes and their names
 */
export const SUPPORTED_LANGUAGES = {
    en: { code: 'en', name: 'English', nativeName: 'English' },
    es: { code: 'es', name: 'Spanish', nativeName: 'Español' },
    fr: { code: 'fr', name: 'French', nativeName: 'Français' },
    de: { code: 'de', name: 'German', nativeName: 'Deutsch' },
    it: { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    ru: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    ja: { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    ko: { code: 'ko', name: 'Korean', nativeName: '한국어' },
    vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' }
} as const;

/**
 * Validate target language code
 */
export function validateLanguageCode(code: string): void {
    if (!Object.keys(SUPPORTED_LANGUAGES).includes(code)) {
        throw new Error(`Unsupported language code: ${code}`);
    }
}

/**
 * Sleep function for rate limiting
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format JSON string with proper indentation
 */
export function formatJson(obj: unknown): string {
    return JSON.stringify(obj, null, 2);
}
