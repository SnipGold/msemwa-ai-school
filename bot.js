import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const { Client, LocalAuth } = pkg;

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on("qr", (qr) => {
  console.log("Scan QR hii kwenye Console:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp imeunganishwa.");
});

client.on("message", async (message) => {
  if (message.fromMe) return;

  await message.reply("Habari! Msemwa AI imepokea ujumbe wako.");
});

client.initialize();
