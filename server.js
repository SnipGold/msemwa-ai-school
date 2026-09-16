import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(__dirname));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "running" });
});

// Chat with Gemini
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ reply: "Andika ujumbe kwanza." });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
      return res.json({ reply: "Hitilafu ya Gemini API." });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Samahani, sijapata jibu.";

    return res.json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ reply: "Server Error." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Msemwa AI School Automation running on port ${PORT}`);
});
