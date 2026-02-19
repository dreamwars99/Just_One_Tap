import type { SourceFile } from "./fileSystem";
import type {
  CompositeMode,
  FailedExportEntry,
  InputRootMode,
  NodeLayoutBBox,
  NodeLayoutEntry,
  NodeLayoutManifest,
  NodeLayoutScreen,
  ScreenEntry,
} from "../types";
import { getPathSegments, normalizePath } from "./utils";

export interface LoadedAuxData {
  layoutManifest: NodeLayoutManifest | null;
  failedEntries: FailedExportEntry[];
  warnings: string[];
}

export interface ScreenLayoutSelection {
  entries: NodeLayoutEntry[];
  screenMeta: NodeLayoutScreen | null;
  issues: string[];
  matchedBy: "root-path" | "folder" | "none";
}

export async function loadAuxiliaryData(
  allFilesByPath: Map<string, SourceFile>,
): Promise<LoadedAuxData> {
  const warnings: string[] = [];
  let layoutManifest: NodeLayoutManifest | null = null;
  let failedEntries: FailedExportEntry[] = [];

  const layoutSource = allFilesByPath.get("_node_layout.json");
  if (layoutSource) {
    try {
      layoutManifest = parseNodeLayoutManifest(await layoutSource.loadText());
    } catch (error) {
      warnings.push(`Failed to parse _node_layout.json: ${toErrorMessage(error)}`);
    }
  }

  const failedSource = allFilesByPath.get("_failed.json");
  if (failedSource) {
    try {
      failedEntries = parseFailedEntries(await failedSource.loadText());
    } catch (error) {
      warnings.push(`Failed to parse _failed.json: ${toErrorMessage(error)}`);
    }
  }

  return {
    layoutManifest,
    failedEntries,
    warnings,
  };
}

export function selectScreenLayout(
  screen: ScreenEntry,
  manifest: NodeLayoutManifest,
  mode: CompositeMode,
  inputMode: InputRootMode,
): ScreenLayoutSelection {
  if (manifest.entries.length === 0) {
    return {
      entries: [],
      screenMeta: null,
      issues: ["Layout manifest has no entries."],
      matchedBy: "none",
    };
  }

  const issues: string[] = [];
  const rootPath = screen.rootSvgPath ? normalizePath(screen.rootSvgPath) : null;
  let selected: NodeLayoutEntry[] = [];
  let screenMeta: NodeLayoutScreen | null = null;
  let matchedBy: ScreenLayoutSelection["matchedBy"] = "none";

  if (rootPath) {
    const rootEntry = manifest.entries.find((entry) => {
      const zipPath = normalizePath(entry.zipPath);
      const relativePath = normalizePath(entry.relativePath);
      return zipPath === rootPath || relativePath === rootPath;
    });

    if (rootEntry) {
      selected = manifest.entries.filter(
        (entry) =>
          entry.screenRootId === rootEntry.screenRootId &&
          entry.pageName === rootEntry.pageName,
      );
      screenMeta =
        manifest.screens.find(
          (item) =>
            item.screenRootId === rootEntry.screenRootId &&
            item.pageName === rootEntry.pageName,
        ) ?? null;
      matchedBy = "root-path";
    }
  }

  if (selected.length === 0) {
    const fallback = selectByFolder(screen, manifest, inputMode);
    selected = fallback.entries;
    screenMeta = fallback.screenMeta;
    matchedBy = fallback.entries.length > 0 ? "folder" : "none";
    issues.push(...fallback.issues);
  }

  if (selected.length === 0) {
    issues.push("No matching layout entries for this screen.");
    return {
      entries: [],
      screenMeta,
      issues,
      matchedBy,
    };
  }

  const filtered = mode === "leaf" ? selected.filter((entry) => entry.isLeaf) : selected;
  if (mode === "leaf" && filtered.length === 0) {
    issues.push("No leaf entries found in this screen layout.");
  }
  if (mode === "all" && selected.some((entry) => !entry.isLeaf)) {
    issues.push(
      "All mode includes parent and child exports together, so overlap differences from root SVG are expected.",
    );
  }

  return {
    entries: [...filtered].sort((left, right) => left.zIndex - right.zIndex),
    screenMeta,
    issues,
    matchedBy,
  };
}

export function parseNodeLayoutManifest(text: string): NodeLayoutManifest {
  const parsed = safeParseJson(text, "Invalid _node_layout.json format.");
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Layout manifest must be an object.");
  }

  const candidate = parsed as Partial<NodeLayoutManifest>;
  if (candidate.version !== 1) {
    throw new Error("Unsupported _node_layout.json version. Expected version 1.");
  }
  if (!Array.isArray(candidate.entries)) {
    throw new Error("Layout manifest field 'entries' must be an array.");
  }
  if (!Array.isArray(candidate.screens)) {
    throw new Error("Layout manifest field 'screens' must be an array.");
  }

  return {
    version: 1,
    generatedAt:
      typeof candidate.generatedAt === "string" ? candidate.generatedAt : new Date().toISOString(),
    fileName: typeof candidate.fileName === "string" ? candidate.fileName : "unknown",
    scope: typeof candidate.scope === "string" ? candidate.scope : "unknown",
    entries: candidate.entries.map((entry, index) => normalizeLayoutEntry(entry, index)),
    screens: candidate.screens.map((screen, index) => normalizeLayoutScreen(screen, index)),
  };
}

export function parseFailedEntries(text: string): FailedExportEntry[] {
  const parsed = safeParseJson(text, "Invalid _failed.json format.");
  if (!Array.isArray(parsed)) {
    throw new Error("_failed.json must be an array.");
  }

  return parsed.map((item, index) => normalizeFailedEntry(item, index));
}

