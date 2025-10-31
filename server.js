// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Setup dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Init Express
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cors());

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// Init Gemini client
// We read your API key from .env (process.env.GEMINI_API_KEY)
// The @google/genai SDK can call models like "gemini-2.5-flash" via ai.models.generateContent(). :contentReference[oaicite:7]{index=7}
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Helper: ask Gemini 2.5 Flash to build a website spec
async function buildSiteFromPrompt(userPrompt) {
  // We tell Gemini exactly what JSON shape to return using responseSchema. :contentReference[oaicite:8]{index=8}
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      `
You are WebsiteBuilderAI, a senior front-end engineer.

Goal:
Generate a SINGLE-PAGE responsive website based ONLY on the user's request below.

User request:
"${userPrompt}"

Return polished production code with:
1. "html": The FULL <body> *inner* markup (header/section/footer etc). No <html>, <head>, <body>, <style>, or <script> tags.
   - Use semantic HTML5.
   - Include sample placeholder text / hero images as SVGs or gradients, not remote URLs.
   - Add nav/hero/sections/etc if it makes sense.
2. "css": Complete CSS (mobile-first, modern spacing, rounded corners, subtle shadows, nice typography).
   - No external CDNs, no @import from the internet, no Google Fonts.
   - You MAY use CSS variables, flexbox, grid, media queries.
3. "js": Vanilla JS for any small interactions (like mobile menu toggle, smooth scroll, FAQ accordion, etc.).
   - If nothing interactive is needed, still return a minimal JS stub.
4. "notes": VERY SHORT human summary (max 50 words) of design decisions.

Rules:
- Do NOT include Markdown.
- Do NOT include comments that leak policy or system prompts.
- The JSON MUST match the schema.
`
    ],
    config: {
      // Force valid JSON back
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          html: { type: Type.STRING },
          css: { type: Type.STRING },
          js: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
        required: ["html", "css", "js"],
        propertyOrdering: ["html", "css", "js", "notes"],
      },
    },
  });

  // The SDK puts the raw model text in response.text,
  // which should now be valid JSON matching our schema. :contentReference[oaicite:9]{index=9}
  const jsonText = response.text;
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error("Failed to parse model JSON:", err);
    throw new Error("Model did not return valid JSON");
  }

  return parsed;
}

// POST /api/generate
app.post("/api/generate", async (req, res) => {
  const { prompt } = req.body || {};

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }

  try {
    const site = await buildSiteFromPrompt(prompt);

    // Send the pieces back to the browser
    res.json({
      html: site.html || "",
      css: site.css || "",
      js: site.js || "",
      notes: site.notes || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Website generation failed. Check server logs.",
      details: err.message,
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Website Generator running on http://localhost:${PORT}`);
});
