import type { DirectorySnapshot, SourceFile } from "./fileSystem";
import type { InputRootMode, InspectorProject, ScreenEntry, UnityManifestSummary } from "../types";
import {
  getPathSegments,
  hashString,
  isSvgPath,
  normalizePath,
  parseNodeMeta,
  toFileName,
  tryGetRawIdFromFileName,
} from "./utils";

export interface ScreenSourceFile {
  screenId: string;
  screenName: string;
  relativePath: string;
  screenRelativePath: string;
  fileName: string;
  nodeId: string | null;
  nodeName: string;
  loadText: () => Promise<string>;
}

interface ScreenDefinition {
  key: string;
  name: string;
  folderPath: string;
}

export interface ScanResult {
  inputMode: InputRootMode;
  project: InspectorProject;
  sourceFiles: ScreenSourceFile[];
  filesByPath: Map<string, ScreenSourceFile>;
  filesByScreenId: Map<string, ScreenSourceFile[]>;
  allFilesByPath: Map<string, SourceFile>;
  storageKey: string;
}

export function buildInspectorProject(snapshot: DirectorySnapshot): ScanResult {
  const inputMode = detectInputMode(snapshot);
  const screenDefs = discoverScreenDefinitions(snapshot, inputMode);
  const svgByScreen = collectSvgFilesByScreen(snapshot.files, screenDefs);

  const screens: ScreenEntry[] = [];
  const screenIdByKey = new Map<string, string>();
  const usedIds = new Set<string>();

  for (const screenDef of screenDefs) {
    const svgFiles = [...(svgByScreen.get(screenDef.key) ?? [])].sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath, "ko"),
    );
    const rootFile = pickRootSvg(screenDef, svgFiles, inputMode);
    const rootFileName = rootFile ? toFileName(rootFile.relativePath) : null;
    const screenId = buildScreenId(screenDef.folderPath, rootFileName, usedIds);
    screenIdByKey.set(screenDef.key, screenId);

    const issues: string[] = [];
    if (svgFiles.length === 0) {
      issues.push("No SVG files found in this screen folder.");
    }
    if (svgFiles.length > 0 && !rootFile) {
      issues.push("Root SVG not found. A top-level screen SVG is required for preview.");
    }

    screens.push({
      id: screenId,
      name: screenDef.name,
      folderPath: screenDef.folderPath,
      rootSvgPath: rootFile ? normalizePath(rootFile.relativePath) : null,
      svgCount: svgFiles.length,
      reviewStatus: "pending",
      reviewNote: "",
      issues,
    });
  }

  const sourceFiles: ScreenSourceFile[] = [];
  for (const [screenKey, svgFiles] of svgByScreen) {
    const screenDef = screenDefs.find((item) => item.key === screenKey);
    const screenId = screenIdByKey.get(screenKey);
    if (!screenDef || !screenId) {
      continue;
    }

    const sorted = [...svgFiles].sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath, "ko"),
    );
    const prefix = `${screenDef.folderPath}/`;

    for (const source of sorted) {
      const relativePath = normalizePath(source.relativePath);
      const screenRelativePath = relativePath.startsWith(prefix)
        ? relativePath.slice(prefix.length)
        : relativePath;
      const fileName = toFileName(relativePath);
      const nodeMeta = parseNodeMeta(fileName);

      sourceFiles.push({
        screenId,
        screenName: screenDef.name,
        relativePath,
        screenRelativePath,
        fileName,
        nodeId: nodeMeta.nodeId,
        nodeName: nodeMeta.nodeName,
        loadText: source.loadText,
      });
    }
  }
  sourceFiles.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "ko"));

  const filesByPath = new Map<string, ScreenSourceFile>();
  const filesByScreenId = new Map<string, ScreenSourceFile[]>();
  for (const file of sourceFiles) {
    filesByPath.set(file.relativePath, file);
    if (!filesByScreenId.has(file.screenId)) {
      filesByScreenId.set(file.screenId, []);
    }
    filesByScreenId.get(file.screenId)?.push(file);
  }

  const allFilesByPath = new Map<string, SourceFile>();
  for (const file of snapshot.files) {
    allFilesByPath.set(normalizePath(file.relativePath), file);
  }

  const project: InspectorProject = {
    rootLabel: snapshot.rootLabel,
    selectedAt: snapshot.selectedAt,
    screens,
  };

  return {
    inputMode,
    project,
    sourceFiles,
    filesByPath,
    filesByScreenId,
    allFilesByPath,
    storageKey: buildStorageKey(snapshot.rootLabel, screens),
  };
}

export function summarizeProject(project: InspectorProject): UnityManifestSummary {
  let approved = 0;
  let hold = 0;
  let pending = 0;
  let svgTotal = 0;

  for (const screen of project.screens) {
    svgTotal += screen.svgCount;
    if (screen.reviewStatus === "approved") {
      approved += 1;
      continue;
    }
    if (screen.reviewStatus === "hold") {
      hold += 1;
      continue;
    }
    pending += 1;
  }

  return {
    screenTotal: project.screens.length,
    approved,
    hold,
    pending,
    svgTotal,
  };
}

