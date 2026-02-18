
import { GoogleGenAI, Type } from "@google/genai";
import { PromptConfig, TokenUsage } from "../types";

const getModelConfig = (config: PromptConfig) => {
  return `Target: ${config.generator}. Style: ${config.style}. Lighting: ${config.lighting}. Perspective: ${config.perspective}. 
  Format: ${config.isConcise ? 'Dense technical tags' : 'Descriptive artistic sentences'}.`;
};

export const expandPrompt = async (seed: string, config: PromptConfig) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const isSurprise = seed.startsWith("SURPRISE_ME:");
  
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
};

export const extractPromptFromImage = async (base64: string, mime: string, config: PromptConfig) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
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
};

export const modifyPrompt = async (current: string, instruction: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Existing prompt: "${current}"\nRequest: "${instruction}"\nRewrite the prompt to incorporate the request while maintaining image generation quality. Output text only.`
  });
  return { text: response.text?.trim() || current, usage: response.usageMetadata as TokenUsage };
};
