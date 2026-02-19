import type {
  ExclusionManifest,
  ExclusionPreset,
  InspectorProject,
  NodeLayoutEntry,
  ScreenEntry,
  ScreenExclusion,
} from "../types";
import type { ScreenSourceFile } from "./scanner";
import { normalizePath } from "./utils";

const STORAGE_PREFIX = "svg-inspector:exclude:";

const DEVICE_CHROME_TERMS = [
  "status bar",
  "battery",
  "battery end",
  "mobile signal",
  "wifi",
  "home indicator",
];
const KEYBOARD_TERMS = ["keyboard"];

export const DEFAULT_EXCLUSION_PRESET: ExclusionPreset = {
  deviceChrome: false,
  keyboard: false,
};

export interface HydratedExclusionState {
  preset: ExclusionPreset;
  byScreenId: Record<string, ScreenExclusion>;
  warnings: string[];
}

export function buildExclusionStorageKey(scanStorageKey: string): string {
  return `${STORAGE_PREFIX}${scanStorageKey}`;
}

export function loadStoredExclusionState(scanStorageKey: string): ExclusionManifest | null {
  try {
    const raw = window.localStorage.getItem(buildExclusionStorageKey(scanStorageKey));
    if (!raw) {
      return null;
    }
    return parseExclusionManifest(raw);
  } catch {
    return null;
  }
}

export function saveStoredExclusionState(
  scanStorageKey: string,
  manifest: ExclusionManifest,
): void {
  try {
    window.localStorage.setItem(buildExclusionStorageKey(scanStorageKey), JSON.stringify(manifest));
  } catch {
    // localStorage may be unavailable.
  }
}

export function buildExclusionManifest(
  sourceRoot: string,
  preset: ExclusionPreset,
  screens: ScreenEntry[],
  byScreenId: Record<string, ScreenExclusion>,
): ExclusionManifest {
  const entries: ScreenExclusion[] = [];
  for (const screen of screens) {
    const item = byScreenId[screen.id];
    if (!item) {
      continue;
    }
    const excludedNodeIds = uniqueSortedStrings(item.excludedNodeIds);
    const excludedPaths = uniqueSortedPaths(item.excludedPaths);
    if (excludedNodeIds.length === 0 && excludedPaths.length === 0) {
      continue;
    }

    entries.push({
      screenId: screen.id,
      folderPath: screen.folderPath,
      excludedNodeIds,
      excludedPaths,
    });
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceRoot,
    preset: normalizePreset(preset),
    screens: entries,
  };
}

export function parseExclusionManifest(text: string): ExclusionManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid exclusions JSON format.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid exclusions manifest object.");
  }

  const candidate = parsed as Partial<ExclusionManifest>;
  if (candidate.version !== 1) {
    throw new Error("Unsupported exclusions manifest version. Expected version 1.");
  }
  if (!Array.isArray(candidate.screens)) {
    throw new Error("Exclusions manifest field 'screens' must be an array.");
  }

  return {
    version: 1,
    generatedAt:
      typeof candidate.generatedAt === "string" ? candidate.generatedAt : new Date().toISOString(),
    sourceRoot: typeof candidate.sourceRoot === "string" ? candidate.sourceRoot : "unknown",
    preset: normalizePreset(candidate.preset),
    screens: candidate.screens.map((item, index) => normalizeScreenExclusion(item, index)),
  };
}

