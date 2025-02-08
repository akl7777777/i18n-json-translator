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
    requestTimeout?: number; // 单个请求超时时间(ms)
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
        batchDelay: 2000,
        requestTimeout: 30000 // 默认30秒超时
    };

    private static translationCache: Record<string, Record<string, string>> = {};
    private static progress: Record<string, number> = {};
    private static totalKeys = 0;
    private static processedLanguages: Set<string> = new Set();
    private static lastProgressUpdate: number | null = null;
    private static activeRequests = new Set<string>();

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
     * 仅在内部翻译时标准化语言代码
     */
    private static normalizeLanguageCode(code: string): string {
        const languageMap: Record<string, string> = {
            // 日韩语言
            'jp': 'ja',     // 日语
            'kr': 'ko',     // 韩语
            
            // 简体中文
            'cn': 'zh',     // 简体中文
            'zh-cn': 'zh',  // 简体中文（中国大陆）
            'chs': 'zh-Hans', // 简体中文（通用）
            
            // 繁体中文
            'tw': 'zh-TW',  // 繁体中文（台湾）
            'hk': 'zh-HK',  // 繁体中文（香港）
            'mo': 'zh-MO',  // 繁体中文（澳门）
            'cht': 'zh-Hant', // 繁体中文（通用）
            
            // 保持原有大小写
            'zh-CN': 'zh',
            'zh-TW': 'zh-TW',
            'zh-HK': 'zh-HK',
            'zh-MO': 'zh-MO',
            'zh-Hans': 'zh-Hans',
            'zh-Hant': 'zh-Hant'
        };

        // 如果是大写形式的语言代码，保持原样
        if (code === code.toUpperCase()) {
            return languageMap[code] || code;
        }
        
        // 其他情况转换为小写
        return languageMap[code.toLowerCase()] || code.toLowerCase();
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
        languageCode: string,  // 使用原始语言代码
        data: TranslationResult
    ): string {
        try {
            if (!fs.existsSync(outputDir)) {
                console.log(chalk.blue('Creating output directory:', outputDir));
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // 直接使用原始语言代码，不做标准化处理
            const outputPath = path.join(outputDir, `${languageCode}.json`);
            console.log(chalk.blue('\nSaving translation to:', outputPath));

            // 递归保持对象顺序
            const maintainObjectOrder = (obj: any): any => {
                if (typeof obj !== 'object' || obj === null) {
                    return obj;
                }

                const orderedObj: any = {};
                // 使用原始输入文件的键顺序
                Object.keys(obj).forEach(key => {
                    orderedObj[key] = typeof obj[key] === 'object' && obj[key] !== null
                        ? maintainObjectOrder(obj[key])
                        : obj[key];
                });
                return orderedObj;
            };

            const orderedData = maintainObjectOrder(data);
            fs.writeFileSync(
                outputPath,
                JSON.stringify(orderedData, null, 2),
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
     * 初始化进度
     */
    private static initializeProgress(inputData: Record<string, unknown>, languages: string[]): void {
        this.translationCache = {};
        this.progress = {};
        this.totalKeys = this.countTranslatableKeys(inputData);
        this.processedLanguages.clear();

        languages.forEach(lang => {
            this.progress[lang] = 0;
        });

        this.log(`总计需要翻译 ${this.totalKeys} 个键，目标语言: ${languages.join(', ')}`, 'info');
    }

    /**
     * 更新并显示进度
     */
    private static updateProgress(lang: string, completedKeys: number): void {
        if (this.processedLanguages.has(lang)) {
            return;
        }

        this.progress[lang] = completedKeys;
        const percentage = ((completedKeys / this.totalKeys) * 100).toFixed(1);

        // 限制进度日志的频率
        const now = Date.now();
        if (!this.lastProgressUpdate || now - this.lastProgressUpdate >= 1000) {
            this.log(`[${lang}] 进度: ${completedKeys}/${this.totalKeys} (${percentage}%)`, 'info');
            this.lastProgressUpdate = now;
        }
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

    private static updateActiveRequests(requestId: string, isStart: boolean, lang: string) {
        if (isStart) {
            this.activeRequests.add(requestId);
        } else {
            this.activeRequests.delete(requestId);
        }
        
        // 只显示活跃请求数量，不显示具体ID
        const activeCount = this.activeRequests.size;
        if (activeCount > 0) {
            this.log(`[${lang}] 当前活跃请求: ${activeCount}个`, 'info');
        }
    }

    private static async handleRequestTimeout<T>(
        promise: Promise<T>,
        timeout: number,
        errorMessage: string
    ): Promise<T> {
        const timeoutPromise = new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(errorMessage)), timeout);
        });
        return Promise.race([promise, timeoutPromise]);
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
        const requestId = `Request-${Math.random().toString(36).substr(2, 9)}`;
        this.updateActiveRequests(requestId, true, lang);
        
        try {
            this.log(`[${lang}] 尝试翻译文本: "${text}" (第 1/${options.maxRetries} 次)`, 'info');
            const translation = await this.handleRequestTimeout(
                translator.translateText(text, lang),
                options.requestTimeout,
                `请求 ${requestId} 超时`
            );
            
            if (!translation || typeof translation !== 'string') {
                throw new Error('翻译结果无效');
            }

            this.updateActiveRequests(requestId, false, lang);
            return translation;
        } catch (error) {
            this.updateActiveRequests(requestId, false, lang);
            throw error;
        }
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
        // 使用原始对象的结构创建结果对象
        const result: TranslationResult = {};
        let completedKeys = 0;
        
        // 先收集所有需要翻译的文本及其路径
        const translationTasks: Array<{
            path: string[];
            value: string;
        }> = [];
        
        const collectTasks = (obj: Record<string, unknown>, currentPath: string[] = []) => {
            for (const [key, value] of Object.entries(obj)) {
                const path = [...currentPath, key];
                if (typeof value === 'string') {
                    translationTasks.push({ path, value });
                } else if (value && typeof value === 'object') {
                    collectTasks(value as Record<string, unknown>, path);
                }
            }
        };
        
        collectTasks(inputData);
        
        // 创建队列来管理翻译任务
        const queue = [...translationTasks];
        const inProgress = new Set<Promise<any>>();
        const translations = new Map<string, string>();

        while (queue.length > 0 || inProgress.size > 0) {
            // 检查长时间未完成的请求
            const stuckRequests = Array.from(this.activeRequests).filter(id => {
                const requestTime = id.split('-')[1];
                return Date.now() - parseInt(requestTime) > options.requestTimeout;
            });

            if (stuckRequests.length > 0) {
                this.log(`[${lang}] 发现 ${stuckRequests.length} 个超时请求，已强制结束`, 'warning');
                stuckRequests.forEach(id => this.activeRequests.delete(id));
            }

            // 填充进行中的任务
            while (queue.length > 0 && inProgress.size < options.maxWorkers) {
                const task = queue.shift()!;
                
                const promise = (async () => {
                    try {
                        const cached = this.getCachedTranslation(task.value, lang);
                        let translation: string;
                        
                        if (cached) {
                            this.log(`[${lang}] 使用缓存: "${task.value}" => "${cached}"`, 'info');
                            translation = cached;
                        } else {
                            translation = await this.translateText(translator, task.value, lang, options);
                            this.log(`[${lang}] 新翻译: "${task.value}" => "${translation}"`, 'success');
                            this.cacheTranslation(task.value, lang, translation);
                        }
                        
                        translations.set(task.path.join('.'), translation);
                        completedKeys++;
                        this.updateProgress(lang, completedKeys);
                        
                    } catch (error) {
                        this.log(`[${lang}] 翻译失败: ${error}`, 'error');
                        translations.set(task.path.join('.'), `[TRANSLATION_FAILED] ${task.value}`);
                    }
                })();
                
                inProgress.add(promise);
                promise.finally(() => {
                    inProgress.delete(promise);
                });
            }
            
            if (inProgress.size > 0) {
                await Promise.race(Array.from(inProgress));
            }
        }

        // 根据原始结构重建翻译后的对象
        const rebuildObject = (obj: Record<string, unknown>, currentPath: string[] = []): TranslationResult => {
            const result: TranslationResult = {};
            
            for (const [key, value] of Object.entries(obj)) {
                const path = [...currentPath, key];
                if (typeof value === 'string') {
                    result[key] = translations.get(path.join('.')) || `[MISSING] ${value}`;
                } else if (value && typeof value === 'object') {
                    result[key] = rebuildObject(value as Record<string, unknown>, path);
                } else {
                    result[key] = String(value);  // 确保非对象值转换为字符串
                }
            }
            
            return result;
        };

        return rebuildObject(inputData);
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

        // 初始化日志和进度
        this.initializeLogger(outputDir);
        this.initializeProgress(inputData, targetLanguages);

        const results: Record<string, string> = {};
        
        // 保存原始语言代码，但在翻译时使用标准化的代码
        for (const originalLang of targetLanguages) {
            try {
                const normalizedLang = this.normalizeLanguageCode(originalLang);
                this.log(`\n开始处理语言: ${originalLang}`, 'info');
                const translatedData = await this.translateLanguage(
                    translator,
                    inputData,
                    normalizedLang,  // 使用标准化的语言代码进行翻译
                    finalOptions
                );

                // 使用原始语言代码保存文件
                const outputPath = this.saveTranslation(outputDir, originalLang, translatedData);
                this.log(`✓ [${originalLang}] 翻译完成并保存到: ${outputPath}`, 'success');
                results[originalLang] = outputPath;
                this.processedLanguages.add(originalLang);

                // 输出当前进度统计
                const completedCount = this.processedLanguages.size;
                const totalCount = targetLanguages.length;
                const percentage = ((completedCount / totalCount) * 100).toFixed(1);
                this.log(`\n总体进度: ${completedCount}/${totalCount} 种语言 (${percentage}%)`, 'info');
                this.log(`缓存命中统计: ${Object.keys(this.translationCache).length} 个语言`, 'info');

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.log(`✗ [${originalLang}] 翻译失败: ${errorMessage}`, 'error');
                results[originalLang] = `ERROR: ${errorMessage}`;
            }
        }

        // 输出最终统计
        this.log('\n翻译任务完成！', 'success');
        this.log(`成功翻译语言: ${Object.keys(results).filter(lang => !results[lang].startsWith('ERROR:')).join(', ')}`, 'success');
        this.log(`失败语言: ${Object.keys(results).filter(lang => results[lang].startsWith('ERROR:')).join(', ') || '无'}`, 'warning');
        this.log(`缓存命中统计: ${Object.keys(this.translationCache).length} 个语言`, 'info');

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
