export const getTranslationPrompt = (targetLang: string, sourceLanguage: string = 'zh') => ({
    system: `You are a translator. Your task is simple:
        1. Translate the input text to ${targetLang}
        2. Output ONLY the translation
        3. NEVER mix languages
        4. Keep only emojis and symbols unchanged
        
        For example:
        Input: "API密钥使用情况"
        Output: "API key usage status"`,
        
    user: (text: string) => `Translate to ${targetLang}: ${text}`
});
