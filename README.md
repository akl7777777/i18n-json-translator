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

### File-based Processing

```typescript
import { FileProcessor } from 'i18n-json-translator/utils';

// Process an entire JSON file
const results = await FileProcessor.processTranslations(
  'input.json',
  'output-directory',
  translator,
  ['en', 'ja', 'ko']
);
```

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
