import { CustomAPIClient } from '../../src/utils/custom-client';
import fetch from 'node-fetch';

// Mock fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CustomAPIClient', () => {
  const config = {
    apiUrl: 'https://api.example.com/v1/chat/completions',
    apiKey: 'test-api-key',
    format: 'openai' as const
  };

  let client: CustomAPIClient;

  beforeEach(() => {
    client = new CustomAPIClient(config);
    jest.clearAllMocks();
  });

  describe('translateWithOpenAIFormat', () => {
    it('should translate text successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello World'
            }
          }
        ]
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as any);

      const result = await client.translate(
        '你好世界',
        'zh',
        'en',
        'gpt-3.5-turbo'
      );

      expect(result).toBe('Hello World');
      expect(mockedFetch).toHaveBeenCalledWith(
        config.apiUrl,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          }
        })
      );
    });

    it('should handle API errors', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      } as any);

      await expect(
        client.translate('你好世界', 'zh', 'en', 'gpt-3.5-turbo')
      ).rejects.toThrow('API request failed: 401 Unauthorized');
    });

    it('should handle network errors', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        client.translate('你好世界', 'zh', 'en', 'gpt-3.5-turbo')
      ).rejects.toThrow('Custom API request failed: Network error');
    });
  });
});
