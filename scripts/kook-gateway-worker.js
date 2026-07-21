const Kasumi = require("kasumi.js").default;

const token = process.env.KOOK_BOT_TOKEN;
if (!token) {
  if (process.send) process.send({ type: "error", error: "缺少 KOOK Bot Token" });
  process.exit(1);
}

const client = new Kasumi({ type: "websocket", token }, false, false);
let connected = false;

client.on("connect.websocket", (event) => {
  connected = true;
  if (process.send) {
    process.send({
      type: "online",
      bot: event.bot,
      sessionId: event.sessionId,
    });
  }
});

const shutdown = () => process.exit(0);
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("disconnect", shutdown);
process.on("uncaughtException", (error) => {
  if (process.send) process.send({ type: "error", error: error.message });
  process.exit(1);
});
process.on("unhandledRejection", (error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (process.send) process.send({ type: "error", error: message });
  process.exit(1);
});

client.connect().catch((error) => {
  if (process.send) process.send({ type: "error", error: error.message });
  process.exit(1);
});

setInterval(() => {
  if (process.send) process.send({ type: "heartbeat", connected });
}, 15_000).unref();
