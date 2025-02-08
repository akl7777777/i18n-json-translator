import { Translator } from '../src/translator';
import { TranslationConfig } from '../src/types/config';

jest.mock('openai');
jest.mock('@anthropic-ai/sdk');

describe('Translator', () => {
    let config: TranslationConfig;

    beforeEach(() => {
        config = {
            openaiApiKey: 'test-key',
            provider: 'openai',
        };
    });

    describe('constructor', () => {
        it('should create instance with default values', () => {
            const translator = new Translator(config);
            expect(translator).toBeInstanceOf(Translator);
        });

        it('should throw error when no API key provided', () => {
            expect(() => new Translator({})).toThrow();
        });
    });

    describe('translateObject', () => {
        it('should translate Chinese text in object', async () => {
            const translator = new Translator(config);
            const input = {
                title: '你好',
                description: 'Hello',
                nested: {
                    text: '世界'
                }
            };

            const result = await translator.translateObject(input, 'en');

            expect(result).toHaveProperty('title');
            expect(result).toHaveProperty('description', 'Hello');
            expect(result.nested).toHaveProperty('text');
        });

        it('should handle empty objects', async () => {
            const translator = new Translator(config);
            const result = await translator.translateObject({}, 'en');
            expect(result).toEqual({});
        });

        it('should preserve non-string values', async () => {
            const translator = new Translator(config);
            const input = {
                number: 42,
                boolean: true,
                null: null
            };

            const result = await translator.translateObject(input, 'en');
            expect(result).toEqual(input);
        });
    });
});
