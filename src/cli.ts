#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Translator } from './translator';
import { TranslationConfig } from './types/config';
// 使用 require 导入 package.json
const { version } = require('../package.json') as { version: string };

program
    .name('i18n-json-translator')
    .description('Translate JSON files with nested Chinese values into multiple languages')
    .version(version);

program
    .command('translate <file>')
    .description('Translate a JSON file to specified languages')
    .requiredOption('-t, --target <languages>', 'Target languages (comma-separated)')
    .option('-p, --provider <provider>', 'Translation provider (openai/claude)', 'openai')
    .option('-m, --model <model>', 'Model to use for translation')
    .option('-o, --output <dir>', 'Output directory', '.')
    .action(async (file: string, options) => {
        try {
            const config: TranslationConfig = {
                openaiApiKey: process.env.OPENAI_API_KEY,
                anthropicApiKey: process.env.ANTHROPIC_API_KEY,
                provider: options.provider as 'openai' | 'claude',
                model: options.model
            };

            const translator = new Translator(config);
            const inputPath = resolve(file);
            const inputJson = JSON.parse(readFileSync(inputPath, 'utf8'));
            const languages = options.target.split(',');
            const outputDir = resolve(options.output);

            console.log('Starting translation...');

            for (const lang of languages) {
                try {
                    console.log(`Translating to ${lang}...`);
                    const result = await translator.translateObject(inputJson, lang);
                    const outputPath = `${outputDir}/${file.replace(/\.json$/, '')}_${lang}.json`;

                    writeFileSync(
                        outputPath,
                        JSON.stringify(result, null, 2),
                        'utf8'
                    );

                    console.log(`✓ Saved translation to: ${outputPath}`);
                } catch (error) {
                    console.error(`✗ Failed to translate to ${lang}:`, error.message);
                }
            }

            console.log('Translation completed!');
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    });

program.parse();
