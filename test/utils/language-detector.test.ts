import {
  detectLanguage,
  isMultiLanguage,
  getLanguageConfidence,
  needsTranslation
} from '../../src/utils/language-detector';

describe('Language Detector', () => {
  describe('detectLanguage', () => {
    it('should detect Chinese text', () => {
      expect(detectLanguage('你好世界')).toBe('chinese');
    });

    it('should detect Japanese text', () => {
      expect(detectLanguage('こんにちは')).toBe('japanese');
    });

    it('should detect Korean text', () => {
      expect(detectLanguage('안녕하세요')).toBe('korean');
    });

    it('should detect Latin text', () => {
      expect(detectLanguage('Hello World')).toBe('latin');
    });

    it('should return unknown for non-matching text', () => {
      expect(detectLanguage('123456')).toBe('unknown');
    });
  });

  describe('isMultiLanguage', () => {
    it('should detect single language text', () => {
      expect(isMultiLanguage('你好世界')).toBe(false);
    });

    it('should detect mixed language text', () => {
      expect(isMultiLanguage('Hello 世界')).toBe(true);
    });

    it('should handle empty text', () => {
      expect(isMultiLanguage('')).toBe(false);
    });
  });

  describe('getLanguageConfidence', () => {
    it('should calculate confidence for Chinese text', () => {
      const text = '你好，世界！';
      expect(getLanguageConfidence(text, 'chinese')).toBeGreaterThan(0.8);
    });

    it('should handle mixed text', () => {
      const text = 'Hello 世界';
      expect(getLanguageConfidence(text, 'chinese')).toBe(0.4);
    });

    it('should return 0 for non-matching text', () => {
      expect(getLanguageConfidence('Hello', 'chinese')).toBe(0);
    });

    it('should ignore whitespace in calculations', () => {
      const text = '你好  世界  ';
      expect(getLanguageConfidence(text, 'chinese')).toBe(1);
    });
  });

  describe('needsTranslation', () => {
    it('should identify text needing translation', () => {
      expect(needsTranslation('你好世界', 'chinese')).toBe(true);
    });

    it('should identify text not needing translation', () => {
      expect(needsTranslation('Hello World', 'chinese')).toBe(false);
    });

    it('should respect custom threshold', () => {
      const mixedText = 'Hello 世界';
      expect(needsTranslation(mixedText, 'chinese', 0.3)).toBe(true);
      expect(needsTranslation(mixedText, 'chinese', 0.5)).toBe(false);
    });
  });
});
