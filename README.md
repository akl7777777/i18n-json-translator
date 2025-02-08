# i18n-json-translator

A powerful tool for translating JSON files with nested Chinese values into multiple languages using AI (OpenAI GPT, Anthropic Claude, or Custom API provider).

[![npm version](https://badge.fury.io/js/i18n-json-translator.svg)](https://badge.fury.io/js/i18n-json-translator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🌐 Supports translation to multiple languages
- 🔄 Preserves JSON structure and keys
- 📝 Handles nested JSON objects
- 🤖 Uses AI for high-quality translations
- ⚙️ Flexible provider options (OpenAI/Claude/Custom API)
- 🛡️ Written in TypeScript with full type support
- 📁 File-based processing with batch translation support
- 🔌 Support for custom API endpoints with OpenAI-compatible format

## Installation

```bash
npm install i18n-json-translator
```

## Quick Start

### Using OpenAI or Claude

```typescript
import { Translator } from 'i18n-json-translator';

// Initialize with OpenAI
const translator = new Translator({
  provider: 'openai',
  openaiApiKey: 'your-openai-api-key'
});

// Or use Claude
const translator = new Translator({
  provider: 'claude',
  anthropicApiKey: 'your-anthropic-api-key'
});

// Sample JSON with Chinese text
const input = {
  title: "我的应用",
  description: "这是一个示例",
  settings: {
    theme: "深色模式"
  }
};

// Translate to English
const result = await translator.translateObject(input, 'en');
console.log(result);
```

### Using Custom API Provider

```typescript
import { Translator } from 'i18n-json-translator';

// Initialize with custom API (OpenAI-compatible format)
const translator = new Translator({
  provider: 'custom',
  customProvider: {
    apiUrl: 'https://your-api-endpoint/v1/chat/completions',
    apiKey: 'your-api-key',
    format: 'openai'
  },
  model: 'gpt-3.5-turbo' // Optional model specification
});

// Process translation
const result = await translator.translateObject(input, 'en');
```

### Parallel Processing

支持并行处理多语言翻译，可以显著提高翻译效率：

```typescript
import { FileProcessor } from 'i18n-json-translator/utils';

// 使用并行处理，maxWorkers 控制最大并行数
const results = await FileProcessor.processTranslationsParallel(
  'input.json',
  'output-directory',
  translator,
  ['en', 'ja', 'ko'],
  3  // maxWorkers: 最大并行数
);
```

也可以通过环境变量控制并行数：
```bash
# 在 .env 文件中设置
MAX_WORKERS=3
```

### Testing Custom API

1. 创建测试配置文件：
```bash
# 创建 .env 文件
cp .env.example .env

# 配置必要的环境变量
CUSTOM_API_URL=your-api-endpoint
CUSTOM_API_KEY=your-api-key
MAX_WORKERS=3           # 可选：控制并行处理数量
TARGET_LANGS=en,ja,ko  # 可选：指定目标语言
MODEL=your-model-name  # 可选：指定模型
```

2. 准备测试数据：
```bash
# 在 examples 目录下创建测试用的中文 JSON 文件
cp examples/test-input.json examples/zh-CN.json
```

3. 运行测试：
```bash
# 使用 npm 脚本运行测试
npm run test:custom

# 或直接运行测试文件
node --loader ts-node/esm examples/custom-test.ts
```

### Language Code Support

支持多种语言代码格式：

| 标准代码 | 别名  | 语言    |
|---------|-------|---------|
| ko      | kr    | 韩语    |
| ja      | jp    | 日语    |
| zh-CN   | cn    | 简体中文 |
| zh-TW   | tw    | 繁体中文 |

## Supported Languages

| Code | Language    | Native Name    |
|------|-------------|----------------|
| en   | English     | English        |
| es   | Spanish     | Español        |
| fr   | French      | Français       |
| de   | German      | Deutsch        |
| it   | Italian     | Italiano       |
| pt   | Portuguese  | Português      |
| ru   | Russian     | Русский        |
| ja   | Japanese    | 日本語         |
| ko   | Korean      | 한国어         |
| vi   | Vietnamese  | Tiếng Việt     |

## Configuration Options

```typescript
interface TranslationConfig {
  // OpenAI configuration
  openaiApiKey?: string;
  
  // Anthropic configuration
  anthropicApiKey?: string;
  
  // Custom API configuration
  customProvider?: {
    apiUrl: string;
    apiKey: string;
    format: 'openai';  // Currently supports OpenAI format
  };
  
  // Provider selection
  provider?: 'openai' | 'claude' | 'custom';
  
  // Model specification
  model?: string;
  
  // Source language (default: 'zh')
  sourceLanguage?: string;
}
```

## CLI Usage

```bash
# Install globally
npm install -g i18n-json-translator

# Using OpenAI
i18n-json-translator translate input.json --target en,ja,ko --provider openai

# Using Custom API
i18n-json-translator translate input.json \
  --target en,ja,ko \
  --provider custom \
  --custom-api-url https://your-api-endpoint/v1/chat/completions \
  --custom-api-key your-api-key

# Using environment variables
export CUSTOM_API_URL=https://your-api-endpoint/v1/chat/completions
export CUSTOM_API_KEY=your-api-key
i18n-json-translator translate input.json -t en,ja,ko -p custom

# Show help
i18n-json-translator --help
```

## Error Handling

The translator provides typed errors for better error handling:

```typescript
try {
  const result = await translator.translateObject(input, 'en');
} catch (error) {
  if (error.code === 'TRANSLATION_FAILED') {
    console.error('Translation failed:', error.message);
    console.error('Details:', error.details);
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Test custom API integration
npm run test:custom

# Build
npm run build

# Lint and format
npm run lint
npm run format
```

## Environment Variables

You can use environment variables for configuration:

```bash
# Create .env file
cp .env.example .env

# Configure your API keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
CUSTOM_API_URL=your-api-url
CUSTOM_API_KEY=your-api-key
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