export function hydrateExclusionState(
  project: InspectorProject,
  sourceFiles: ScreenSourceFile[],
  manifest: ExclusionManifest | null,
): HydratedExclusionState {
  const warnings: string[] = [];
  const byScreenId: Record<string, ScreenExclusion> = {};
  if (!manifest) {
    return {
      preset: { ...DEFAULT_EXCLUSION_PRESET },
      byScreenId,
      warnings,
    };
  }

  const screenById = new Map<string, ScreenEntry>();
  const screenIdByFolder = new Map<string, string>();
  for (const screen of project.screens) {
    screenById.set(screen.id, screen);
    screenIdByFolder.set(normalizePath(screen.folderPath), screen.id);
  }

  const validPathsByScreen = new Map<string, Set<string>>();
  const validNodeIdsByScreen = new Map<string, Set<string>>();
  for (const file of sourceFiles) {
    if (!validPathsByScreen.has(file.screenId)) {
      validPathsByScreen.set(file.screenId, new Set<string>());
    }
    validPathsByScreen.get(file.screenId)?.add(normalizePath(file.relativePath));

    if (file.nodeId) {
      if (!validNodeIdsByScreen.has(file.screenId)) {
        validNodeIdsByScreen.set(file.screenId, new Set<string>());
      }
      validNodeIdsByScreen.get(file.screenId)?.add(file.nodeId);
    }
  }

  for (const entry of manifest.screens) {
    const resolvedScreenId =
      (screenById.has(entry.screenId) ? entry.screenId : null) ??
      screenIdByFolder.get(normalizePath(entry.folderPath)) ??
      null;

    if (!resolvedScreenId) {
      warnings.push(`Dropped exclusions for missing screen '${entry.folderPath}'.`);
      continue;
    }

    const screen = screenById.get(resolvedScreenId);
    if (!screen) {
      continue;
    }

    const validPathSet = validPathsByScreen.get(resolvedScreenId) ?? new Set<string>();
    const validNodeSet = validNodeIdsByScreen.get(resolvedScreenId) ?? new Set<string>();

    const filteredPaths = uniqueSortedPaths(entry.excludedPaths).filter((path) => validPathSet.has(path));
    const filteredNodeIds = uniqueSortedStrings(entry.excludedNodeIds).filter((id) =>
      validNodeSet.has(id),
    );

    if (filteredPaths.length === 0 && filteredNodeIds.length === 0) {
      continue;
    }

    byScreenId[resolvedScreenId] = {
      screenId: resolvedScreenId,
      folderPath: screen.folderPath,
      excludedNodeIds: filteredNodeIds,
      excludedPaths: filteredPaths,
    };
  }

  return {
    preset: normalizePreset(manifest.preset),
    byScreenId,
    warnings,
  };
}

export function createEmptyScreenExclusion(screen: ScreenEntry): ScreenExclusion {
  return {
    screenId: screen.id,
    folderPath: screen.folderPath,
    excludedNodeIds: [],
    excludedPaths: [],
  };
}

export function matchesPresetForEntry(
  entry: NodeLayoutEntry,
  resolvedPath: string | null,
  preset: ExclusionPreset,
): boolean {
  const fallbackPath = normalizePath(resolvedPath ?? entry.relativePath ?? entry.zipPath);
  return matchesPresetForTexts(entry.nodeName, fallbackPath, preset);
}

export function matchesPresetForFile(
  nodeName: string,
  relativePath: string,
  preset: ExclusionPreset,
): boolean {
  return matchesPresetForTexts(nodeName, relativePath, preset);
}

function matchesPresetForTexts(
  nodeName: string,
  relativePath: string,
  preset: ExclusionPreset,
): boolean {
  const normalizedName = nodeName.toLowerCase();
  const normalizedPath = normalizePath(relativePath).toLowerCase();
  const text = `${normalizedName} ${normalizedPath}`;

  if (preset.deviceChrome && DEVICE_CHROME_TERMS.some((term) => text.includes(term))) {
    return true;
  }
  if (preset.keyboard && KEYBOARD_TERMS.some((term) => text.includes(term))) {
    return true;
  }
  return false;
}

function normalizeScreenExclusion(input: unknown, index: number): ScreenExclusion {
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid exclusion screen entry at index ${index}.`);
  }
  const item = input as Partial<ScreenExclusion>;
  if (typeof item.screenId !== "string") {
    throw new Error(`Exclusion entry ${index} is missing string field 'screenId'.`);
  }
  if (typeof item.folderPath !== "string") {
    throw new Error(`Exclusion entry ${index} is missing string field 'folderPath'.`);
  }

  return {
    screenId: item.screenId,
    folderPath: item.folderPath,
    excludedNodeIds: Array.isArray(item.excludedNodeIds)
      ? uniqueSortedStrings(item.excludedNodeIds.filter(isString))
      : [],
    excludedPaths: Array.isArray(item.excludedPaths)
      ? uniqueSortedPaths(item.excludedPaths.filter(isString))
      : [],
  };
}

function normalizePreset(input: unknown): ExclusionPreset {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_EXCLUSION_PRESET };
  }
  const candidate = input as Partial<ExclusionPreset>;
  return {
    deviceChrome: Boolean(candidate.deviceChrome),
    keyboard: Boolean(candidate.keyboard),
  };
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "ko"));
}

function uniqueSortedPaths(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizePath(value)))].sort((left, right) =>
    left.localeCompare(right, "ko"),
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
