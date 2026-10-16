// Runs the API server and the Vite dev server together. Ctrl+C stops both.
import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const procs = [
  // The API always gets port 3001 to match the Vite proxy, even if PORT is set in the environment.
  ["api", ["run", "dev", "-w", "server"], "\x1b[33m", { PORT: "3001" }],
  ["web", ["run", "dev", "-w", "client"], "\x1b[36m", {}],
].map(([name, args, color, env]) => {
  const p = spawn(npm, args, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
  const tag = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on("data", (d) =>
      String(d)
        .split("\n")
        .filter(Boolean)
        .forEach((line) => out.write(tag + line + "\n"))
    );
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on("exit", (code) => {
    console.log(`${tag}exited (${code})`);
    shutdown(code ?? 0);
  });
  return p;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  procs.forEach((p) => p.kill("SIGINT"));
  setTimeout(() => process.exit(code), 300);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
