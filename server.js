
import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "Msemwa2026Verify";

// Health check
app.get("/", (req, res) => {
  res.send("Msemwa AI School Automation is running.");
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
