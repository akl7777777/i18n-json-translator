import { Translator } from '../src';
import { FileProcessor } from '../src/utils/file-processor';
import * as path from 'path';

async function testCustomTranslation() {
  // 1. 配置翻译器
  const translator = new Translator({
    provider: 'custom',
    customProvider: {
      apiUrl: 'https://kfcv50.link/v1/chat/completions',
      apiKey: 'your-api-key-here',
      format: 'openai'
    },
    model: 'gpt-3.5-turbo' // 或其他模型
  });

  // 2. 设置输入输出路径
  const inputFile = path.join(__dirname, 'test-input.json');
  const outputDir = path.join(__dirname, 'translations');

  // 3. 定义目标语言
  const targetLanguages = ['en', 'ja', 'ko'];

  try {
    // 4. 处理翻译
    console.log('Starting translation...');
    const results = await FileProcessor.processTranslations(
      inputFile,
      outputDir,
      translator,
      targetLanguages
    );

    // 5. 打印结果
    console.log('\nTranslation completed!');
    console.log('\nOutput files:');
    for (const [lang, filePath] of Object.entries(results)) {
      console.log(`${lang}: ${filePath}`);
    }
  } catch (error) {
    console.error('Translation failed:', error);
  }
}

// 运行测试
testCustomTranslation();
