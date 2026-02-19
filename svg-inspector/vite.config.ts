import { spawn } from "node:child_process";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

interface OpenExplorerPayload {
  rootLabel?: unknown;
  relativePath?: unknown;
  alwaysNewWindow?: unknown;
}

interface OpenExplorerResponse {
  ok: boolean;
  message: string;
}

type NextFunction = (error?: unknown) => void;

const APP_ROOT = fileURLToPath(new URL(".", import.meta.url));
const WORKSPACE_ROOT = path.resolve(APP_ROOT, "..");

function explorerBridgePlugin(): Plugin {
  return {
    name: "explorer-bridge",
    configureServer(server) {
      server.middlewares.use("/api/open-in-explorer", (req, res, next) => {
        void handleOpenInExplorer(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/open-in-explorer", (req, res, next) => {
        void handleOpenInExplorer(req, res, next);
      });
    },
  };
}

async function handleOpenInExplorer(
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, message: "Use POST." });
      return;
    }

    if (process.platform !== "win32") {
      writeJson(res, 400, { ok: false, message: "Explorer bridge is available only on Windows." });
      return;
    }

    const payload = await readJsonBody(req);
    if (!isRecord(payload)) {
      writeJson(res, 400, { ok: false, message: "Invalid JSON payload." });
      return;
    }

    const rootLabel = typeof payload.rootLabel === "string" ? payload.rootLabel.trim() : "";
    const relativePath = typeof payload.relativePath === "string" ? payload.relativePath.trim() : "";
    const alwaysNewWindow = payload.alwaysNewWindow === true;
    if (!rootLabel || !relativePath) {
      writeJson(res, 400, { ok: false, message: "Both rootLabel and relativePath are required." });
      return;
    }

    if (hasUnsafeRootLabel(rootLabel)) {
      writeJson(res, 400, { ok: false, message: "Unsafe rootLabel." });
      return;
    }

    const rootPath = resolveRootPath(rootLabel);
    if (!rootPath) {
      writeJson(res, 404, {
        ok: false,
        message: `Root folder '${rootLabel}' was not found under workspace.`,
      });
      return;
    }

    const targetPath = path.resolve(rootPath, relativePath);
    if (!isSubPath(rootPath, targetPath)) {
      writeJson(res, 400, { ok: false, message: "Path traversal is not allowed." });
      return;
    }

    if (!fs.existsSync(targetPath)) {
      writeJson(res, 404, { ok: false, message: `File not found: ${relativePath}` });
      return;
    }

    const openedFolder = openExplorer(targetPath, alwaysNewWindow);

    writeJson(
      res,
      200,
      {
        ok: true,
        message: `Opened folder: ${openedFolder}`,
      },
    );
  } catch (error) {
    next(error);
  }
}

function openExplorer(targetPath: string, alwaysNewWindow: boolean): string {
  // Always open the containing folder (not file selection).
  const stat = fs.statSync(targetPath);
  const folderPath = stat.isDirectory() ? targetPath : path.dirname(targetPath);
  const resolvedFolderPath = fs.realpathSync(folderPath);

  if (alwaysNewWindow) {
    // Use shell `start` to encourage opening a fresh foreground window.
    // `start` grammar: start "" <path>
    const child = spawn("cmd.exe", ["/c", "start", "", resolvedFolderPath], {
      detached: false,
      stdio: "ignore",
      windowsHide: false,
    });
    child.unref();
    return resolvedFolderPath;
  }

  const child = spawn("explorer.exe", [resolvedFolderPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
  return resolvedFolderPath;
}

function resolveRootPath(rootLabel: string): string | null {
  const candidates = [path.resolve(WORKSPACE_ROOT, rootLabel), path.resolve(APP_ROOT, rootLabel)];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return null;
}

function hasUnsafeRootLabel(rootLabel: string): boolean {
  return rootLabel.includes("..") || rootLabel.includes("/") || rootLabel.includes("\\");
}

function isSubPath(rootPath: string, targetPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function writeJson(res: ServerResponse, statusCode: number, payload: OpenExplorerResponse): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonBody(req: IncomingMessage): Promise<OpenExplorerPayload | null> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
      continue;
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return null;
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw) as OpenExplorerPayload;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), explorerBridgePlugin()],
});
