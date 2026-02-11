
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, Attachment, User } from "../types";

// Configuration
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';
// Fallback key for demo purposes if backend isn't running
const CLIENT_API_KEY = process.env.API_KEY; 

class ApiService {
  private useBackend = false;

  constructor() {
    // Check if backend is reachable (simplified check logic)
    // For this demo, we default to client-side SDK if no VITE_API_URL is explicitly set
    this.useBackend = !!process.env.VITE_API_URL;
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
      // Mock Client Side Auth
      // In a real app, this would never exist. Kept for "Non-Disruptive" demo.
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

  // --- Chat API ---
  async sendMessage(
    text: string, 
    attachments: Attachment[] = [], 
    history: any[] = [],
    systemInstruction?: string,
    model: string = 'gemini-3-flash-preview'
  ): Promise<{ text: string, groundingMetadata?: any, image?: string }> {
    
    // 1. Backend Mode
    if (this.useBackend) {
      const res = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          attachments, 
          history,
          model,
          systemInstruction
        })
      });
      if (!res.ok) throw new Error("Backend request failed");
      return await res.json();
    } 
    
    // 2. Client-Side SDK Fallback (Preserves functionality for demo)
    if (!CLIENT_API_KEY) throw new Error("No API Key available");
    
    const ai = new GoogleGenAI({ apiKey: CLIENT_API_KEY });
    
    // Check for Image Generation Intent
    const isImageRequest = !attachments.length && /^(draw|generate image|create image|create a picture|paint|make an image|sketch)/i.test(text);

    if (isImageRequest) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text }] },
            config: { imageConfig: { aspectRatio: "1:1" } },
        });
        
        // Extract Image
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

    // Standard Chat
    // Map GPT requests to a capable Gemini model for client-side demo if needed, 
    // or attempt to use the string if the SDK supports it (unlikely for gpt-4o).
    // For this demo, we'll map 'gpt-4o' to 'gemini-3-pro-preview' to ensure it works
    // while giving the user the "selection" experience.
    const actualModel = model === 'gpt-4o' ? 'gemini-3-pro-preview' : model;

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
