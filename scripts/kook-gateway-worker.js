const Kasumi = require("kasumi.js").default;

const token = process.env.KOOK_BOT_TOKEN;
if (!token) {
  if (process.send) process.send({ type: "error", error: "缺少 KOOK Bot Token" });
  process.exit(1);
}

const client = new Kasumi({ type: "websocket", token }, false, false);
let connected = false;

// Kasumi switches away from webhook mode by calling /user/offline before opening
// the gateway. On current KOOK this leaves the bot presence offline, so keep the
// SDK's gateway/heartbeat implementation but skip that obsolete transition.
client.API.user.offline = async () => ({ data: undefined, err: undefined });

async function getOnlineStatus() {
  const response = await fetch("https://www.kookapp.cn/api/v3/user/get-online-status", {
    headers: { Authorization: `Bot ${token}` },
  });
  const body = await response.json();
  return body.code === 0 && body.data?.online === true;
}

client.on("connect.websocket", async (event) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await getOnlineStatus()) {
      connected = true;
      if (process.send) {
        process.send({
          type: "online",
          bot: event.bot,
          sessionId: event.sessionId,
        });
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (process.send) process.send({ type: "error", error: "Gateway 已连接，但 KOOK 在线状态接口仍报告机器人离线" });
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
