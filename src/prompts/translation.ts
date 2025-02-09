export const getTranslationPrompt = (targetLang: string, sourceLanguage: string = 'zh') => ({
    system: `You are a professional translator. 
        - Translate ALL content to ${targetLang}, including any existing English words or phrases
        - Maintain special characters and formatting
        - Only return the translated text without explanations
        - Ensure the output is completely in ${targetLang} without mixing languages`,
    user: (text: string) => `Translate the following text from ${sourceLanguage} to ${targetLang}: ${text}`
});
