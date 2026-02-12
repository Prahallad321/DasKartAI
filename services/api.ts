
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatMessage, Attachment, User } from "../types";
import { authService } from "../utils/auth-service";

// Configuration
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';
// Fallback key for demo purposes if backend isn't running
const CLIENT_API_KEY = process.env.API_KEY; 

class ApiService {
  private useBackend = false;

  constructor() {
    this.useBackend = !!process.env.VITE_API_URL;
  }

  // Helper to enforce subscription
  private async checkSubscription() {
    const user = await authService.getSession();
    if (user && user.plan === 'trial') {
        if (user.subscriptionStatus === 'expired' || Date.now() > user.trialEndsAt) {
            throw new Error("Subscription Trial Expired. Please upgrade to continue.");
        }
    }
  }

  // Helper to get current location
  private async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
  }

  // --- Helper: Parse Options from Prompt ---
  private extractOptions(text: string) {
    const config: any = {};
    const lowerText = text.toLowerCase();

    // 1. Aspect Ratio
    const arMatch = text.match(/\b(16:9|9:16|1:1|4:3|3:4)\b/);
    if (arMatch) {
      config.aspectRatio = arMatch[1];
    }

    // 2. Resolution / Size
    const resMatch = text.match(/\b(1080p|720p|4k|2k|1k)\b/i);
    if (resMatch) {
        const val = resMatch[1].toUpperCase();
        if (val === '4K' || val === '2K' || val === '1K') {
            config.imageSize = val;
        } else if (val === '1080P' || val === '720P') {
            config.resolution = val.toLowerCase();
        }
    }

    // 3. Video Duration
    if (lowerText.includes('long video') || lowerText.includes('long')) {
        config.duration = 'long';
    } else {
        config.duration = 'short';
    }

    return config;
  }

  // --- Auth API ---
  async login(email: string, password: string): Promise<User> {
    if (this.useBackend) {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Login failed');
      return (await res.json()).user;
    } else {
      return {
        id: 'demo-user',
        name: 'Demo User',
        email,
        role: 'user',
        plan: 'trial',
        status: 'active',
        trialEndsAt: Date.now() + 86400000
      };
    }
  }

  // --- Specialized GenAI Functions ---

  async generateSpeech(text: string): Promise<string> {
    await this.checkSubscription();
    if (!CLIENT_API_KEY) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
  }

  async transcribeAudio(audioBase64: string, mimeType: string = 'audio/wav'): Promise<string> {
    await this.checkSubscription();
    if (!CLIENT_API_KEY) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Transcribe this audio exactly as spoken." }
        ]
      }
    });

    return response.text || "";
  }

  // --- Dedicated Image Generation ---
  async generateImage(prompt: string, imageBase64: string | undefined, model: string, options: any): Promise<any> {
    if (!CLIENT_API_KEY) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });

    let targetModel = 'gemini-2.5-flash-image';
    if (model === 'gemini-3-pro-image-preview' || options.imageSize === '4K' || options.imageSize === '2K') {
        targetModel = 'gemini-3-pro-image-preview';
    }

    const config: any = {
        imageConfig: {
            aspectRatio: options.aspectRatio || "1:1",
        }
    };

    if (targetModel === 'gemini-3-pro-image-preview') {
        config.imageConfig.imageSize = options.imageSize || "1K";
    }

    const parts: any[] = [];
    if (imageBase64) {
        parts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
    }
    
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: targetModel,
        contents: { parts },
        config: config
    });

    let generatedImage: string | undefined;
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) generatedImage = part.inlineData.data;
        }
    }

    return { text: "Generated Image:", image: generatedImage };
  }

  // --- Dedicated Video Generation ---
  async generateVideo(prompt: string, imageBase64: string | undefined, model: string, options: any): Promise<any> {
    if (!CLIENT_API_KEY) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });

    const veoModel = 'veo-3.1-fast-generate-preview'; 

    const videoConfig: any = {
        numberOfVideos: 1,
        resolution: options.resolution || '720p',
        aspectRatio: (options.aspectRatio === '9:16' || options.aspectRatio === '16:9') ? options.aspectRatio : '16:9'
    };

    const request: any = {
      model: veoModel,
      prompt: prompt || "Animate this",
      config: videoConfig
    };

    if (imageBase64) {
        request.image = {
            imageBytes: imageBase64,
            mimeType: 'image/png', 
        };
    }

    let operation = await ai.models.generateVideos(request);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    const videoRes = await fetch(`${videoUri}&key=${CLIENT_API_KEY}`);
    const blob = await videoRes.blob();
    
    const base64Video = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });

    return { text: "Generated Video:", video: base64Video };
  }

  // --- Main Chat Router ---
  async sendMessage(
    text: string, 
    attachments: Attachment[] = [], 
    history: any[] = [],
    systemInstruction?: string,
    model: string = 'gemini-3-flash-preview'
  ): Promise<{ text: string, groundingMetadata?: any, image?: string, video?: string }> {
    
    await this.checkSubscription();

    if (this.useBackend) {
      const res = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, attachments, history, model, systemInstruction })
      });
      if (!res.ok) throw new Error("Backend request failed");
      return await res.json();
    } 
    
    if (!CLIENT_API_KEY) throw new Error("No API Key available");

    const options = this.extractOptions(text);
    const lowerText = text.toLowerCase();
    const isVideoIntent = /^(animate|create video|make video|generate video|motion|movie)/i.test(lowerText) || model.startsWith('veo');
    const isImageIntent = /^(draw|generate image|create image|create a picture|paint|make an image|sketch)/i.test(lowerText) || model.includes('image');
    
    // Check for Maps intent
    const isMapsIntent = /^(where|find|locate|map|near|directions|place|restaurant|store|shop|park|museum|coffee)/i.test(lowerText);

    let contextImageBase64: string | undefined = undefined;

    const attachedImage = attachments.find(a => a.mimeType.startsWith('image/'));
    if (attachedImage) {
        contextImageBase64 = attachedImage.data;
    } else if (isVideoIntent || isImageIntent) {
        for (let i = history.length - 1; i >= 0; i--) {
            const parts = history[i].parts;
            if (parts) {
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                        contextImageBase64 = part.inlineData.data;
                        break;
                    }
                }
            }
            if (contextImageBase64) break;
        }
    }

    if (isVideoIntent) {
        try {
            return await this.generateVideo(text, contextImageBase64, model, options);
        } catch (e: any) {
            console.error("Veo Error:", e);
            return { text: "Video generation failed: " + e.message };
        }
    }

    if (isImageIntent) {
        try {
            return await this.generateImage(text, contextImageBase64, model, options);
        } catch (e: any) {
            console.error("Image Gen Error:", e);
            return { text: "Image generation failed: " + e.message };
        }
    }

    let actualModel = model;
    let tools: any[] = [{ googleSearch: {} }];
    let toolConfig: any = undefined;

    if (isMapsIntent) {
        // Force model to gemini-2.5-flash for maps grounding support
        actualModel = 'gemini-2.5-flash';
        tools = [{ googleMaps: {} }];
        
        // Try to get user location
        try {
             const pos = await this.getCurrentPosition();
             toolConfig = { 
                retrievalConfig: { 
                    latLng: { 
                        latitude: pos.coords.latitude, 
                        longitude: pos.coords.longitude 
                    } 
                } 
             };
        } catch (e) { 
            console.warn("Could not get location for maps grounding:", e);
            // Continue without location, maps tool might still work for general queries
        }
    } else if (actualModel === 'gemini-2.5-flash-native-audio-preview-12-2025' || actualModel.startsWith('veo') || actualModel.includes('image')) {
        actualModel = 'gemini-3-flash-preview';
    }

    const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });
    
    const isGPT = model.toLowerCase().includes('gpt');
    const hasVisuals = !!contextImageBase64 || attachments.length > 0;

    if (isGPT && !hasVisuals) {
       try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
           const messages = history.map((h: any) => ({
              role: h.role === 'model' ? 'assistant' : 'user',
              content: h.parts.map((p: any) => p.text || '').join(' ')
           }));
           if (systemInstruction) messages.unshift({ role: 'system', content: systemInstruction });
           messages.push({ role: 'user', content: text });

           const res = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
              body: JSON.stringify({ model: model, messages: messages })
           });

           if (res.ok) {
              const data = await res.json();
              return { text: data.choices[0]?.message?.content || "" };
           }
        }
      } catch (e) { /* Fallback */ }
    }

    const chat = ai.chats.create({
        model: actualModel,
        config: { 
            systemInstruction,
            tools: tools,
            toolConfig: toolConfig
        },
        history
    });

    const currentParts: any[] = [{ text }];
    attachments.forEach(att => {
        currentParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
    });

    const result = await chat.sendMessage({ 
        message: attachments.length > 0 ? currentParts : text 
    });
    
    return {
        text: result.text || '',
        groundingMetadata: result.candidates?.[0]?.groundingMetadata
    };
  }
}

export const api = new ApiService();
