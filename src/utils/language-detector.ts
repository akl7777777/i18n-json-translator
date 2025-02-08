/**
 * Language detection utility functions
 */

// Common character ranges for different languages
const RANGES = {
    chinese: /[\u4e00-\u9fa5]/,
    japanese: /[\u3040-\u309F\u30A0-\u30FF]/,
    korean: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,
    latin: /[a-zA-Z]/,
    cyrillic: /[\u0400-\u04FF]/,
    thai: /[\u0E00-\u0E7F]/,
    vietnamese: /[\u00C0-\u1EF9]/
};

/**
 * Detect the primary language of a text string
 */
export function detectLanguage(text: string): string {
    const charCounts = new Map<string, number>();

    // Count characters in each range
    for (const char of text) {
        for (const [lang, range] of Object.entries(RANGES)) {
            if (range.test(char)) {
                charCounts.set(lang, (charCounts.get(lang) || 0) + 1);
            }
        }
    }

    // Find the language with the most matching characters
    let maxCount = 0;
    let detectedLanguage = 'unknown';

    charCounts.forEach((count, lang) => {
        if (count > maxCount) {
            maxCount = count;
            detectedLanguage = lang;
        }
    });

    return detectedLanguage;
}

/**
 * Check if text contains characters from multiple languages
 */
export function isMultiLanguage(text: string): boolean {
    const languages = new Set<string>();

    for (const char of text) {
        for (const [lang, range] of Object.entries(RANGES)) {
            if (range.test(char)) {
                languages.add(lang);
                if (languages.size > 1) {
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * Calculate the ratio of characters matching a specific language
 */
export function getLanguageConfidence(text: string, language: string): number {
    const range = RANGES[language as keyof typeof RANGES];
    if (!range) {
        return 0;
    }

    let matches = 0;
    let total = 0;

    for (const char of text) {
        if (/\s/.test(char)) {
            continue; // Skip whitespace
        }
        total++;
        if (range.test(char)) {
            matches++;
        }
    }

    return total > 0 ? matches / total : 0;
}

/**
 * Check if text might need translation
 * Returns true if text contains significant amount of source language characters
 */
export function needsTranslation(
    text: string,
    sourceLanguage: string,
    threshold = 0.3
): boolean {
    const confidence = getLanguageConfidence(text, sourceLanguage);
    return confidence > threshold;
}
