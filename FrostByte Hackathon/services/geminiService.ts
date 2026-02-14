
import { GoogleGenAI } from "@google/genai";

/**
 * Utility to retry API calls on transient errors or network flakes.
 */
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = String(error).toLowerCase();
    
    // Check for rate limits
    const isRateLimit = errorStr.includes("429") || errorStr.includes("rate_limit") || errorStr.includes("quota");
    if (isRateLimit) {
      throw new Error("RATE_LIMIT_REACHED");
    }

    // Check for the specific 500/XHR/RPC proxy error provided in the logs
    const isTransient = errorStr.includes("500") || 
                        errorStr.includes("xhr error") || 
                        errorStr.includes("rpc failed") || 
                        errorStr.includes("unknown");

    if (isTransient && retries > 0) {
      console.warn(`SignSpeak: Transient API error detected. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 1.5);
    }
    
    throw error;
  }
}

/**
 * Interprets a base64 frame from the camera as ASL/Gestures.
 */
export async function getGestureInterpretation(base64Image: string): Promise<string> {
  return callWithRetry(async () => {
    // Fresh instance as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "Identify the ASL sign or hand gesture in this image. Return ONLY the single most likely word. If no clear sign is detected or it is a resting position, return 'Scanning'." },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ]
    });
    
    return response.text?.trim() || "Scanning";
  });
}

/**
 * Generates an image representing a sign for a given word.
 */
export async function getSignVisualization(text: string): Promise<string> {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A clear, high-quality educational illustration of a person performing the American Sign Language (ASL) gesture for the word: "${text}". Bright studio lighting, clean solid background, focus on hands and upper body.` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("Generation failed");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  });
}
