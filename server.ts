import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Shared Gemini client utility
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Aeravia Oracle / Codex endpoint
  app.post('/api/oracle', async (req, res) => {
    try {
      const { prompt, characterContext, category } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const systemInstruction = `You are the Ancient Oracle of Aeravia, an ethereal repository of elemental knowledge and history in the world of "Fantastic Impact".
You speak with mythic wisdom, warmth, and tactical sharpness.
The continent of Aeravia has regions: Verdantia (lush ancient forests, ruins, waterfalls, colossus temple), Emberfall (volcanic crags and forge), and Azure Coast (oceanic cliffs, sunken ruins).
The 3 heroes are:
- Kael: Ember swordsman, bold, relentless, creates fire trails and Phoenix Break.
- Lyra: Aqua twin-blade vanguard, swift, agile, creates Tidal Spirals and Ocean Crown.
- Orion: Volt greatsword striker, stoic, thunderous, charges static and unleashes Stormbreaker.
Elemental reactions: Ember+Aqua=Steam Burst, Ember+Volt=Overload, Aqua+Volt=Electroshock, Aqua+Frost=Freeze, Gale+Element=Elemental Vortex, Terra+Element=Crystal Guard.

Keep answers atmospheric, engaging, actionable for an RPG adventurer, and under 130 words. If asked about combat, give concrete elemental synergy tips.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${category ? `[Topic: ${category}] ` : ''}${characterContext ? `[Party context: ${characterContext}] ` : ''}Adventurer inquiry: ${prompt}`,
        config: {
          systemInstruction,
          temperature: 0.8,
        },
      });

      res.json({ answer: response.text });
    } catch (error: any) {
      console.error('Gemini Oracle error:', error);
      res.status(500).json({
        error: 'The ancient ethereal leylines are flickering. Try again shortly.',
        details: error?.message,
      });
    }
  });

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fantastic Impact server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
