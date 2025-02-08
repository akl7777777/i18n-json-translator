import * as fs from 'fs';
import * as path from 'path';
import { TranslationResult } from '../types/config';
import chalk from 'chalk';

export interface RetryOptions {
  maxRetries?: number;    // 最大重试次数
  retryDelay?: number;    // 初始重试延迟(ms)
  retryMultiplier?: number; // 重试延迟倍数
}

export interface TranslationOptions extends RetryOptions {
  maxWorkers?: number;    // 最大并行工作线程数
  batchDelay?: number;    // 批次间延迟(ms)
}

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

    private static logFilePath: string;

    // 默认配置
    private static readonly DEFAULT_OPTIONS: Required<TranslationOptions> = {
        maxWorkers: 3,
        maxRetries: 3,
        retryDelay: 2000,
        retryMultiplier: 1.5,
        batchDelay: 2000
    };

    /**
     * 初始化日志文件
     */
    private static initializeLogger(outputDir: string): void {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFilePath = path.join(outputDir, `translation-${timestamp}.log`);
        
        // 创建日志文件并写入头部信息
        fs.writeFileSync(
            this.logFilePath,
            `Translation Log - Started at ${new Date().toLocaleString()}\n` +
            '='.repeat(80) + '\n\n',
            'utf8'
        );
    }

    /**
     * 写入日志
     */
    private static log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
        
        // 控制台输出
        switch (type) {
            case 'success':
                console.log(chalk.green(message));
                break;
            case 'error':
                console.error(chalk.red(message));
                break;
            case 'warning':
                console.warn(chalk.yellow(message));
                break;
            default:
                console.log(chalk.blue(message));
        }

        // 写入日志文件
        fs.appendFileSync(this.logFilePath, logMessage);
    }

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

    static async processTranslationsParallel(
        inputFile: string,
        outputDir: string,
        translator: any,
        targetLanguages: string[],
        options?: TranslationOptions
    ): Promise<Record<string, string>> {
        // 合并默认选项和用户配置
        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
        
        // 初始化日志
        this.initializeLogger(outputDir);
        this.log(`Starting translation process`, 'info');
        this.log(`Input file: ${inputFile}`, 'info');
        this.log(`Output directory: ${outputDir}`, 'info');
        this.log(`Target languages: ${targetLanguages.join(', ')}`, 'info');
        this.log(`Configuration:`, 'info');
        this.log(`  Max workers: ${finalOptions.maxWorkers}`, 'info');
        this.log(`  Max retries: ${finalOptions.maxRetries}`, 'info');
        this.log(`  Retry delay: ${finalOptions.retryDelay}ms`, 'info');
        this.log(`  Retry multiplier: ${finalOptions.retryMultiplier}x`, 'info');
        this.log(`  Batch delay: ${finalOptions.batchDelay}ms`, 'info');
        this.log('=' .repeat(80), 'info');

        // 创建输出目录
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            this.log(`Created output directory: ${outputDir}`, 'info');
        }

        // 读取输入文件
        const inputData = this.readJsonFile(inputFile);
        const totalKeys = this.countTranslatableKeys(inputData);
        const results: Record<string, string> = {};

        this.log(`Found ${totalKeys} translatable keys`, 'info');

        // 将语言分组前标准化语言代码
        const normalizedLanguages = targetLanguages.map(lang => this.normalizeLanguageCode(lang));

        // 创建所有语言的翻译任务
        const translationTasks = normalizedLanguages.map(lang => ({
            lang,
            promise: new Promise<[string, string]>(async (resolve) => {
                try {
                    const startTime = Date.now();
                    this.log(`Starting translation for ${lang}...`, 'info');
                    
                    const translatedData = await this.translateWithRetry(
                        translator,
                        inputData,
                        lang,
                        finalOptions
                    );

                    if (!translatedData) {
                        throw new Error(`Empty translation result for ${lang}`);
                    }

                    const outputPath = this.saveTranslation(outputDir, lang, translatedData);
                    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

                    this.log(`✓ ${lang} translation completed in ${timeTaken}s`, 'success');
                    resolve([lang, outputPath]);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.log(`✗ ${lang} translation failed: ${errorMessage}`, 'error');
                    resolve([lang, `ERROR: ${errorMessage}`]);
                }
            })
        }));

        // 分批执行翻译任务
        for (let i = 0; i < translationTasks.length; i += finalOptions.maxWorkers) {
            const batch = translationTasks.slice(i, i + finalOptions.maxWorkers);
            this.log(`Processing batch ${Math.floor(i / finalOptions.maxWorkers) + 1}/${Math.ceil(translationTasks.length / finalOptions.maxWorkers)}`, 'info');
            
            const batchResults = await Promise.all(batch.map(task => task.promise));
            
            // 处理批次结果
            batchResults.forEach(([lang, path]) => {
                if (path.startsWith('ERROR:')) {
                    this.log(`Failed to process ${lang}: ${path.substring(7)}`, 'error');
                } else {
                    results[lang] = path;
                    this.log(`Successfully saved ${lang} translation to ${path}`, 'success');
                }
            });

            // 如果还有下一批，添加延迟
            if (i + finalOptions.maxWorkers < translationTasks.length) {
                this.log(`Waiting ${finalOptions.batchDelay}ms before next batch...`, 'info');
                await new Promise(resolve => setTimeout(resolve, finalOptions.batchDelay));
            }
        }

        // 输出汇总信息
        const successCount = Object.keys(results).length;
        const failCount = targetLanguages.length - successCount;
        
        this.log('\nTranslation Summary:', 'info');
        this.log(`✓ Successful: ${successCount} languages`, 'success');
        if (failCount > 0) {
            this.log(`✗ Failed: ${failCount} languages`, 'error');
            this.log(`Check translation_errors.json for details`, 'warning');
        }
        this.log(`Log file: ${this.logFilePath}`, 'info');
        this.log('=' .repeat(80), 'info');

        return results;
    }

    private static async translateWithRetry(
        translator: any,
        inputData: Record<string, unknown>,
        lang: string,
        options: Required<TranslationOptions>
    ): Promise<TranslationResult> {
        let currentDelay = options.retryDelay;

        for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
            try {
                this.log(`[${lang}] 尝试翻译 (第 ${attempt}/${options.maxRetries} 次)`, 'info');
                const translatedData = await translator.translateObject(inputData, lang);
                
                if (!translatedData || typeof translatedData !== 'object') {
                    throw new Error('翻译结果无效');
                }

                return translatedData;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '未知错误';
                this.log(`[${lang}] 第 ${attempt} 次尝试失败: ${errorMessage}`, 'error');
                
                if (attempt < options.maxRetries) {
                    this.log(`[${lang}] 等待 ${currentDelay}ms 后重试...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, currentDelay));
                    currentDelay *= options.retryMultiplier;
                } else {
                    this.log(`[${lang}] 已达到最大重试次数 (${options.maxRetries}次)`, 'error');
                    throw new Error(`翻译失败 (${errorMessage})`);
                }
            }
        }
        throw new Error('翻译失败');
    }

    /**
     * 保存错误日志
     */
    private static saveErrorLog(lang: string, failedKeys: string[]): void {
        const errorLogPath = path.join(process.cwd(), 'translation_errors.json');
        let errorLog: Record<string, any> = {};
        
        if (fs.existsSync(errorLogPath)) {
            errorLog = JSON.parse(fs.readFileSync(errorLogPath, 'utf8'));
        }

        errorLog[lang] = {
            timestamp: new Date().toISOString(),
            failedKeys: failedKeys,
            status: 'partial_translation'
        };

        fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
        console.log(chalk.yellow(`[${lang}] ${failedKeys.length} 个key翻译失败，详情已记录到错误日志`));
    }
}
