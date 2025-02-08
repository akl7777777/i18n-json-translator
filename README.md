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
- 🚀 Concurrent translation with configurable workers
- ⏱️ Timeout handling and retry mechanism
- 💾 Translation caching for efficiency

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

### Basic Options

```typescript
interface TranslationOptions {
    maxWorkers?: number;      // 最大并行工作线程数，默认 5
    maxRetries?: number;      // 失败重试次数，默认 3
    retryDelay?: number;      // 重试延迟时间(ms)，默认 1000
    retryMultiplier?: number; // 重试延迟倍数，默认 1.5
    batchDelay?: number;      // 批次间延迟(ms)，默认 200
    requestTimeout?: number;  // 单个请求超时时间(ms)，默认 30000
}
```

### Advanced Usage

```typescript
import { Translator, FileProcessor } from 'i18n-json-translator';

// 初始化翻译器
const translator = new Translator({
    provider: 'custom',
    customProvider: {
        apiUrl: 'your-api-endpoint',
        apiKey: 'your-api-key',
        format: 'openai'
    },
    model: 'your-model-name'
});

// 配置翻译选项
const options = {
    maxWorkers: 20,           // 并行处理20个请求
    maxRetries: 5,            // 失败重试5次
    retryDelay: 2000,         // 初始重试延迟2秒
    retryMultiplier: 1.5,     // 每次重试延迟增加50%
    batchDelay: 500,          // 批次间延迟500ms
    requestTimeout: 30000     // 30秒超时
};

// 处理翻译
const results = await FileProcessor.processTranslationsParallel(
    'input.json',
    'output-directory',
    translator,
    ['en', 'ja', 'ko'],
    options
);
```

### Environment Variables

支持通过环境变量配置：

```bash
# API配置
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
CUSTOM_API_URL=your-api-url
CUSTOM_API_KEY=your-api-key

# 性能配置
MAX_WORKERS=20              # 最大并行数
REQUEST_TIMEOUT=30000       # 请求超时时间(ms)
BATCH_DELAY=500            # 批次间延迟(ms)

# 重试配置
MAX_RETRIES=5              # 最大重试次数
RETRY_DELAY=2000          # 重试延迟(ms)
RETRY_MULTIPLIER=1.5      # 重试延迟倍数

# 其他配置
MODEL=your-model-name     # 模型名称
TARGET_LANGS=en,ja,ko    # 目标语言
```

### Error Handling

提供了详细的错误处理机制：

```typescript
try {
    const results = await FileProcessor.processTranslationsParallel(
        'input.json',
        'output-directory',
        translator,
        ['en', 'ja', 'ko'],
        options
    );
} catch (error) {
    if (error instanceof TranslationError) {
        console.error('翻译错误:', error.message);
        console.error('失败的语言:', error.language);
        console.error('详细信息:', error.details);
    } else if (error instanceof TimeoutError) {
        console.error('请求超时:', error.message);
        console.error('超时请求ID:', error.requestId);
    }
}
```

### Performance Tips

- `maxWorkers`: 建议根据API限制和系统资源设置，通常5-20之间
- `requestTimeout`: 设置合理的超时时间，避免请求卡住
- `batchDelay`: 可以根据API限制调整，避免请求过于密集
- `retryDelay`: 失败重试时间建议从2秒开始，配合倍数增长

### Output Structure

输出文件会严格保持输入文件的结构和顺序：

```json
{
    "message": {
        "welcome": "Welcome",
        "settings": {
            "theme": "Theme",
            "language": "Language"
        }
    }
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
