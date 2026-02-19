import type {
  InspectorProject,
  ReviewStatus,
  UnityManifest,
  UnityManifestFile,
  UnityManifestScreen,
} from "../types";
import type { ScreenSourceFile } from "./scanner";
import { summarizeProject } from "./scanner";

export function buildUnityManifest(
  project: InspectorProject,
  sourceFiles: ScreenSourceFile[],
): UnityManifest {
  const files: UnityManifestFile[] = sourceFiles.map((file) => ({
    screenId: file.screenId,
    relativePath: file.relativePath,
    nodeId: file.nodeId,
    nodeName: file.nodeName,
  }));

  const screens: UnityManifestScreen[] = project.screens.map((screen) => ({
    id: screen.id,
    name: screen.name,
    folderPath: screen.folderPath,
    rootSvgPath: screen.rootSvgPath,
    svgCount: screen.svgCount,
    reviewStatus: screen.reviewStatus,
    reviewNote: screen.reviewNote,
    issues: [...screen.issues],
  }));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceRoot: project.rootLabel,
    summary: summarizeProject(project),
    screens,
    files,
  };
}

export function parseUnityManifest(text: string): UnityManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON format.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid manifest object.");
  }

  const rawManifest = parsed as Partial<UnityManifest>;
  if (rawManifest.version !== 1) {
    throw new Error("Unsupported manifest version. Expected version 1.");
  }
  if (!Array.isArray(rawManifest.screens)) {
    throw new Error("Manifest field 'screens' must be an array.");
  }
  if (!Array.isArray(rawManifest.files)) {
    throw new Error("Manifest field 'files' must be an array.");
  }

  const screens: UnityManifestScreen[] = rawManifest.screens.map((item) => normalizeManifestScreen(item));
  const files: UnityManifestFile[] = rawManifest.files.map((item) => normalizeManifestFile(item));

  return {
    version: 1,
    generatedAt:
      typeof rawManifest.generatedAt === "string" ? rawManifest.generatedAt : new Date().toISOString(),
    sourceRoot: typeof rawManifest.sourceRoot === "string" ? rawManifest.sourceRoot : "unknown",
    summary: rawManifest.summary ?? summarizeFromScreens(screens),
    screens,
    files,
  };
}

export function applyManifestReviews(
  project: InspectorProject,
  manifest: UnityManifest,
): InspectorProject {
  const byId = new Map<string, UnityManifestScreen>();
  const byFolderPath = new Map<string, UnityManifestScreen>();

  for (const screen of manifest.screens) {
    byId.set(screen.id, screen);
    byFolderPath.set(screen.folderPath, screen);
  }

  return {
    ...project,
    screens: project.screens.map((screen) => {
      const matched = byId.get(screen.id) ?? byFolderPath.get(screen.folderPath);
      if (!matched) {
        return screen;
      }
      return {
        ...screen,
        reviewStatus: matched.reviewStatus,
        reviewNote: matched.reviewNote,
      };
    }),
  };
}

export function buildReviewCsv(project: InspectorProject): string {
  const header = [
    "id",
    "name",
    "folderPath",
    "rootSvgPath",
    "svgCount",
    "reviewStatus",
    "reviewNote",
    "issueCount",
    "issues",
  ];

  const rows = project.screens.map((screen) => [
    screen.id,
    screen.name,
    screen.folderPath,
    screen.rootSvgPath ?? "",
    String(screen.svgCount),
    screen.reviewStatus,
    screen.reviewNote,
    String(screen.issues.length),
    screen.issues.join(" | "),
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function normalizeManifestScreen(input: unknown): UnityManifestScreen {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid screen entry in manifest.");
  }
  const candidate = input as Partial<UnityManifestScreen>;
  if (typeof candidate.id !== "string") {
    throw new Error("Manifest screen is missing string field 'id'.");
  }
  if (typeof candidate.name !== "string") {
    throw new Error(`Manifest screen '${candidate.id}' is missing string field 'name'.`);
  }
  if (typeof candidate.folderPath !== "string") {
    throw new Error(`Manifest screen '${candidate.id}' is missing string field 'folderPath'.`);
  }

  return {
    id: candidate.id,
    name: candidate.name,
    folderPath: candidate.folderPath,
    rootSvgPath: typeof candidate.rootSvgPath === "string" ? candidate.rootSvgPath : null,
    svgCount: typeof candidate.svgCount === "number" ? candidate.svgCount : 0,
    reviewStatus: normalizeReviewStatus(candidate.reviewStatus),
    reviewNote: typeof candidate.reviewNote === "string" ? candidate.reviewNote : "",
    issues: Array.isArray(candidate.issues) ? candidate.issues.filter(isString) : [],
  };
}

function normalizeManifestFile(input: unknown): UnityManifestFile {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid file entry in manifest.");
  }
  const candidate = input as Partial<UnityManifestFile>;
  if (typeof candidate.screenId !== "string") {
    throw new Error("Manifest file entry is missing string field 'screenId'.");
  }
  if (typeof candidate.relativePath !== "string") {
    throw new Error("Manifest file entry is missing string field 'relativePath'.");
  }
  if (typeof candidate.nodeName !== "string") {
    throw new Error("Manifest file entry is missing string field 'nodeName'.");
  }

  return {
    screenId: candidate.screenId,
    relativePath: candidate.relativePath,
    nodeId: typeof candidate.nodeId === "string" ? candidate.nodeId : null,
    nodeName: candidate.nodeName,
  };
}

function summarizeFromScreens(screens: UnityManifestScreen[]): UnityManifest["summary"] {
  let approved = 0;
  let hold = 0;
  let pending = 0;
  let svgTotal = 0;

  for (const screen of screens) {
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
    screenTotal: screens.length,
    approved,
    hold,
    pending,
    svgTotal,
  };
}

function normalizeReviewStatus(value: unknown): ReviewStatus {
  if (value === "approved" || value === "hold" || value === "pending") {
    return value;
  }
  return "pending";
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
