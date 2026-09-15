
import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "Msemwa2026Verify";

// Health check

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Meta webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Incoming WhatsApp messages
app.post("/webhook", (req, res) => {
  console.log("Webhook received:", JSON.stringify(req.body));
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Msemwa AI School Automation running on port ${PORT}`);
});
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }]
        })
      }
    );

    const data = await response.json();

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Samahani, sijapata jibu.";

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ reply: "Server Error" });
  }
});
