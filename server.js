import express from "express";
import pino from "pino";
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  Browsers
} from "@whiskeysockets/baileys";

const app = express();
app.use(express.json());

const MY_NUMBER = "255768665364";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Uzima Baraka AI"),
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  // Pairing Code
  if (!sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(MY_NUMBER);
      console.log("================================");
      console.log("PAIRING CODE:", code.match(/.{1,4}/g)?.join("-"));
      console.log("================================");
    } catch (err) {
      console.error("PAIRING ERROR:", err);
    }
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ Uzima Baraka AI Connected.");
    }

    if (
      connection === "close" &&
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
    ) {
      console.log("Reconnecting...");
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
      reply = "📈 MsemwaFX Signal Mode imewashwa.";
    } else if (text.toLowerCase().includes("hello")) {
      reply = "Habari Yustin! Karibu Uzima Baraka AI.";
    }

    await sock.sendMessage(msg.key.remoteJid, { text: reply });
  });
}

startBot().catch(console.error);

app.get("/", (_, res) => {
  res.send("Uzima Baraka AI + MsemwaFX Bot Running");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
