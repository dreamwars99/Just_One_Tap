import type {
  FailedExportEntry,
  InputRootMode,
  NodeLayoutBBox,
  NodeLayoutEntry,
  ScreenEntry,
} from "../types";
import type { ScreenLayoutSelection } from "./layout";
import type { ScreenSourceFile } from "./scanner";
import { clamp, normalizePath } from "./utils";

interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ParsedLayerSvg {
  dataUri: string;
}

export interface CompositeStats {
  totalEntries: number;
  renderedEntries: number;
  usedFiles: number;
  missingFiles: number;
  parseFailures: number;
  failedLinked: number;
}

export interface CompositeRenderResult {
  markup: string | null;
  issues: string[];
  usedPaths: string[];
  missingPaths: string[];
  failedPaths: string[];
  stats: CompositeStats;
}

interface BuildCompositeParams {
  screen: ScreenEntry;
  selection: ScreenLayoutSelection;
  filesByPath: Map<string, ScreenSourceFile>;
  failedEntries: FailedExportEntry[];
  inputMode: InputRootMode;
}

export async function buildCompositeMarkup(
  params: BuildCompositeParams,
): Promise<CompositeRenderResult> {
  const { screen, selection, filesByPath, failedEntries, inputMode } = params;
  const issues = [...selection.issues];
  const missingPaths: string[] = [];
  const usedPaths = new Set<string>();
  const loadCache = new Map<string, Promise<ParsedLayerSvg>>();
  const layers: string[] = [];

  const relevantFailedPaths = collectFailedPathsForScreen(failedEntries, screen, inputMode);

  if (selection.entries.length === 0) {
    return {
      markup: null,
      issues: issues.length > 0 ? issues : ["No layout entries available for composite preview."],
      usedPaths: [],
      missingPaths: [],
      failedPaths: relevantFailedPaths,
      stats: {
        totalEntries: 0,
        renderedEntries: 0,
        usedFiles: 0,
        missingFiles: 0,
        parseFailures: 0,
        failedLinked: relevantFailedPaths.length,
      },
    };
  }

  const canvas = computeCanvasRect(selection.entries, selection.screenMeta?.bbox);
  if (!canvas) {
    return {
      markup: null,
      issues: [...issues, "Failed to compute composite canvas bounds."],
      usedPaths: [],
      missingPaths: [],
      failedPaths: relevantFailedPaths,
      stats: {
        totalEntries: selection.entries.length,
        renderedEntries: 0,
        usedFiles: 0,
        missingFiles: 0,
        parseFailures: 0,
        failedLinked: relevantFailedPaths.length,
      },
    };
  }

  let parseFailures = 0;

  for (const entry of selection.entries) {
    const bbox = entry.bbox;
    if (!bbox) {
      issues.push(`Missing bbox for node ${entry.nodeId} (${entry.nodeName}).`);
      continue;
    }

    const matchedPath = matchEntryFilePath(entry, filesByPath);
    if (!matchedPath) {
      const fallbackPath = normalizePath(entry.zipPath || entry.relativePath);
      missingPaths.push(fallbackPath);
      issues.push(`Missing SVG file for layout entry ${entry.nodeId}: ${fallbackPath}`);
      continue;
    }

    usedPaths.add(matchedPath);
    const source = filesByPath.get(matchedPath);
    if (!source) {
      missingPaths.push(matchedPath);
      issues.push(`Source file disappeared during render: ${matchedPath}`);
      continue;
    }

    try {
      let parsedPromise = loadCache.get(matchedPath);
      if (!parsedPromise) {
        parsedPromise = source.loadText().then((text) => parseLayerSvg(text, bbox));
        loadCache.set(matchedPath, parsedPromise);
      }
      const parsed = await parsedPromise;
      layers.push(buildLayerMarkup(entry, parsed, canvas));
    } catch (error) {
      parseFailures += 1;
      issues.push(`SVG parse failed (${matchedPath}): ${toErrorMessage(error)}`);
    }
  }

  if (layers.length === 0) {
    return {
      markup: null,
      issues: [...issues, "No layers could be rendered in composite preview."],
      usedPaths: [...usedPaths],
      missingPaths: uniqueSorted(missingPaths),
      failedPaths: relevantFailedPaths,
      stats: {
        totalEntries: selection.entries.length,
        renderedEntries: 0,
        usedFiles: usedPaths.size,
        missingFiles: uniqueSorted(missingPaths).length,
        parseFailures,
        failedLinked: relevantFailedPaths.length,
      },
    };
  }

  const width = clamp(canvas.width, 1, Number.MAX_SAFE_INTEGER);
  const height = clamp(canvas.height, 1, Number.MAX_SAFE_INTEGER);
  const markup = [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` xmlns:xlink="http://www.w3.org/1999/xlink"`,
    ` viewBox="0 0 ${formatNumber(width)} ${formatNumber(height)}"`,
    ` width="${formatNumber(width)}"`,
    ` height="${formatNumber(height)}"`,
    ` preserveAspectRatio="xMinYMin meet">`,
    layers.join(""),
    "</svg>",
  ].join("");

  return {
    markup,
    issues,
    usedPaths: [...usedPaths],
    missingPaths: uniqueSorted(missingPaths),
    failedPaths: relevantFailedPaths,
    stats: {
      totalEntries: selection.entries.length,
      renderedEntries: layers.length,
      usedFiles: usedPaths.size,
      missingFiles: uniqueSorted(missingPaths).length,
      parseFailures,
      failedLinked: relevantFailedPaths.length,
    },
  };
}

