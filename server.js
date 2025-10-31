import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cors());

// Gemini client using your API key from .env
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function buildSiteFromPrompt(userPrompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      `
You are WebsiteBuilderAI, a senior front-end engineer.

Goal:
Generate a SINGLE-PAGE responsive website based ONLY on the user's request below.

User request:
"${userPrompt}"

Return production-ready code with:
1. "html": inner <body> markup only (no <html>, <head>, <body> tags).
2. "css": responsive, modern, no CDNs.
3. "js": vanilla JS for any interactions (or minimal stub).
4. "notes": very short summary.

Rules:
- Output must follow the JSON schema.
- No markdown.
`
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          html: { type: Type.STRING },
          css: { type: Type.STRING },
          js: { type: Type.STRING },
          notes: { type: Type.STRING }
        },
        required: ["html", "css", "js"],
        propertyOrdering: ["html", "css", "js", "notes"]
      }
    }
  });

  const jsonText = response.text;
  const parsed = JSON.parse(jsonText);
  return parsed;
}

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Missing 'prompt' in request body." });
    }

    const site = await buildSiteFromPrompt(prompt);

    res.json({
      html: site.html || "",
      css: site.css || "",
      js: site.js || "",
      notes: site.notes || ""
    });
  } catch (err) {
    console.error("Generation error:", err);
    res.status(500).json({
      error: "Website generation failed. Check server logs.",
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Website Generator backend listening on http://localhost:${PORT}`);
});
