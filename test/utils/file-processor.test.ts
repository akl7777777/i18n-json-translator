import * as fs from 'fs';
import * as path from 'path';
import { FileProcessor, TranslationOptions } from '../../src/utils/file-processor';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FileProcessor', () => {
  const sampleJson = {
    title: '测试',
    description: '这是一个测试'
  };

  const defaultOptions: TranslationOptions = {
    maxWorkers: 3,
    maxRetries: 3,
    retryDelay: 2000,
    retryMultiplier: 1.5,
    batchDelay: 2000
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readJsonFile', () => {
    it('should read and parse JSON file correctly', () => {
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(sampleJson));

      const result = FileProcessor.readJsonFile('test.json');
      expect(result).toEqual(sampleJson);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('test.json', 'utf8');
    });

    it('should handle file read errors', () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => FileProcessor.readJsonFile('nonexistent.json')).toThrow(
        'Failed to read JSON file: File not found'
      );
    });

    it('should handle invalid JSON', () => {
      mockedFs.readFileSync.mockReturnValue('invalid json');

      expect(() => FileProcessor.readJsonFile('invalid.json')).toThrow(
        'Failed to read JSON file'
      );
    });
  });

  describe('saveTranslation', () => {
    it('should create output directory if it doesn\'t exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      FileProcessor.saveTranslation('output', 'en', sampleJson);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('output', {
        recursive: true
      });
    });

    it('should write translation to file with correct formatting', () => {
      mockedFs.existsSync.mockReturnValue(true);

      const outputPath = FileProcessor.saveTranslation('output', 'en', sampleJson);

      expect(outputPath).toBe(path.join('output', 'en.json'));
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        outputPath,
        JSON.stringify(sampleJson, null, 2),
        'utf8'
      );
    });

    it('should handle write errors', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      expect(() =>
        FileProcessor.saveTranslation('output', 'en', sampleJson)
      ).toThrow('Failed to save translation: Write error');
    });
  });

  describe('processTranslationsParallel', () => {
    const mockTranslator = {
      translateObject: jest.fn()
    };

    beforeEach(() => {
      mockTranslator.translateObject.mockReset();
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(sampleJson));
      mockedFs.existsSync.mockReturnValue(true);
    });

    it('should process all languages successfully with default options', async () => {
      mockTranslator.translateObject.mockImplementation((text) =>
        Promise.resolve({ ...text, translated: true })
      );

      const results = await FileProcessor.processTranslationsParallel(
        'input.json',
        'output',
        mockTranslator,
        ['en', 'ja'],
        defaultOptions
      );

      expect(Object.keys(results)).toHaveLength(2);
      expect(mockTranslator.translateObject).toHaveBeenCalledTimes(2);
    });

    it('should handle retry logic correctly', async () => {
      const customOptions: TranslationOptions = {
        ...defaultOptions,
        maxRetries: 2,
        retryDelay: 100
      };

      mockTranslator.translateObject
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ ...sampleJson, translated: true });

      const results = await FileProcessor.processTranslationsParallel(
        'input.json',
        'output',
        mockTranslator,
        ['en'],
        customOptions
      );

      expect(Object.keys(results)).toHaveLength(1);
      expect(mockTranslator.translateObject).toHaveBeenCalledTimes(2);
    });

    it('should respect maxWorkers option', async () => {
      const customOptions: TranslationOptions = {
        ...defaultOptions,
        maxWorkers: 1
      };

      mockTranslator.translateObject.mockImplementation((text) =>
        Promise.resolve({ ...text, translated: true })
      );

      await FileProcessor.processTranslationsParallel(
        'input.json',
        'output',
        mockTranslator,
        ['en', 'ja', 'ko'],
        customOptions
      );

      // 验证是否按批次处理
      expect(mockTranslator.translateObject).toHaveBeenCalledTimes(3);
    });

    it('should handle language code aliases', async () => {
      mockTranslator.translateObject.mockImplementation((text) =>
        Promise.resolve({ ...text, translated: true })
      );

      const results = await FileProcessor.processTranslationsParallel(
        'input.json',
        'output',
        mockTranslator,
        ['kr', 'jp'], // 使用别名
        defaultOptions
      );

      expect(Object.keys(results)).toHaveLength(2);
      expect(mockTranslator.translateObject).toHaveBeenCalledWith(
        expect.anything(),
        'ko'
      );
      expect(mockTranslator.translateObject).toHaveBeenCalledWith(
        expect.anything(),
        'ja'
      );
    });

    it('should create error log for failed translations', async () => {
      const customOptions: TranslationOptions = {
        ...defaultOptions,
        maxRetries: 1
      };

      mockTranslator.translateObject.mockRejectedValue(
        new Error('Translation failed')
      );

      await FileProcessor.processTranslationsParallel(
        'input.json',
        'output',
        mockTranslator,
        ['en'],
        customOptions
      );

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('translation_errors.json'),
        expect.stringContaining('Translation failed'),
        'utf8'
      );
    });
  });
});
