
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- In-Memory Database (Replace with MongoDB/Postgres in production) ---
const db = {
  users: [],
  chats: [],
  settings: {
    maintenanceMode: false,
    systemInstruction: "You are DasKartAI. Use book-style formatting for math (F = G(m₁ × m₂) / R²) and chemistry (H₂O). No Markdown blocks."
  }
};

// --- Middleware ---
const isAdmin = (req, res, next) => {
  const token = req.headers.authorization;
  if (token === process.env.ADMIN_SECRET) return next();
  res.status(403).json({ error: 'Unauthorized' });
};

// --- API Routes ---

// 1. Auth
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User exists' });
  }
  const newUser = { 
    id: crypto.randomUUID(), 
    name, email, password, 
    role: 'user', 
    plan: 'trial',
    status: 'active'
  };
  db.users.push(newUser);
  res.json({ user: { ...newUser, password: undefined } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ user: { ...user, password: undefined } });
});

// 2. Chat (Proxy to Gemini)
app.post('/api/chat/message', async (req, res) => {
  try {
    const { message, history, model = 'gemini-3-flash-preview' } = req.body;
    
    if (!process.env.API_KEY) throw new Error("Server missing API Key");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
      model: model,
      history: history || [],
      config: {
        systemInstruction: db.settings.systemInstruction,
      }
    });

    const result = await chat.sendMessage(message);
    const responseText = result.text;

    // Save to DB
    // db.chats.push({ ... }) 

    res.json({ text: responseText });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Admin Panel
app.get('/api/admin/stats', isAdmin, (req, res) => {
  res.json({
    totalUsers: db.users.length,
    activeSessions: 42, // Mock
    storageUsed: '1.2GB'
  });
});

app.post('/api/admin/settings', isAdmin, (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  res.json(db.settings);
});

app.listen(PORT, () => {
  console.log(`DasKartAI Backend running on port ${PORT}`);
});
