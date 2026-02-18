
import { GoogleGenAI, Type } from "@google/genai";
import { PromptConfig, TokenUsage } from "../types";

const getModelConfig = (config: PromptConfig) => {
  return `Target: ${config.generator}. Style: ${config.style}. Lighting: ${config.lighting}. Perspective: ${config.perspective}. 
  Format: ${config.isConcise ? 'Dense technical tags' : 'Descriptive artistic sentences'}.`;
};

const validateKey = () => {
  const key = process.env.API_KEY;
  if (!key || key === "undefined" || key.length < 10) {
    console.error("DIAGNOSTICA: API_KEY mancante o non valida nel contesto process.env.");
    throw new Error("API_KEY_MISSING");
  }
  return key;
};

export const expandPrompt = async (seed: string, config: PromptConfig) => {
  try {
    const apiKey = validateKey();
    const ai = new GoogleGenAI({ apiKey });
    const isSurprise = seed.startsWith("SURPRISE_ME:");
    
    console.debug("DIAGNOSTICA: Avvio generazione con modello gemini-3-flash-preview...");
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: isSurprise ? "Generate 3 random but highly creative image concepts." : seed,
      config: {
        systemInstruction: `You are a prompt engineering expert. Expand the input into 3 professional prompts. ${getModelConfig(config)} Return ONLY JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["title", "content"]
              }
            }
          },
          required: ["prompts"]
        }
      }
    });

    const data = JSON.parse(response.text || '{"prompts": []}');
    return { prompts: data.prompts, usage: response.usageMetadata as TokenUsage };
  } catch (error: any) {
    console.error("ERRORE GEMINI (Generazione):", error);
    throw error;
  }
};

export const extractPromptFromImage = async (base64: string, mime: string, config: PromptConfig) => {
  try {
    const apiKey = validateKey();
    const ai = new GoogleGenAI({ apiKey });
    
    console.debug("DIAGNOSTICA: Avvio scansione visione con modello gemini-3-flash-preview...");
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType: mime } },
          { text: `Analyze this image and describe it for a text-to-image generator. ${getModelConfig(config)} Return only the prompt string.` }
        ]
      }
    });
    return { text: response.text?.trim() || "", usage: response.usageMetadata as TokenUsage };
  } catch (error: any) {
    console.error("ERRORE GEMINI (Visione):", error);
    throw error;
  }
};

export const modifyPrompt = async (current: string, instruction: string) => {
  try {
    const apiKey = validateKey();
    const ai = new GoogleGenAI({ apiKey });
    
    console.debug("DIAGNOSTICA: Avvio modifica prompt...");
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Existing prompt: "${current}"\nRequest: "${instruction}"\nRewrite the prompt to incorporate the request while maintaining image generation quality. Output text only.`
    });
    return { text: response.text?.trim() || current, usage: response.usageMetadata as TokenUsage };
  } catch (error: any) {
    console.error("ERRORE GEMINI (Modifica):", error);
    throw error;
  }
};
