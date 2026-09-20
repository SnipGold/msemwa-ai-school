
import express from "express";
import pino from "pino";
import qrcode from "qrcode-terminal";
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";

const app = express();
app.use(express.json());

const MY_NUMBER = "255768665364"; // mfano: 255768665364

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.log("=== SCAN QR WITH WHATSAPP BUSINESS ===");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ Uzima Baraka AI connected.");
    }

    if (
      connection === "close" &&
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
    ) {
      startBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid.replace("@s.whatsapp.net", "");
    if (sender !== MY_NUMBER) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    let reply = "Karibu Uzima Baraka AI.";

    if (text.toLowerCase().includes("signal")) {
      reply =
        "📈 MsemwaFX Signal Mode imewashwa. Baadaye tutaongeza live signals.";
    } else if (text.toLowerCase().includes("hello")) {
      reply = "Habari Yustin! Karibu Uzima Baraka AI.";
    }

    await sock.sendMessage(msg.key.remoteJid, { text: reply });
  });
}

startBot();

app.get("/", (_, res) => {
  res.send("Uzima Baraka AI + MsemwaFX Bot Running");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
