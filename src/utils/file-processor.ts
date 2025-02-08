import * as fs from 'fs';
import * as path from 'path';
import { TranslationResult } from '../types/config';
import chalk from 'chalk';

export interface BatchProcessingOptions {
  maxWorkers?: number;      // 最大并行工作线程数
  batchSize?: number;       // 每批处理的键数量
  batchDelay?: number;      // 批次间延迟(ms)
  retryCount?: number;      // 失败重试次数
  retryDelay?: number;      // 重试延迟(ms)
}

export class FileProcessor {
    // 语言代码映射表
    private static readonly LANGUAGE_CODE_ALIASES: Record<string, string> = {
      'kr': 'ko',    // 韩语
      'cn': 'zh-CN', // 简体中文
      'tw': 'zh-TW', // 繁体中文
      'jp': 'ja'     // 日语
    };

    /**
     * 标准化语言代码
     */
    private static normalizeLanguageCode(code: string): string {
      return this.LANGUAGE_CODE_ALIASES[code.toLowerCase()] || code;
    }

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
            if (!fs.existsSync(outputDir)) {
                console.log(chalk.blue('Creating output directory:', outputDir));
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const outputPath = path.join(outputDir, `${languageCode}.json`);
            console.log(chalk.blue('\nSaving translation to:', outputPath));

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

    private static async translateWithRetry(
        translator: any,
        inputData: Record<string, unknown>,
        lang: string,
        retryCount = 3,
        retryDelay = 2000
    ): Promise<TranslationResult | null> {
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                console.log(chalk.blue(`[${lang}] 尝试翻译 (第 ${attempt}/${retryCount} 次)`));
                const translatedData = await translator.translateObject(inputData, lang);
                
                // 验证翻译结果
                if (!translatedData || typeof translatedData !== 'object') {
                    throw new Error('翻译结果无效');
                }

                return translatedData;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '未知错误';
                console.error(chalk.yellow(`[${lang}] 第 ${attempt} 次尝试失败: ${errorMessage}`));
                
                // 如果还有重试机会，等待后继续
                if (attempt < retryCount) {
                    console.log(chalk.gray(`[${lang}] 等待 ${retryDelay}ms 后重试...`));
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    // 每次重试增加延迟时间
                    retryDelay *= 1.5;
                } else {
                    console.error(chalk.red(`[${lang}] 已达到最大重试次数 (${retryCount}次)`));
                    throw new Error(`翻译失败 (${errorMessage})`);
                }
            }
        }
        return null;
    }

    static async processTranslationsParallel(
      inputFile: string,
      outputDir: string,
      translator: any,
      targetLanguages: string[],
      maxWorkers = 3
    ): Promise<Record<string, string>> {
        // 创建输出目录
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 读取输入文件
        const inputData = this.readJsonFile(inputFile);
        const totalKeys = this.countTranslatableKeys(inputData);
        const results: Record<string, string> = {};

        console.log(chalk.blue(`\n总共找到可翻译的键: ${totalKeys}`));

        // 将语言分组前标准化语言代码
        const normalizedLanguages = targetLanguages.map(lang => this.normalizeLanguageCode(lang));

        // 创建所有语言的翻译任务
        const translationTasks = normalizedLanguages.map(lang => ({
            lang,
            promise: new Promise<[string, string]>(async (resolve) => {
                try {
                    const startTime = Date.now();
                    console.log(chalk.yellow(`\n开始处理 ${lang}...`));
                    
                    const translatedData = await this.translateWithRetry(
                        translator,
                        inputData,
                        lang,
                        3,
                        2000
                    );

                    if (!translatedData) {
                        throw new Error(`翻译结果为空: ${lang}`);
                    }

                    const outputPath = this.saveTranslation(outputDir, lang, translatedData);
                    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

                    console.log(chalk.green(`✓ ${lang} 翻译完成，耗时 ${timeTaken}s`));
                    resolve([lang, outputPath]);
                } catch (error) {
                    console.error(chalk.red(`✗ ${lang} 翻译失败:`, error));
                    resolve([lang, `ERROR: ${error.message}`]);
                }
            })
        }));

        // 分批执行翻译任务
        for (let i = 0; i < translationTasks.length; i += maxWorkers) {
            const batch = translationTasks.slice(i, i + maxWorkers);
            const batchResults = await Promise.all(batch.map(task => task.promise));
            
            // 处理批次结果
            batchResults.forEach(([lang, path]) => {
                if (!path.startsWith('ERROR:')) {
                    results[lang] = path;
                }
            });

            // 如果还有下一批，添加延迟
            if (i + maxWorkers < translationTasks.length) {
                const delay = 2000;
                console.log(chalk.gray(`等待 ${delay}ms 后处理下一批...`));
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    }
}
