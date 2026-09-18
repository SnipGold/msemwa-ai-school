import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

//================ HOME =================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "running" });
});

//================ MsemwaFX Signal Endpoint =================

app.post("/api/signal", async (req, res) => {
  try {
    const { symbol, signal, score, entry, sl, tp1, tp2 } = req.body;

    const message = `
📊 MsemwaFX Institutional Signal

Pair: ${symbol}
Signal: ${signal}
Score: ${score}/100

Entry: ${entry}
Stop Loss: ${sl}
TP1: ${tp1}
TP2: ${tp2}
`.trim();

    console.log(message);

    res.json({
      ok: true,
      received: true,
      message
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

//================ CHAT ENDPOINT =================

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ reply: "Andika ujumbe kwanza." });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: message }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Error:", data);
      return res.status(response.status).json({
        reply: data.error?.message || "Gemini API Error."
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(p => p.text)
        .filter(Boolean)
        .join("\n") || "Samahani, sijapata jibu.";

    return res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Server Error." });
  }
});

//================ START SERVER =================

app.listen(PORT, () => {
  console.log(`Msemwa AI School running on port ${PORT}`);
});