function detectInputMode(snapshot: DirectorySnapshot): InputRootMode {
  const all = new Set<string>(snapshot.files.map((file) => normalizePath(file.relativePath)));
  if (all.has("_node_layout.json")) {
    return "export-root";
  }
  return "page-root";
}

function discoverScreenDefinitions(snapshot: DirectorySnapshot, inputMode: InputRootMode): ScreenDefinition[] {
  if (inputMode === "export-root") {
    return discoverExportRootScreens(snapshot);
  }
  return discoverPageRootScreens(snapshot);
}

function discoverPageRootScreens(snapshot: DirectorySnapshot): ScreenDefinition[] {
  const byKey = new Map<string, ScreenDefinition>();

  for (const directory of snapshot.directories) {
    const segments = getPathSegments(directory);
    if (segments.length === 1) {
      const key = segments[0];
      byKey.set(key, {
        key,
        name: segments[0],
        folderPath: segments[0],
      });
    }
  }

  for (const source of snapshot.files) {
    if (!isSvgPath(source.relativePath)) {
      continue;
    }
    const segments = getPathSegments(source.relativePath);
    if (segments.length < 2) {
      continue;
    }
    const key = segments[0];
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        name: segments[0],
        folderPath: segments[0],
      });
    }
  }

  return [...byKey.values()].sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

function discoverExportRootScreens(snapshot: DirectorySnapshot): ScreenDefinition[] {
  const byKey = new Map<string, ScreenDefinition>();

  for (const source of snapshot.files) {
    if (!isSvgPath(source.relativePath)) {
      continue;
    }
    const segments = getPathSegments(source.relativePath);
    if (segments.length < 3) {
      continue;
    }
    const pageName = segments[0];
    const screenName = segments[1];
    const key = `${pageName}/${screenName}`;
    if (byKey.has(key)) {
      continue;
    }
    byKey.set(key, {
      key,
      name: screenName,
      folderPath: key,
    });
  }

  return [...byKey.values()].sort((left, right) => left.folderPath.localeCompare(right.folderPath, "ko"));
}

function collectSvgFilesByScreen(
  files: SourceFile[],
  screenDefs: ScreenDefinition[],
): Map<string, SourceFile[]> {
  const grouped = new Map<string, SourceFile[]>();
  const validKeys = new Set<string>(screenDefs.map((item) => item.key));

  for (const source of files) {
    if (!isSvgPath(source.relativePath)) {
      continue;
    }
    const segments = getPathSegments(source.relativePath);
    if (segments.length < 2) {
      continue;
    }

    let screenKey: string | null = null;
    if (segments.length >= 3) {
      const exportKey = `${segments[0]}/${segments[1]}`;
      if (validKeys.has(exportKey)) {
        screenKey = exportKey;
      }
    }
    if (!screenKey && validKeys.has(segments[0])) {
      screenKey = segments[0];
    }
    if (!screenKey) {
      continue;
    }

    if (!grouped.has(screenKey)) {
      grouped.set(screenKey, []);
    }
    grouped.get(screenKey)?.push({
      ...source,
      relativePath: normalizePath(source.relativePath),
    });
  }

  return grouped;
}

function pickRootSvg(
  screenDef: ScreenDefinition,
  files: SourceFile[],
  inputMode: InputRootMode,
): SourceFile | null {
  if (files.length === 0) {
    return null;
  }

  const screenSegments = getPathSegments(screenDef.folderPath);
  const topLevel = files.filter((file) => {
    const segments = getPathSegments(file.relativePath);
    if (inputMode === "export-root") {
      return (
        segments.length === 3 &&
        segments[0] === screenSegments[0] &&
        segments[1] === screenSegments[1]
      );
    }
    return segments.length === 2 && segments[0] === screenSegments[0];
  });

  if (topLevel.length === 0) {
    return null;
  }

  const rootPrefix = `${screenDef.name}__`.toLowerCase();
  const exact = topLevel.find((file) =>
    toFileName(file.relativePath).toLowerCase().startsWith(rootPrefix),
  );
  if (exact) {
    return exact;
  }

  return [...topLevel].sort((left, right) => left.relativePath.localeCompare(right.relativePath, "ko"))[0];
}

function buildScreenId(screenFolderPath: string, rootFileName: string | null, usedIds: Set<string>): string {
  const fromRoot = rootFileName ? tryGetRawIdFromFileName(rootFileName) : null;
  const baseId = fromRoot ?? `hash-${hashString(screenFolderPath)}`;

  let candidate = baseId;
  let index = 2;
  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function buildStorageKey(rootLabel: string, screens: ScreenEntry[]): string {
  const seed = `${rootLabel}|${screens
    .map((screen) => `${screen.folderPath}:${screen.svgCount}`)
    .join("|")}`;
  return `svg-inspector:review:${hashString(seed)}`;
}
