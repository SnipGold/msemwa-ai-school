// Pairing Code
if (!sock.authState.creds.registered) {
  setTimeout(async () => {
    try {
      const code = await sock.requestPairingCode(MY_NUMBER);
      console.log("================================");
      console.log("PAIRING CODE:", code);
      console.log("================================");
    } catch (err) {
      console.error("PAIRING ERROR:", err);
    }
  }, 3000);
}
