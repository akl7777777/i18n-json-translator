export { Translator } from './translator';
export { SUPPORTED_LANGUAGES } from './utils';
export * from './types';

// Re-export main types for convenience
export type {
    TranslationConfig,
    TranslationResult,
    TranslationError,
    SupportedLanguage,
    Provider
} from './types/config';
