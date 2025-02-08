import * as fs from 'fs';
import * as path from 'path';
import { TranslationResult } from '../types/config';
import chalk from 'chalk';

export class FileProcessor {
    /**
     * 读取JSON文件
     */
    static readJsonFile(filePath: string): Record<string, unknown> {
        try {
            console.log(chalk.blue('\nReading input file:', filePath));
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            console.log(chalk.green('File read successfully'));
            return data;
        } catch (error) {
            console.error(chalk.red('Failed to read JSON file:', error));
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
                console.log(chalk.blue('Creating output directory:', outputDir));
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // 生成输出文件路径
            const outputPath = path.join(outputDir, `${languageCode}.json`);
            console.log(chalk.blue('\nSaving translation to:', outputPath));

            // 写入文件
            fs.writeFileSync(
              outputPath,
              JSON.stringify(data, null, 2),
              'utf8'
            );

            console.log(chalk.green('File saved successfully'));
            return outputPath;
        } catch (error) {
            console.error(chalk.red('Failed to save translation:', error));
            if (error instanceof Error) {
                throw new Error(`Failed to save translation: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * 计算要翻译的键的总数
     */
    private static countTranslatableKeys(obj: Record<string, unknown>): number {
        let count = 0;
        for (const value of Object.values(obj)) {
            if (typeof value === 'string') {
                count++;
            } else if (value && typeof value === 'object') {
                count += this.countTranslatableKeys(value as Record<string, unknown>);
            }
        }
        return count;
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
        const totalKeys = this.countTranslatableKeys(inputData);
        const results: Record<string, string> = {};

        console.log(chalk.blue(`\nTotal translatable keys found: ${totalKeys}`));

        // 对每种目标语言进行翻译
        for (let i = 0; i < targetLanguages.length; i++) {
            const lang = targetLanguages[i];
            const startTime = Date.now();
            console.log(chalk.yellow(`\n[${i + 1}/${targetLanguages.length}] Processing ${lang}...`));

            try {
                console.log(chalk.blue(`Starting translation to ${lang}...`));
                const translatedData = await translator.translateObject(inputData, lang);
                const outputPath = this.saveTranslation(outputDir, lang, translatedData);
                const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

                results[lang] = outputPath;
                console.log(chalk.green(`✓ ${lang} translation completed in ${timeTaken}s`));
            } catch (error) {
                console.error(chalk.red(`✗ Failed to translate to ${lang}:`, error));
            }

            // 如果不是最后一个语言，添加延迟以避免请求过快
            if (i < targetLanguages.length - 1) {
                const delay = 1000; // 1秒延迟
                console.log(chalk.gray(`Waiting ${delay}ms before next language...`));
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    }
}
