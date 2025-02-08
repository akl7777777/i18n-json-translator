import * as fs from 'fs';
import * as path from 'path';
import { FileProcessor } from '../../src/utils/file-processor';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FileProcessor', () => {
  const sampleJson = {
    title: '测试',
    description: '这是一个测试'
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

  describe('processTranslations', () => {
    const mockTranslator = {
      translateObject: jest.fn()
    };

    beforeEach(() => {
      mockTranslator.translateObject.mockReset();
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(sampleJson));
    });

    it('should process all languages successfully', async () => {
      mockTranslator.translateObject.mockImplementation((text) =>
        Promise.resolve({ ...text, translated: true })
      );

      const results = await FileProcessor.processTranslations(
        'input.json',
        'output',
        mockTranslator,
        ['en', 'ja']
      );

      expect(Object.keys(results)).toHaveLength(2);
      expect(mockTranslator.translateObject).toHaveBeenCalledTimes(2);
    });

    it('should continue processing if one language fails', async () => {
      mockTranslator.translateObject
        .mockResolvedValueOnce({ ...sampleJson, translated: true })
        .mockRejectedValueOnce(new Error('Translation failed'));

      const results = await FileProcessor.processTranslations(
        'input.json',
        'output',
        mockTranslator,
        ['en', 'ja']
      );

      expect(Object.keys(results)).toHaveLength(1);
    });
  });
});
