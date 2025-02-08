import * as fs from 'fs';
import * as path from 'path';
import { TranslationResult } from '../types/config';

export class FileProcessor {
    /**
     * 读取JSON文件
     */
    static readJsonFile(filePath: string): Record<string, unknown> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to read JSON file: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * 将翻译结果保存到文件
     */
    static saveTranslation(
        outputDir: string,
        languageCode: string,
        data: TranslationResult
    ): string {
        try {
            // 确保输出目录存在
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // 生成输出文件路径
            const outputPath = path.join(outputDir, `${languageCode}.json`);

            // 写入文件
            fs.writeFileSync(
                outputPath,
                JSON.stringify(data, null, 2),
                'utf8'
            );

            return outputPath;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to save translation: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * 批量处理翻译并保存
     */
    static async processTranslations(
        inputFile: string,
        outputDir: string,
        translator: any,
        targetLanguages: string[]
    ): Promise<Record<string, string>> {
        // 创建输出目录
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 读取输入文件
        const inputData = this.readJsonFile(inputFile);
        const results: Record<string, string> = {};

        // 对每种目标语言进行翻译
        for (const lang of targetLanguages) {
            try {
                console.log(`Translating to ${lang}...`);
                const translatedData = await translator.translateObject(inputData, lang);
                const outputPath = this.saveTranslation(outputDir, lang, translatedData);
                results[lang] = outputPath;
                console.log(`✓ Saved translation to: ${outputPath}`);
            } catch (error) {
                console.error(`✗ Failed to translate to ${lang}:`, error);
            }
        }

        return results;
    }
}
