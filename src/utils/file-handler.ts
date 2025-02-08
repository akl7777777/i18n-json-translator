import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { TranslationResult } from '../types/config';

/**
 * Read JSON file and parse its content
 */
export function readJsonFile(filePath: string): Record<string, unknown> {
    try {
        const content = readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to read JSON file: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Write translation result to JSON file
 */
export function writeJsonFile(
    filePath: string,
    data: TranslationResult
): void {
    try {
        // Ensure directory exists
        const dir = dirname(filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // Write file with proper formatting
        writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to write JSON file: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Generate output file path for translated file
 */
export function getOutputPath(
    inputPath: string,
    languageCode: string,
    outputDir?: string
): string {
    const fileName = inputPath.replace(/\.json$/, `_${languageCode}.json`);
    if (outputDir) {
        return `${outputDir}/${fileName}`;
    }
    return fileName;
}
