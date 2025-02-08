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
    // 检查自定义提供者配置
    if (config.provider === 'custom') {
        if (!config.customProvider?.apiKey || !config.customProvider?.apiUrl) {
            throw new Error('Custom provider requires both API key and URL');
        }
        return;
    }

    // 检查 OpenAI 和 Anthropic 配置
    if (config.provider === 'openai') {
        if (!config.openaiApiKey) {
            throw new Error('OpenAI API key is required when using OpenAI provider');
        }
        return;
    }

    if (config.provider === 'claude') {
        if (!config.anthropicApiKey) {
            throw new Error('Anthropic API key is required when using Claude provider');
        }
        return;
    }

    // 如果没有指定提供者，检查是否至少提供了一个 API key
    if (!config.provider) {
        if (!config.openaiApiKey && !config.anthropicApiKey && !config.customProvider) {
            throw new Error('At least one API provider configuration must be provided');
        }
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
