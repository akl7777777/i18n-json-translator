export * from './config';

// Event types
export interface TranslationProgressEvent {
    type: 'progress';
    language: string;
    current: number;
    total: number;
    file?: string;
}

export interface TranslationCompleteEvent {
    type: 'complete';
    language: string;
    file?: string;
}

export interface TranslationErrorEvent {
    type: 'error';
    language: string;
    error: Error;
    file?: string;
}

export type TranslationEvent =
    | TranslationProgressEvent
    | TranslationCompleteEvent
    | TranslationErrorEvent;

// Callback types
export type TranslationProgressCallback = (event: TranslationEvent) => void;

// Options interface for batch processing
export interface BatchTranslationOptions {
    concurrency?: number;
    delay?: number;
    onProgress?: TranslationProgressCallback;
}

// File processing options
export interface FileProcessingOptions {
    outputDir?: string;
    format?: boolean;
    backup?: boolean;
}
