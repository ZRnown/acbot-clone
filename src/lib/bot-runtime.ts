import { ChildProcess, spawn } from "child_process";
import path from "path";

type RuntimeStatus = "starting" | "online" | "offline" | "error";

type RuntimeEntry = {
  process: ChildProcess;
  status: RuntimeStatus;
  error?: string;
  startedAt: string;
};

type WorkerMessage = {
  type?: "online" | "error" | "heartbeat";
  error?: string;
};

const globalRuntime = globalThis as typeof globalThis & {
  __kookBotRuntimes?: Map<string, RuntimeEntry>;
};

const runtimes = globalRuntime.__kookBotRuntimes
  || (globalRuntime.__kookBotRuntimes = new Map<string, RuntimeEntry>());

export function getBotRuntime(botId: string) {
  const runtime = runtimes.get(botId);
  if (!runtime) return { status: "offline" as RuntimeStatus };
  return {
    status: runtime.status,
    error: runtime.error,
    startedAt: runtime.startedAt,
    pid: runtime.process.pid,
  };
}

export async function startBotRuntime(botId: string, token: string) {
  const current = runtimes.get(botId);
  if (current && current.process.exitCode === null && !current.process.killed) {
    return getBotRuntime(botId);
  }
  if (current) runtimes.delete(botId);

  const workerPath = path.join(process.cwd(), "scripts", "kook-gateway-worker.js");
  const child = spawn(process.execPath, [workerPath], {
    cwd: process.cwd(),
    env: { ...process.env, KOOK_BOT_TOKEN: token, LOG_LEVEL: "warn" },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  const runtime: RuntimeEntry = {
    process: child,
    status: "starting",
    startedAt: new Date().toISOString(),
  };
  runtimes.set(botId, runtime);

  child.stdout?.on("data", (chunk) => console.log(`[KOOK ${botId}] ${String(chunk).trim()}`));
  child.stderr?.on("data", (chunk) => console.error(`[KOOK ${botId}] ${String(chunk).trim()}`));
  child.on("message", (message: WorkerMessage) => {
    if (message.type === "online") {
      runtime.status = "online";
      delete runtime.error;
    } else if (message.type === "error") {
      runtime.status = "error";
      runtime.error = message.error || "Gateway 连接失败";
    }
  });
  child.on("exit", (code, signal) => {
    if (runtimes.get(botId) !== runtime) return;
    runtime.status = code === 0 || signal === "SIGTERM" ? "offline" : "error";
    if (runtime.status === "error" && !runtime.error) {
      runtime.error = `Gateway 进程退出 (${code ?? signal ?? "unknown"})`;
    }
  });

  return new Promise<ReturnType<typeof getBotRuntime>>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (runtime.status === "online") resolve(getBotRuntime(botId));
      else reject(new Error(runtime.error || "KOOK Gateway 连接超时"));
    }, 20_000);
    const onMessage = (message: WorkerMessage) => {
      if (message.type === "online") {
        clearTimeout(timeout);
        child.off("message", onMessage);
        resolve(getBotRuntime(botId));
      } else if (message.type === "error") {
        clearTimeout(timeout);
        child.off("message", onMessage);
        reject(new Error(message.error || "KOOK Gateway 连接失败"));
      }
    };
    child.on("message", onMessage);
    child.once("exit", (code) => {
      if (runtime.status !== "online") {
        clearTimeout(timeout);
        reject(new Error(runtime.error || `KOOK Gateway 进程退出 (${code ?? "unknown"})`));
      }
    });
  });
}

export async function stopBotRuntime(botId: string) {
  const runtime = runtimes.get(botId);
  if (!runtime) return { status: "offline" as RuntimeStatus };
  runtimes.delete(botId);
  if (runtime.process.exitCode === null && !runtime.process.killed) {
    runtime.process.kill("SIGTERM");
  }
  return { status: "offline" as RuntimeStatus };
}
