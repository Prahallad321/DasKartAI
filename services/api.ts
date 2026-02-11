
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

  async generateVideo(prompt: string, imageBase64: string, model: string = 'veo-3.1-fast-generate-preview'): Promise<string> {
    await this.checkSubscription();
    if (!CLIENT_API_KEY) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });

    // Ensure we are using a Veo model
    const validModel = model.startsWith('veo') ? model : 'veo-3.1-fast-generate-preview';

    let operation = await ai.models.generateVideos({
      model: validModel,
      prompt: prompt || "Animate this image",
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/png', // Assuming PNG or converted before call, Veo is strict
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Polling
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    // Fetch the actual video bytes using the key
    const videoRes = await fetch(`${videoUri}&key=${CLIENT_API_KEY}`);
    const blob = await videoRes.blob();
    
    // Convert to base64 to pass back to UI easily (or return object URL if preferred)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }

  // --- Chat API ---
  async sendMessage(
    text: string, 
    attachments: Attachment[] = [], 
    history: any[] = [],
    systemInstruction?: string,
    model: string = 'gemini-3-flash-preview'
  ): Promise<{ text: string, groundingMetadata?: any, image?: string, video?: string }> {
    
    await this.checkSubscription();

    if (this.useBackend) {
      // Backend implementation omitted for brevity, assuming similar interface
      const res = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, attachments, history, model, systemInstruction })
      });
      if (!res.ok) throw new Error("Backend request failed");
      return await res.json();
    } 
    
    if (!CLIENT_API_KEY) throw new Error("No API Key available");
    
    // --- Routing Logic: OpenAI vs Gemini ---
    const isGPT = model.toLowerCase().includes('gpt');
    const hasVisuals = attachments.some(a => a.mimeType.startsWith('image/') || a.mimeType.startsWith('video/'));

    // Rule: For normal chatbot conversation (text-only), Use OpenAI API if GPT model is selected.
    if (isGPT && !hasVisuals) {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
           console.warn("OpenAI API Key missing, falling back to Gemini.");
        } else {
           // Convert Gemini history format to OpenAI format
           const messages = history.map((h: any) => ({
              role: h.role === 'model' ? 'assistant' : 'user',
              content: h.parts.map((p: any) => p.text || '').join(' ')
           }));
           
           if (systemInstruction) {
              messages.unshift({ role: 'system', content: systemInstruction });
           }
           
           messages.push({ role: 'user', content: text });

           const res = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                  model: model, // e.g., 'gpt-4o'
                  messages: messages
              })
           });

           if (res.ok) {
              const data = await res.json();
              return { text: data.choices[0]?.message?.content || "" };
           } else {
              console.warn("OpenAI API Error:", res.statusText, "Falling back to Gemini.");
           }
        }
      } catch (e) {
        console.error("OpenAI Request Failed", e);
        // Fallthrough to Gemini
      }
    }

    // --- Gemini Logic ---
    const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });

    // 1. Check for Video Generation Intent (Veo)
    const isVideoRequest = attachments.length === 1 && 
                           attachments[0].mimeType.startsWith('image/') && 
                           /^(animate|create video|make video|generate video|motion)/i.test(text);

    if (isVideoRequest || model.startsWith('veo')) {
      try {
        // Use the selected model if it's a Veo model, otherwise use the fast default
        const videoModel = model.startsWith('veo') ? model : 'veo-3.1-fast-generate-preview';
        const videoBase64 = await this.generateVideo(text, attachments[0].data, videoModel);
        return { text: "Here is your generated video:", video: videoBase64 };
      } catch (e) {
        console.error("Veo Error:", e);
        return { text: "Sorry, I couldn't generate the video. " + (e as Error).message };
      }
    }

    // 2. Check for Image Generation Intent
    const isImageGenRequest = !attachments.length && /^(draw|generate image|create image|create a picture|paint|make an image|sketch)/i.test(text);

    if (isImageGenRequest) {
        // Use selected model if it's explicitly the Gemini 3 Pro Image (Nano Banana Pro)
        const imgModel = model === 'gemini-3-pro-image-preview' ? model : 'gemini-2.5-flash-image';
        
        const config: any = { imageConfig: { aspectRatio: "1:1" } };
        
        // Add specific config for Pro model if needed (e.g. higher resolution)
        if (imgModel === 'gemini-3-pro-image-preview') {
            config.imageConfig.imageSize = "1K"; // Supported: 1K, 2K, 4K
        }

        const response = await ai.models.generateContent({
            model: imgModel,
            contents: { parts: [{ text }] },
            config: config,
        });
        
        let imageBase64: string | undefined;
        let responseText = '';
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) imageBase64 = part.inlineData.data;
                else if (part.text) responseText += part.text;
            }
        }
        return { text: responseText || "Image generated", image: imageBase64 };
    }

    // 3. Image Analysis / Standard Chat (Gemini)
    
    // Fix for 404 Error: The Native Audio model (used for Live API) does not support generateContent text chat.
    // We map it to Flash 3 for standard text interactions if it was passed as the default model.
    let actualModel = model;
    if (actualModel === 'gemini-2.5-flash-native-audio-preview-12-2025') {
        actualModel = 'gemini-3-flash-preview';
    }

    // Rule: For Diagram images, Image analysis, Video-related visual understanding -> Use Gemini API
    // If GPT selected but fell back (or forced for visuals), map to Gemini Pro.
    if (hasVisuals || isGPT) {
        actualModel = 'gemini-3-pro-preview';
    }

    const chat = ai.chats.create({
        model: actualModel,
        config: { 
            systemInstruction,
            tools: [{ googleSearch: {} }]
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
