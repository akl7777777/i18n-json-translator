# i18n-json-translator

A powerful tool for translating JSON files with nested Chinese values into multiple languages using AI (OpenAI GPT or Anthropic Claude).

[![npm version](https://badge.fury.io/js/i18n-json-translator.svg)](https://badge.fury.io/js/i18n-json-translator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🌐 Supports translation to multiple languages
- 🔄 Preserves JSON structure and keys
- 📝 Handles nested JSON objects
- 🤖 Uses AI for high-quality translations
- ⚙️ Configurable translation provider (OpenAI/Claude)
- 🛡️ Written in TypeScript with full type support

## Installation

```bash
npm install i18n-json-translator
```

## Quick Start

```typescript
import { Translator } from 'i18n-json-translator';

// Initialize the translator
const translator = new Translator({
  openaiApiKey: 'your-openai-api-key',
  // or use Claude
  // anthropicApiKey: 'your-anthropic-api-key',
  // provider: 'claude'
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
| ko   | Korean      | 한국어         |
| vi   | Vietnamese  | Tiếng Việt     |

## Configuration Options

```typescript
interface TranslationConfig {
  // OpenAI API key (required if using OpenAI)
  openaiApiKey?: string;
  
  // Anthropic API key (required if using Claude)
  anthropicApiKey?: string;
  
  // Translation provider ('openai' or 'claude')
  provider?: 'openai' | 'claude';
  
  // Model to use (default: 'gpt-4' for OpenAI, 'claude-3-sonnet' for Claude)
  model?: string;
  
  // Source language (default: 'zh')
  sourceLanguage?: string;
}
```

## CLI Usage

```bash
# Install globally
npm install -g i18n-json-translator

# Translate a file
i18n-json-translator translate input.json --target en,ja,ko

# Show help
i18n-json-translator --help
```

## Error Handling

The translator throws typed errors that you can handle in your application:

```typescript
try {
  const result = await translator.translateObject(input, 'en');
} catch (error) {
  if (error.code === 'TRANSLATION_FAILED') {
    console.error('Translation failed:', error.message);
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
