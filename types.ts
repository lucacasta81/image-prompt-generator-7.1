
export interface TokenUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface PromptConfig {
  style: VisualStyle;
  lighting: LightingMode;
  perspective: Perspective;
  generator: ImageGenerator;
  isConcise: boolean;
}

export interface GeneratedPrompt {
  id: string;
  title: string;
  content: string;
  config: PromptConfig;
  sourceImageUrl?: string;
  usage?: TokenUsage;
}

export enum ImageGenerator {
  UNIVERSAL = "Universal",
  MIDJOURNEY = "Midjourney v6",
  DALLE3 = "DALL-E 3",
  FLUX = "Flux.1",
  SDXL = "SDXL"
}

export enum VisualStyle {
  NEUTRAL = "Neutral",
  CINEMATIC = "Cinematic",
  PHOTOREALISTIC = "Photoreal",
  DIGITAL_ART = "Digital Art",
  CYBERPUNK = "Cyberpunk",
  ANIME = "Anime",
  OIL_PAINTING = "Oil Painting",
  MINIMALIST = "Minimalist",
  SURREALISM = "Surrealism",
  PIXEL_ART = "Pixel Art",
  NOIR = "Film Noir",
  SKETCH = "Sketch"
}

export enum LightingMode {
  NEUTRAL = "Auto",
  GOLDEN_HOUR = "Golden Hour",
  NEON = "Neon Glow",
  RIM = "Rim Lighting",
  MOODY = "Moody",
  STUDIO = "Studio Soft",
  NATURAL = "Natural"
}

export enum Perspective {
  NEUTRAL = "Auto",
  WIDE = "Wide Angle",
  MACRO = "Macro",
  LOW = "Low Angle",
  BIRD = "Bird's Eye",
  POV = "POV"
}
