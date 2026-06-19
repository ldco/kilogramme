/**
 * Kilo agent plugin for Ralph TUI.
 * Wraps `kilo run` for non-interactive autonomous task execution.
 *
 * Install: ~/.config/ralph-tui/plugins/agents/kilo.js
 * Configure: ~/.config/ralph-tui/config.toml [[agents]]
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const MAX_EXECUTION_STREAM_CHARS = 2_000_000;
const STREAM_TRUNCATED_PREFIX = "[...agent output truncated in memory...]\n";

function appendWithCharLimit(current, chunk, maxChars, prefix) {
  if (current.length + chunk.length <= maxChars) return current + chunk;
  const total = current.length + chunk.length;
  const charsToDrop = total - maxChars + prefix.length;
  if (charsToDrop >= current.length) return prefix + chunk.slice(charsToDrop - current.length);
  return prefix + current.slice(charsToDrop) + chunk;
}

function findCommandPath(command) {
  return new Promise((resolve) => {
    const proc = spawn("which", [command], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.on("error", () => resolve({ found: false, path: "" }));
    proc.on("close", (code) => {
      if (code === 0 && stdout.trim()) resolve({ found: true, path: stdout.trim() });
      else resolve({ found: false, path: "" });
    });
    setTimeout(() => { proc.kill(); resolve({ found: false, path: "" }); }, 15000);
  });
}

class KiloAgentPlugin {
  constructor() {
    this.meta = {
      id: "kilo",
      name: "Kilo",
      description: "Kilo CLI for AI-assisted coding (DeepSeek-powered)",
      version: "1.0.0",
      author: "Kilo",
      defaultCommand: "kilo",
      supportsStreaming: true,
      supportsInterrupt: true,
      supportsFileContext: false,
      supportsSubagentTracing: false,
      structuredOutputFormat: undefined,
      skillsPaths: {
        personal: "~/.kilo/skills",
        repo: ".kilo/skills",
      },
    };

    this.config = {};
    this.ready = false;
    this.commandPath = undefined;
    this.model = undefined;
    this.thinking = true;
    this.defaultTimeout = 0;
    this.executions = new Map();
    this.currentExecutionId = undefined;
  }

  async initialize(config) {
    this.config = config;
    if (typeof config.command === "string") this.commandPath = config.command;
    if (typeof config.model === "string" && config.model.length > 0) this.model = config.model;
    if (typeof config.thinking === "boolean") this.thinking = config.thinking;
    if (typeof config.timeout === "number" && config.timeout > 0) this.defaultTimeout = config.timeout;
    this.ready = true;
  }

  async isReady() {
    return this.ready;
  }

  async detect() {
    const command = this.commandPath ?? this.meta.defaultCommand;
    const result = await findCommandPath(command);
    if (!result.found) {
      return { available: false, error: `kilo not found in PATH. Install: npm install -g @anthropic-ai/kilo` };
    }
    return new Promise((resolve) => {
      const proc = spawn(result.path, ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (d) => (stdout += d.toString()));
      proc.stderr?.on("data", (d) => (stderr += d.toString()));
      proc.on("error", (e) => resolve({ available: false, error: e.message }));
      proc.on("close", (code) => {
        if (code === 0) {
          const m = stdout.match(/(\d+\.\d+\.\d+)/);
          this.commandPath = result.path;
          resolve({ available: true, version: m?.[1], executablePath: result.path });
        } else {
          resolve({ available: false, error: stderr || `exit ${code}` });
        }
      });
      setTimeout(() => { proc.kill(); resolve({ available: false, error: "Timeout" }); }, 15000);
    });
  }

  getSandboxRequirements() {
    return { authPaths: ["~/.kilo", "~/.config/kilo"], binaryPaths: [], runtimePaths: [], requiresNetwork: true };
  }

  buildArgs(_prompt, _files, _options) {
    const args = ["run"];

    args.push("--dangerously-skip-permissions");

    if (this.model) args.push("--model", this.model);

    if (this.thinking) args.push("--thinking");

    args.push("--format", "json");

    return args;
  }

  getStdinInput(prompt, _files, _options) {
    return prompt;
  }

  execute(prompt, files, options) {
    const executionId = randomUUID();
    const command = this.commandPath ?? this.meta.defaultCommand;
    const args = this.buildArgs(prompt, files, options);
    const startedAt = new Date();
    const timeout = options?.timeout ?? this.defaultTimeout;

    let resolvePromise, rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const proc = spawn(command, args, {
      cwd: options?.cwd ?? process.cwd(),
      env: { ...process.env, ...options?.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdinInput = this.getStdinInput(prompt, files, options);
    if (stdinInput !== undefined && proc.stdin) {
      proc.stdin.write(stdinInput);
      proc.stdin.end();
    } else if (proc.stdin) {
      proc.stdin.end();
    }

    const execution = {
      executionId,
      process: proc,
      startedAt,
      stdout: "",
      stderr: "",
      interrupted: false,
      resolve: resolvePromise,
      reject: rejectPromise,
      options,
    };

    this.executions.set(executionId, execution);
    this.currentExecutionId = executionId;
    options?.onStart?.(executionId);

    proc.stdout?.on("data", (data) => {
      const text = data.toString();
      execution.stdout = appendWithCharLimit(execution.stdout, text, MAX_EXECUTION_STREAM_CHARS, STREAM_TRUNCATED_PREFIX);
      options?.onStdout?.(text);
    });

    proc.stderr?.on("data", (data) => {
      const text = data.toString();
      execution.stderr = appendWithCharLimit(execution.stderr, text, MAX_EXECUTION_STREAM_CHARS, STREAM_TRUNCATED_PREFIX);
      options?.onStderr?.(text);
    });

    proc.on("error", (error) => {
      this._complete(executionId, "failed", undefined, error.message);
    });

    proc.on("close", (code) => {
      let status;
      if (execution.interrupted) status = "interrupted";
      else if (code === 0) status = "completed";
      else status = "failed";
      this._complete(executionId, status, code ?? undefined);
    });

    if (timeout > 0) {
      setTimeout(() => {
        if (this.executions.has(executionId)) {
          proc.kill("SIGTERM");
          setTimeout(() => { if (this.executions.has(executionId)) proc.kill("SIGKILL"); }, 5000);
        }
      }, timeout);
    }

    return {
      executionId,
      promise,
      interrupt: () => this.interrupt(executionId),
      isRunning: () => this.executions.has(executionId),
    };
  }

  _complete(executionId, status, exitCode, error) {
    const execution = this.executions.get(executionId);
    if (!execution) return;
    if (execution.timeoutId) clearTimeout(execution.timeoutId);
    const endedAt = new Date();
    const result = {
      executionId,
      status,
      exitCode,
      stdout: execution.stdout,
      stderr: execution.stderr,
      durationMs: endedAt.getTime() - execution.startedAt.getTime(),
      error,
      interrupted: execution.interrupted,
      startedAt: execution.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
    };
    this.executions.delete(executionId);
    if (this.currentExecutionId === executionId) this.currentExecutionId = undefined;
    execution.options?.onEnd?.(result);
    execution.resolve(result);
  }

  interrupt(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) return false;
    execution.interrupted = true;
    execution.process.kill("SIGTERM");
    setTimeout(() => { if (this.executions.has(executionId)) execution.process.kill("SIGKILL"); }, 5000);
    return true;
  }

  interruptAll() {
    for (const id of this.executions.keys()) this.interrupt(id);
  }

  getCurrentExecution() {
    if (!this.currentExecutionId) return undefined;
    const execution = this.executions.get(this.currentExecutionId);
    if (!execution) return undefined;
    return {
      executionId: this.currentExecutionId,
      promise: new Promise((resolve, reject) => { execution.resolve = resolve; execution.reject = reject; }),
      interrupt: () => this.interrupt(this.currentExecutionId),
      isRunning: () => this.executions.has(this.currentExecutionId),
    };
  }

  getSetupQuestions() {
    return [
      { id: "command", prompt: "Path to kilo executable:", type: "path", default: "kilo", required: false, help: "Leave empty to use PATH" },
      { id: "model", prompt: "Model (provider/model format):", type: "text", default: "deepseek/deepseek-v4-pro", required: false, help: "e.g. deepseek/deepseek-v4-pro" },
      { id: "thinking", prompt: "Show thinking blocks?", type: "boolean", default: true, required: false, help: "Display AI reasoning in output" },
      { id: "timeout", prompt: "Default execution timeout (seconds):", type: "text", default: "0", required: false, pattern: "^\\d+$", help: "0 = no timeout" },
    ];
  }

  async validateSetup(_answers) { return null; }

  validateModel(_model) { return null; }

  listModels() { return []; }

  async preflight(options) {
    const startTime = Date.now();
    const timeout = options?.timeout ?? 30000;
    try {
      const detection = await this.detect();
      if (!detection.available) return { success: false, error: detection.error ?? "kilo not available", durationMs: Date.now() - startTime };
      const handle = this.execute("Respond with exactly: PREFLIGHT_OK", [], { timeout, onStdout: () => {}, onStderr: () => {} });
      const result = await handle.promise;
      if (result.status === "completed") return { success: true, durationMs: Date.now() - startTime };
      return { success: false, error: result.error ?? "preflight failed", durationMs: Date.now() - startTime };
    } catch (e) {
      return { success: false, error: e.message, durationMs: Date.now() - startTime };
    }
  }

  async dispose() { this.interruptAll(); this.ready = false; }
}

export default () => new KiloAgentPlugin();
