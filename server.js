import express from "express";
import pino from "pino";
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";

const app = express();
const PORT = process.env.PORT || 8080;
const PHONE_NUMBER = "255768665364"; // bila +

app.use(express.json());

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  let pairingSent = false;

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "connecting" && !pairingSent) {
      pairingSent = true;

      try {
        await new Promise(r => setTimeout(r, 3000));
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log("================================");
        console.log("PAIRING CODE:", code);
        console.log("================================");
      } catch (e) {
        console.log("PAIRING ERROR:", e.message);
      }
    }

    if (connection === "open") {
      console.log("✅ Uzima Baraka AI Connected!");
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
    if (sender !== PHONE_NUMBER) return;

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

startBot();

app.get("/", (_, res) => {
  res.send("Uzima Baraka AI + MsemwaFX Running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