function selectByFolder(
  screen: ScreenEntry,
  manifest: NodeLayoutManifest,
  inputMode: InputRootMode,
): Omit<ScreenLayoutSelection, "matchedBy"> {
  const issues: string[] = [];
  const folderSegments = getPathSegments(screen.folderPath);
  let candidates: NodeLayoutEntry[] = [];

  if (inputMode === "export-root" && folderSegments.length >= 2) {
    const pageName = folderSegments[0];
    const screenFolder = folderSegments[1];
    candidates = manifest.entries.filter(
      (entry) => entry.pageName === pageName && entry.screenFolder === screenFolder,
    );
  } else {
    const screenFolder = folderSegments[folderSegments.length - 1] ?? screen.folderPath;
    candidates = manifest.entries.filter((entry) => entry.screenFolder === screenFolder);
  }

  if (candidates.length === 0) {
    return {
      entries: [],
      screenMeta: null,
      issues,
    };
  }

  const grouped = new Map<string, NodeLayoutEntry[]>();
  for (const entry of candidates) {
    const key = `${entry.pageName}::${entry.screenRootId}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)?.push(entry);
  }

  const buckets = [...grouped.values()].sort((left, right) => right.length - left.length);
  if (buckets.length > 1) {
    issues.push(
      `Multiple layout groups matched by folder. Picked largest group (${buckets[0].length} entries).`,
    );
  }

  const selected = buckets[0];
  const first = selected[0];
  const screenMeta =
    manifest.screens.find(
      (item) =>
        item.screenRootId === first.screenRootId && item.pageName === first.pageName,
    ) ?? null;

  return {
    entries: selected,
    screenMeta,
    issues,
  };
}

function normalizeLayoutEntry(input: unknown, index: number): NodeLayoutEntry {
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid layout entry at index ${index}.`);
  }

  const item = input as Partial<NodeLayoutEntry>;
  if (typeof item.nodeId !== "string") {
    throw new Error(`Layout entry ${index} is missing 'nodeId'.`);
  }
  if (typeof item.nodeName !== "string") {
    throw new Error(`Layout entry ${index} is missing 'nodeName'.`);
  }
  if (typeof item.nodeType !== "string") {
    throw new Error(`Layout entry ${index} is missing 'nodeType'.`);
  }
  if (typeof item.pageName !== "string") {
    throw new Error(`Layout entry ${index} is missing 'pageName'.`);
  }
  if (typeof item.screenRootId !== "string") {
    throw new Error(`Layout entry ${index} is missing 'screenRootId'.`);
  }
  if (typeof item.screenFolder !== "string") {
    throw new Error(`Layout entry ${index} is missing 'screenFolder'.`);
  }
  if (typeof item.zipPath !== "string") {
    throw new Error(`Layout entry ${index} is missing 'zipPath'.`);
  }
  if (typeof item.relativePath !== "string") {
    throw new Error(`Layout entry ${index} is missing 'relativePath'.`);
  }

  return {
    nodeId: item.nodeId,
    parentId: typeof item.parentId === "string" ? item.parentId : null,
    nodeName: item.nodeName,
    nodeType: item.nodeType,
    pageName: item.pageName,
    screenRootId: item.screenRootId,
    screenFolder: item.screenFolder,
    isLeaf: Boolean(item.isLeaf),
    depth: Number.isFinite(item.depth) ? Number(item.depth) : 0,
    zIndex: Number.isFinite(item.zIndex) ? Number(item.zIndex) : index,
    bbox: normalizeBBox(item.bbox),
    zipPath: normalizePath(item.zipPath),
    relativePath: normalizePath(item.relativePath),
    issues: Array.isArray(item.issues) ? item.issues.filter(isString) : undefined,
  };
}

function normalizeLayoutScreen(input: unknown, index: number): NodeLayoutScreen {
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid layout screen at index ${index}.`);
  }

  const item = input as Partial<NodeLayoutScreen>;
  if (typeof item.pageName !== "string") {
    throw new Error(`Layout screen ${index} is missing 'pageName'.`);
  }
  if (typeof item.screenRootId !== "string") {
    throw new Error(`Layout screen ${index} is missing 'screenRootId'.`);
  }
  if (typeof item.screenFolder !== "string") {
    throw new Error(`Layout screen ${index} is missing 'screenFolder'.`);
  }

  return {
    pageName: item.pageName,
    screenRootId: item.screenRootId,
    screenFolder: item.screenFolder,
    bbox: normalizeBBox(item.bbox),
    issues: Array.isArray(item.issues) ? item.issues.filter(isString) : undefined,
  };
}

function normalizeFailedEntry(input: unknown, index: number): FailedExportEntry {
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid failed entry at index ${index}.`);
  }
  const item = input as Partial<FailedExportEntry>;

  return {
    id: typeof item.id === "string" ? item.id : `unknown-${index}`,
    name: typeof item.name === "string" ? item.name : "unknown",
    type: typeof item.type === "string" ? item.type : "unknown",
    path: typeof item.path === "string" ? normalizePath(item.path) : "",
    reason: typeof item.reason === "string" ? item.reason : "unknown",
  };
}

function normalizeBBox(input: unknown): NodeLayoutBBox | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const bbox = input as Partial<NodeLayoutBBox>;
  const x = Number(bbox.x);
  const y = Number(bbox.y);
  const width = Number(bbox.width);
  const height = Number(bbox.height);
  if (![x, y, width, height].every((value) => Number.isFinite(value))) {
    return null;
  }
  return { x, y, width, height };
}

function safeParseJson(text: string, errorMessage: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(errorMessage);
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
