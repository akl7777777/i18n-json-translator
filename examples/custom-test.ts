import { Translator } from '../src/index.js';
import { FileProcessor } from '../src/utils/file-processor.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取 __dirname (ESM 兼容)
// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function testCustomTranslation() {
  // 1. 配置翻译器
  const translator = new Translator({
    provider: 'custom',
    customProvider: {
      apiUrl: process.env.CUSTOM_API_URL || 'https://kfcv50.link/v1/chat/completions',
      apiKey: process.env.CUSTOM_API_KEY || 'your-api-key-here',
      format: 'openai'
    },
    model: process.env.MODEL || 'gpt-4o-mini' // 从环境变量获取模型配置，默认使用 gpt-4o-mini
  });

  // 2. 设置输入输出路径
  const inputFile = join(projectRoot, 'examples', 'zh-CN.json');
  const outputDir = join(projectRoot, 'examples', 'translations');

  // 3. 定义目标语言
  const targetLanguages = process.env.TARGET_LANGS ?
    process.env.TARGET_LANGS.split(',') : ['en', 'ja', 'ko']; // 可以从环境变量配置目标语言

  try {
    // 4. 处理翻译
    console.log('Starting translation...');
    console.log('Input file:', inputFile);
    console.log('Output directory:', outputDir);
    console.log('Target languages:', targetLanguages.join(', '));
    console.log('Using model:', translator.getModel()); // 添加模型信息的输出

    // 使用并行处理方法，设置最大并行数为3（可以通过环境变量配置）
    const maxWorkers = Number(process.env.MAX_WORKERS) || 3;
    const results = await FileProcessor.processTranslationsParallel(
      inputFile,
      outputDir,
      translator,
      targetLanguages,
      maxWorkers
    );

    // 5. 打印结果
    console.log('\nTranslation completed!');
    console.log('\nOutput files:');
    for (const [lang, filePath] of Object.entries(results)) {
      console.log(`${lang}: ${filePath}`);
    }
  } catch (error) {
    console.error('Translation failed:', error);
    process.exit(1);
  }
}

// 运行测试
testCustomTranslation();
