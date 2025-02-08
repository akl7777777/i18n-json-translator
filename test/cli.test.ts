import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CLI_PATH = path.resolve(__dirname, '../src/cli.ts');

describe('CLI', () => {
  const fixturesDir = path.join(__dirname, '__fixtures__');
  const outputDir = path.join(__dirname, 'output');
  const sampleFile = path.join(fixturesDir, 'sample.json');

  beforeAll(() => {
    // Ensure fixtures directory exists
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clean output directory before each test
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir);

    // Reset environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CUSTOM_API_KEY;
  });

  afterAll(() => {
    // Clean up output directory after all tests
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
  });

  it('should show help message', async () => {
    const { stdout } = await execAsync(`ts-node ${CLI_PATH} --help`);
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('Options:');
  });

  it('should show version', async () => {
    const { stdout } = await execAsync(`ts-node ${CLI_PATH} --version`);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should require target languages', async () => {
    await expect(
      execAsync(`ts-node ${CLI_PATH} translate ${sampleFile}`)
    ).rejects.toThrow('required option');
  });

  it('should validate input file exists', async () => {
    await expect(
      execAsync(
        `ts-node ${CLI_PATH} translate nonexistent.json -t en,ja`
      )
    ).rejects.toThrow();
  });

  it('should validate provider selection', async () => {
    await expect(
      execAsync(
        `ts-node ${CLI_PATH} translate ${sampleFile} -t en,ja -p invalid-provider`
      )
    ).rejects.toThrow();
  });

  describe('OpenAI provider', () => {
    it('should require API key', async () => {
      await expect(
        execAsync(
          `ts-node ${CLI_PATH} translate ${sampleFile} -t en,ja -p openai`
        )
      ).rejects.toThrow('OpenAI API key is required');
    });

    it('should accept API key from environment', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const { stdout } = await execAsync(
        `ts-node ${CLI_PATH} translate ${sampleFile} -t en --provider openai -o ${outputDir}`
      );
      expect(stdout).toContain('Starting translation');
    });
  });

  describe('Claude provider', () => {
    it('should require API key', async () => {
      await expect(
        execAsync(
          `ts-node ${CLI_PATH} translate ${sampleFile} -t en,ja -p claude`
        )
      ).rejects.toThrow('Anthropic API key is required');
    });

    it('should accept API key from environment', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      const { stdout } = await execAsync(
        `ts-node ${CLI_PATH} translate ${sampleFile} -t en --provider claude -o ${outputDir}`
      );
      expect(stdout).toContain('Starting translation');
    });
  });

  describe('Custom provider', () => {
    it('should require API URL and key', async () => {
      await expect(
        execAsync(
          `ts-node ${CLI_PATH} translate ${sampleFile} -t en,ja -p custom`
        )
      ).rejects.toThrow('Custom provider requires API URL and key');
    });

    it('should accept API details from command line', async () => {
      const { stdout } = await execAsync(
        `ts-node ${CLI_PATH} translate ${sampleFile} -t en --provider custom --custom-api-url https://api.example.com --custom-api-key test-key -o ${outputDir}`
      );
      expect(stdout).toContain('Starting translation');
    });

    it('should accept API details from environment', async () => {
      process.env.CUSTOM_API_URL = 'https://api.example.com';
      process.env.CUSTOM_API_KEY = 'test-key';
      const { stdout } = await execAsync(
        `ts-node ${CLI_PATH} translate ${sampleFile} -t en --provider custom -o ${outputDir}`
      );
      expect(stdout).toContain('Starting translation');
    });
  });

  describe('Output handling', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key';
    });

    it('should create output directory if it doesn\'t exist', async () => {
      const newOutputDir = path.join(outputDir, 'nested');
      const { stdout } = await execAsync(
        `ts-node ${CLI_PATH} translate ${sampleFile} -t en -o ${newOutputDir}`
      );
      expect(fs.existsSync(newOutputDir)).toBe(true);
      expect(stdout).toContain('Starting translation');
    });

    it('should generate correct output files', async () => {
      await execAsync(
        `ts-node ${CLI_PATH} translate ${sampleFile} -t en,ja -o ${outputDir}`
      );
      expect(fs.existsSync(path.join(outputDir, 'en.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'ja.json'))).toBe(true);
    });

    it('should maintain JSON structure in output files', async () => {
      await execAsync(
        `ts-node ${CLI_PATH} translate ${sampleFile} -t en -o ${outputDir}`
      );
      const outputFile = path.join(outputDir, 'en.json');
      const content = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      expect(content).toHaveProperty('app.title');
      expect(content).toHaveProperty('settings.theme');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON input', async () => {
      const invalidFile = path.join(fixturesDir, 'invalid.json');
      fs.writeFileSync(invalidFile, 'invalid json content');

      await expect(
        execAsync(`ts-node ${CLI_PATH} translate ${invalidFile} -t en`)
      ).rejects.toThrow();

      fs.unlinkSync(invalidFile);
    });

    it('should handle network errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'invalid-key';
      await expect(
        execAsync(
          `ts-node ${CLI_PATH} translate ${sampleFile} -t en -o ${outputDir}`
        )
      ).rejects.toThrow();
    });
  });
});
