import type { InspectorProject, ScreenEntry, UnityManifestSummary } from "../types";
import type { DirectorySnapshot, SourceFile } from "./fileSystem";
import { getPathSegments, hashString, isSvgPath, parseNodeMeta, toFileName, tryGetRawIdFromFileName } from "./utils";

export interface ScreenSourceFile {
  screenId: string;
  screenName: string;
  relativePath: string;
  fileName: string;
  nodeId: string | null;
  nodeName: string;
  loadText: () => Promise<string>;
}

export interface ScanResult {
  project: InspectorProject;
  sourceFiles: ScreenSourceFile[];
  filesByPath: Map<string, ScreenSourceFile>;
  filesByScreenId: Map<string, ScreenSourceFile[]>;
  storageKey: string;
}

export function buildInspectorProject(snapshot: DirectorySnapshot): ScanResult {
  const screenNames = discoverScreenFolders(snapshot);
  const svgByScreen = collectSvgFilesByScreen(snapshot.files);
  const usedIds = new Set<string>();
  const screenIdByName = new Map<string, string>();
  const screens: ScreenEntry[] = [];

  for (const screenName of screenNames) {
    const svgFiles = [...(svgByScreen.get(screenName) ?? [])].sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath, "ko"),
    );
    const rootFile = pickRootSvg(screenName, svgFiles);
    const rootFileName = rootFile ? toFileName(rootFile.relativePath) : null;
    const screenId = buildScreenId(screenName, rootFileName, usedIds);
    screenIdByName.set(screenName, screenId);

    const issues: string[] = [];
    if (svgFiles.length === 0) {
      issues.push("No SVG files found in this screen folder.");
    }
    if (svgFiles.length > 0 && !rootFile) {
      issues.push("Root SVG not found. A top-level screen SVG is required for preview.");
    }

    screens.push({
      id: screenId,
      name: screenName,
      folderPath: screenName,
      rootSvgPath: rootFile ? rootFile.relativePath : null,
      svgCount: svgFiles.length,
      reviewStatus: "pending",
      reviewNote: "",
      issues,
    });
  }

  const sourceFiles: ScreenSourceFile[] = [];
  for (const [screenName, svgFiles] of svgByScreen) {
    const screenId = screenIdByName.get(screenName);
    if (!screenId) {
      continue;
    }
    const sorted = [...svgFiles].sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath, "ko"),
    );
    for (const source of sorted) {
      const fileName = toFileName(source.relativePath);
      const nodeMeta = parseNodeMeta(fileName);
      sourceFiles.push({
        screenId,
        screenName,
        relativePath: source.relativePath,
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

  const project: InspectorProject = {
    rootLabel: snapshot.rootLabel,
    selectedAt: snapshot.selectedAt,
    screens,
  };

  return {
    project,
    sourceFiles,
    filesByPath,
    filesByScreenId,
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

function discoverScreenFolders(snapshot: DirectorySnapshot): string[] {
  const names = new Set<string>();

  for (const directory of snapshot.directories) {
    const segments = getPathSegments(directory);
    if (segments.length === 1) {
      names.add(segments[0]);
    }
  }

  for (const file of snapshot.files) {
    const segments = getPathSegments(file.relativePath);
    if (segments.length >= 2) {
      names.add(segments[0]);
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right, "ko"));
}

function collectSvgFilesByScreen(files: SourceFile[]): Map<string, SourceFile[]> {
  const grouped = new Map<string, SourceFile[]>();
  for (const source of files) {
    if (!isSvgPath(source.relativePath)) {
      continue;
    }
    const segments = getPathSegments(source.relativePath);
    if (segments.length < 2) {
      continue;
    }
    const screenName = segments[0];
    if (!grouped.has(screenName)) {
      grouped.set(screenName, []);
    }
    grouped.get(screenName)?.push(source);
  }
  return grouped;
}

function pickRootSvg(screenName: string, files: SourceFile[]): SourceFile | null {
  if (files.length === 0) {
    return null;
  }

  const topLevel = files.filter((file) => {
    const segments = getPathSegments(file.relativePath);
    return segments.length === 2 && segments[0] === screenName;
  });

  if (topLevel.length === 0) {
    return null;
  }

  const rootPrefix = `${screenName}__`.toLowerCase();
  const exact = topLevel.find((file) => toFileName(file.relativePath).toLowerCase().startsWith(rootPrefix));
  if (exact) {
    return exact;
  }

  return [...topLevel].sort((left, right) => left.relativePath.localeCompare(right.relativePath, "ko"))[0];
}

function buildScreenId(screenName: string, rootFileName: string | null, usedIds: Set<string>): string {
  const fromRoot = rootFileName ? tryGetRawIdFromFileName(rootFileName) : null;
  const baseId = fromRoot ?? `hash-${hashString(screenName)}`;

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