function collectFailedPathsForScreen(
  failedEntries: FailedExportEntry[],
  screen: ScreenEntry,
  inputMode: InputRootMode,
): string[] {
  const prefix = `${normalizePath(screen.folderPath)}/`;
  const result = new Set<string>();

  for (const failed of failedEntries) {
    const failedPath = normalizePath(failed.path);
    if (!failedPath) {
      continue;
    }
    if (inputMode === "export-root") {
      if (failedPath.startsWith(prefix)) {
        result.add(failedPath);
      }
      continue;
    }

    const segments = failedPath.split("/");
    if (segments.length >= 2) {
      const withoutPage = segments.slice(1).join("/");
      if (withoutPage.startsWith(prefix)) {
        result.add(withoutPage);
      }
    }
  }

  return [...result].sort((left, right) => left.localeCompare(right, "ko"));
}

function matchEntryFilePath(
  entry: NodeLayoutEntry,
  filesByPath: Map<string, ScreenSourceFile>,
): string | null {
  const zipPath = normalizePath(entry.zipPath);
  if (filesByPath.has(zipPath)) {
    return zipPath;
  }

  const relativePath = normalizePath(entry.relativePath);
  if (filesByPath.has(relativePath)) {
    return relativePath;
  }

  return null;
}

function computeCanvasRect(
  entries: NodeLayoutEntry[],
  screenBBox: NodeLayoutBBox | null | undefined,
): ViewBoxRect | null {
  if (screenBBox && isPositiveBBox(screenBBox)) {
    return {
      x: screenBBox.x,
      y: screenBBox.y,
      width: screenBBox.width,
      height: screenBBox.height,
    };
  }

  const bboxes = entries
    .map((entry) => entry.bbox)
    .filter((bbox): bbox is NodeLayoutBBox => bbox !== null && isPositiveBBox(bbox));

  if (bboxes.length === 0) {
    return null;
  }

  const minX = Math.min(...bboxes.map((bbox) => bbox.x));
  const minY = Math.min(...bboxes.map((bbox) => bbox.y));
  const maxX = Math.max(...bboxes.map((bbox) => bbox.x + bbox.width));
  const maxY = Math.max(...bboxes.map((bbox) => bbox.y + bbox.height));

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function isPositiveBBox(bbox: NodeLayoutBBox): boolean {
  return (
    Number.isFinite(bbox.x) &&
    Number.isFinite(bbox.y) &&
    Number.isFinite(bbox.width) &&
    Number.isFinite(bbox.height) &&
    bbox.width > 0 &&
    bbox.height > 0
  );
}

function parseLayerSvg(rawSvg: string, fallbackBBox: NodeLayoutBBox): ParsedLayerSvg {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(rawSvg, "image/svg+xml");
  if (parsed.querySelector("parsererror")) {
    throw new Error("XML parser error.");
  }

  const root = parsed.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") {
    throw new Error("SVG root element not found.");
  }

  const viewBox = parseViewBox(root) ?? {
    x: 0,
    y: 0,
    width: Math.max(1, fallbackBBox.width),
    height: Math.max(1, fallbackBBox.height),
  };

  normalizeSvgRoot(root, viewBox);
  const serialized = new XMLSerializer().serializeToString(root);
  return {
    dataUri: toSvgDataUri(serialized),
  };
}

function parseViewBox(root: Element): ViewBoxRect | null {
  const viewBoxValue = root.getAttribute("viewBox");
  if (viewBoxValue) {
    const parts = viewBoxValue
      .trim()
      .split(/[,\s]+/)
      .map((value) => Number(value));
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      const [x, y, width, height] = parts;
      if (width > 0 && height > 0) {
        return { x, y, width, height };
      }
    }
  }

  const width = parseLength(root.getAttribute("width"));
  const height = parseLength(root.getAttribute("height"));
  if (width > 0 && height > 0) {
    return { x: 0, y: 0, width, height };
  }

  return null;
}

function parseLength(value: string | null): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildLayerMarkup(
  entry: NodeLayoutEntry,
  parsed: ParsedLayerSvg,
  canvas: ViewBoxRect,
): string {
  const bbox = entry.bbox;
  if (!bbox) {
    return "";
  }

  const x = bbox.x - canvas.x;
  const y = bbox.y - canvas.y;

  return [
    `<g data-node-id="${escapeAttribute(entry.nodeId)}"`,
    ` data-node-name="${escapeAttribute(entry.nodeName)}"`,
    ` data-z-index="${entry.zIndex}">`,
    `<image x="${formatNumber(x)}"`,
    ` y="${formatNumber(y)}"`,
    ` width="${formatNumber(bbox.width)}"`,
    ` height="${formatNumber(bbox.height)}"`,
    ` preserveAspectRatio="none"`,
    ` href="${escapeAttribute(parsed.dataUri)}"`,
    ` xlink:href="${escapeAttribute(parsed.dataUri)}" />`,
    "</g>",
  ].join("");
}

function normalizeSvgRoot(root: Element, viewBox: ViewBoxRect): void {
  root.setAttribute(
    "viewBox",
    `${formatNumber(viewBox.x)} ${formatNumber(viewBox.y)} ${formatNumber(viewBox.width)} ${formatNumber(
      viewBox.height,
    )}`,
  );
  root.setAttribute("width", formatNumber(Math.max(1, viewBox.width)));
  root.setAttribute("height", formatNumber(Math.max(1, viewBox.height)));
  if (!root.getAttribute("xmlns")) {
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
}

function toSvgDataUri(svgMarkup: string): string {
  const bytes = new TextEncoder().encode(svgMarkup);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizePath(value)))].sort((left, right) =>
    left.localeCompare(right, "ko"),
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
