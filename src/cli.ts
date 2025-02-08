#!/usr/bin/env node

import { program } from 'commander';
import { resolve } from 'path';
import { Translator } from './translator';
import { FileProcessor } from './utils/file-processor';
import { TranslationConfig, TranslationOptions } from './types/config';

const version = '1.0.0';

program
    .name('i18n-json-translator')
    .description('Translate JSON files with nested Chinese values into multiple languages')
    .version(version);

program
    .command('translate <file>')
    .description('Translate a JSON file to specified languages')
    .requiredOption('-t, --target <languages>', 'Target languages (comma-separated)')
    .option('-p, --provider <provider>', 'Translation provider (openai/claude/custom)', 'openai')
    .option('-m, --model <model>', 'Model to use for translation')
    .option('-o, --output <dir>', 'Output directory', './translations')
    .option('--custom-api-url <url>', 'Custom API URL for custom provider')
    .option('--custom-api-key <key>', 'Custom API key for custom provider')
    .option('--max-workers <number>', '最大并行工作线程数', '3')
    .option('--batch-size <number>', '每批处理的键数量', '50')
    .option('--batch-delay <number>', '批次间延迟(ms)', '2000')
    .option('--max-retries <number>', '最大重试次数', '3')
    .option('--retry-delay <number>', '重试延迟(ms)', '2000')
    .option('--retry-multiplier <number>', '重试延迟倍数', '1.5')
    .action(async (file: string, options) => {
        try {
            // 构建翻译器配置
            const config: TranslationConfig = {
                provider: options.provider as 'openai' | 'claude' | 'custom',
                model: options.model
            };

            // 根据提供者设置 API 密钥
            if (options.provider === 'openai') {
                config.openaiApiKey = process.env.OPENAI_API_KEY;
            } else if (options.provider === 'claude') {
                config.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
            } else if (options.provider === 'custom') {
                config.customProvider = {
                    apiUrl: options.customApiUrl || process.env.CUSTOM_API_URL || '',
                    apiKey: options.customApiKey || process.env.CUSTOM_API_KEY || '',
                    format: 'openai'
                };
            }

            const translator = new Translator(config);
            const inputPath = resolve(file);
            const outputDir = resolve(options.output);
            const languages = options.target.split(',');

            // 构建翻译选项
            const translationOptions: TranslationOptions = {
                maxWorkers: Number(options.maxWorkers),
                maxRetries: Number(options.maxRetries),
                retryDelay: Number(options.retryDelay),
                retryMultiplier: Number(options.retryMultiplier),
                batchDelay: Number(options.batchDelay)
            };

            console.log('Starting translation...');
            console.log(`Input file: ${inputPath}`);
            console.log(`Output directory: ${outputDir}`);
            console.log(`Target languages: ${languages.join(', ')}`);

            // 处理翻译
            const results = await FileProcessor.processTranslationsParallel(
                inputPath,
                outputDir,
                translator,
                languages,
                translationOptions
            );

            console.log('\nTranslation completed!');
            console.log('\nOutput files:');
            for (const [lang, path] of Object.entries(results)) {
                console.log(`${lang}: ${path}`);
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program.parse();
