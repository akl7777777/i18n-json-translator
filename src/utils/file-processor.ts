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

    private static translationCache: Record<string, Record<string, string>> = {};
    private static progress: Record<string, number> = {};
    private static totalKeys = 0;

    /**
     * 初始化日志文件
     */
    private static initializeLogger(outputDir: string): void {
        try {
            // 确保输出目录存在
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            this.logFilePath = path.join(outputDir, `translation-${timestamp}.log`);
            
            // 创建日志文件并写入头部信息
            fs.writeFileSync(
                this.logFilePath,
                `Translation Log - Started at ${new Date().toLocaleString()}\n` +
                '='.repeat(80) + '\n\n',
                'utf8'
            );

            this.log(`日志文件已创建: ${this.logFilePath}`, 'info');
        } catch (error) {
            console.error(chalk.red('Failed to initialize logger:', error));
            // 如果无法创建日志文件，至少确保不会崩溃
            this.logFilePath = '';
        }
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

        // 只有在logFilePath存在时才写入文件
        if (this.logFilePath) {
            try {
                fs.appendFileSync(this.logFilePath, logMessage);
            } catch (error) {
                console.error(chalk.red('Failed to write to log file:', error));
            }
        }
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

    /**
     * 初始化缓存和进度
     */
    private static initializeProgress(inputData: Record<string, unknown>, languages: string[]): void {
        this.translationCache = {};
        this.progress = {};
        this.totalKeys = this.countTranslatableKeys(inputData);
        
        languages.forEach(lang => {
            this.progress[lang] = 0;
        });

        this.log(`总计需要翻译 ${this.totalKeys} 个键`, 'info');
    }

    /**
     * 更新并显示进度
     */
    private static updateProgress(lang: string, completedKeys: number): void {
        this.progress[lang] = completedKeys;
        const percentage = ((completedKeys / this.totalKeys) * 100).toFixed(1);
        this.log(`[${lang}] 进度: ${completedKeys}/${this.totalKeys} (${percentage}%)`, 'info');
    }

    /**
     * 检查缓存中是否存在翻译
     */
    private static getCachedTranslation(text: string, lang: string): string | null {
        return this.translationCache[lang]?.[text] || null;
    }

    /**
     * 保存翻译到缓存
     */
    private static cacheTranslation(text: string, lang: string, translation: string): void {
        if (!this.translationCache[lang]) {
            this.translationCache[lang] = {};
        }
        this.translationCache[lang][text] = translation;
    }

    /**
     * 翻译单个文本
     */
    private static async translateText(
        translator: any,
        text: string,
        lang: string,
        options: Required<TranslationOptions>
    ): Promise<string> {
        // 检查缓存
        const cached = this.getCachedTranslation(text, lang);
        if (cached) {
            this.log(`[${lang}] 使用缓存翻译: "${text}" => "${cached}"`, 'info');
            return cached;
        }

        // 翻译并缓存
        const translation = await this.translateWithRetry(translator, text, lang, options);
        this.cacheTranslation(text, lang, translation);
        this.log(`[${lang}] 新翻译: "${text}" => "${translation}"`, 'success');
        return translation;
    }

    /**
     * 按语言翻译所有内容
     */
    private static async translateLanguage(
        translator: any,
        inputData: Record<string, unknown>,
        lang: string,
        options: Required<TranslationOptions>
    ): Promise<TranslationResult> {
        const result: TranslationResult = {};
        let completedKeys = 0;
        const entries = Object.entries(inputData);
        
        for (let i = 0; i < entries.length; i++) {
            const [key, value] = entries[i];
            
            if (typeof value === 'string') {
                result[key] = await this.translateText(translator, value, lang, options);
                completedKeys++;
                this.updateProgress(lang, completedKeys);
                
                if (i < entries.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } else if (value && typeof value === 'object') {
                // 递归处理嵌套对象，确保类型正确
                result[key] = await this.translateLanguage(
                    translator,
                    value as Record<string, unknown>,
                    lang,
                    options
                );
            } else if (value === null || value === undefined) {
                // 处理空值
                result[key] = '';
            } else {
                // 其他类型转换为字符串
                result[key] = String(value);
            }
        }

        return result as TranslationResult; // 确保返回类型正确
    }

    static async processTranslationsParallel(
        inputFile: string,
        outputDir: string,
        translator: any,
        targetLanguages: string[],
        options?: TranslationOptions
    ): Promise<Record<string, string>> {
        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
        const inputData = this.readJsonFile(inputFile);
        
        // 初始化进度和缓存
        this.initializeProgress(inputData, targetLanguages);
        
        // 一次处理一个完整的语言文件
        const results: Record<string, string> = {};
        const normalizedLanguages = targetLanguages.map(lang => this.normalizeLanguageCode(lang));
        
        // 创建所有语言的翻译任务
        const translationPromises = normalizedLanguages.map(async lang => {
            try {
                this.log(`开始翻译 ${lang}...`, 'info');
                
                const translatedData = await this.translateLanguage(
                    translator,
                    inputData,
                    lang,
                    finalOptions
                );

                // 这里 translatedData 现在是 TranslationResult 类型
                const outputPath = this.saveTranslation(outputDir, lang, translatedData);
                this.log(`✓ ${lang} 翻译完成并保存`, 'success');
                
                return [lang, outputPath];
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.log(`✗ ${lang} 翻译失败: ${errorMessage}`, 'error');
                return [lang, `ERROR: ${errorMessage}`];
            }
        });

        // 使用 Promise.all 并行处理所有语言
        const allResults = await Promise.all(translationPromises);
        
        // 处理结果
        allResults.forEach(([lang, path]) => {
            if (!path.startsWith('ERROR:')) {
                results[lang] = path;
            }
        });

        return results;
    }

    private static async translateWithRetry(
        translator: any,
        text: string,
        lang: string,
        options: Required<TranslationOptions>
    ): Promise<string> {
        let currentDelay = options.retryDelay;

        for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
            try {
                this.log(`[${lang}] 尝试翻译文本: "${text}" (第 ${attempt}/${options.maxRetries} 次)`, 'info');
                const translation = await translator.translateText(text, lang);
                
                if (!translation || typeof translation !== 'string') {
                    throw new Error('翻译结果无效');
                }

                return translation;
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
