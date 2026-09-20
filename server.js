import express from "express";
import pino from "pino";
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";

const app = express();
app.use(express.json());

const MY_NUMBER = "255768665364";
let sock;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  // Pairing Code (badala ya QR)
  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(MY_NUMBER);
    console.log("================================");
    console.log("PAIRING CODE:", code);
    console.log("Open WhatsApp → Linked Devices → Link with phone number");
    console.log("================================");
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ Uzima Baraka AI Connected.");
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
        "📈 MsemwaFX Signal Mode imewashwa. Live signals zitaongezwa baadaye.";
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
