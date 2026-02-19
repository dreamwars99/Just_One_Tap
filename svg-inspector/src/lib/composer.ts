import type {
  ExclusionPreset,
  FailedExportEntry,
  InputRootMode,
  NodeLayoutBBox,
  NodeLayoutEntry,
  ScreenEntry,
} from "../types";
import { matchesPresetForEntry } from "./exclusionState";
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

interface RenderLayer {
  entry: NodeLayoutEntry;
  parsed: ParsedLayerSvg;
  matchedPath: string;
}

export interface CompositeStats {
  totalEntries: number;
  renderedEntries: number;
  excludedEntries: number;
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
  excludedNodeIds: Set<string>;
  excludedPaths: Set<string>;
  preset: ExclusionPreset;
  selectedNodeId: string | null;
}

export async function buildCompositeMarkup(
  params: BuildCompositeParams,
): Promise<CompositeRenderResult> {
  const {
    screen,
    selection,
    filesByPath,
    failedEntries,
    inputMode,
    excludedNodeIds,
    excludedPaths,
    preset,
    selectedNodeId,
  } = params;
  const issues = [...selection.issues];
  const missingPaths: string[] = [];
  const usedPaths = new Set<string>();
  const loadCache = new Map<string, Promise<ParsedLayerSvg>>();
  const renderLayers: RenderLayer[] = [];
  const excludedRootEntries: NodeLayoutEntry[] = [];

  const relevantFailedPaths = collectFailedPathsForScreen(failedEntries, screen, inputMode);
  const entriesById = buildEntryMap(selection.entries);

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
        excludedEntries: 0,
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
        excludedEntries: 0,
        usedFiles: 0,
        missingFiles: 0,
        parseFailures: 0,
        failedLinked: relevantFailedPaths.length,
      },
    };
  }

  let parseFailures = 0;
  let skippedRootEntries = 0;
  let prunedByAncestor = 0;
  let usedRootFallback = false;
  let excludedEntries = 0;
  let nonRootCandidates = 0;
  let nonRootExcludedByUserFilters = 0;

  const selectionOrder = [...selection.entries].sort((left, right) => {
    const depthDiff = left.depth - right.depth;
    if (depthDiff !== 0) {
      return depthDiff;
    }
    return left.zIndex - right.zIndex;
  });
  const selectedAncestorIds = new Set<string>();

  for (const entry of selectionOrder) {
    if (entry.nodeId === entry.screenRootId) {
      skippedRootEntries += 1;
      excludedRootEntries.push(entry);
      continue;
    }
    nonRootCandidates += 1;

    if (hasSelectedAncestor(entry.parentId, entriesById, selectedAncestorIds)) {
      prunedByAncestor += 1;
      continue;
    }

    if (excludedNodeIds.has(entry.nodeId) || matchesPresetForEntry(entry, null, preset)) {
      excludedEntries += 1;
      nonRootExcludedByUserFilters += 1;
      continue;
    }

    const bbox = entry.bbox;
    if (!bbox) {
      issues.push(`Missing bbox for node ${entry.nodeId} (${entry.nodeName}).`);
      continue;
    }

    const matchedPath = matchEntryFilePath(entry, filesByPath);
    if (isPathExcluded(entry, matchedPath, excludedPaths)) {
      excludedEntries += 1;
      nonRootExcludedByUserFilters += 1;
      continue;
    }

    if (!matchedPath) {
      const fallbackPath = normalizePath(entry.zipPath || entry.relativePath);
      missingPaths.push(fallbackPath);
      issues.push(`Missing SVG file for layout entry ${entry.nodeId}: ${fallbackPath}`);
      continue;
    }

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
      renderLayers.push({ entry, parsed, matchedPath });
      usedPaths.add(matchedPath);
      selectedAncestorIds.add(entry.nodeId);
    } catch (error) {
      parseFailures += 1;
      issues.push(`SVG parse failed (${matchedPath}): ${toErrorMessage(error)}`);
    }
  }

  const allNonRootExcluded =
    nonRootCandidates > 0 && nonRootCandidates === nonRootExcludedByUserFilters;

  if (renderLayers.length === 0 && excludedRootEntries.length > 0 && !allNonRootExcluded) {
    const orderedRoots = [...excludedRootEntries].sort((left, right) => left.zIndex - right.zIndex);
    for (const entry of orderedRoots) {
      const bbox = entry.bbox;
      if (!bbox) {
        issues.push(`Missing bbox for screen-root node ${entry.nodeId} (${entry.nodeName}).`);
        continue;
      }

      const matchedPath = matchEntryFilePath(entry, filesByPath);
      if (!matchedPath) {
        const fallbackPath = normalizePath(entry.zipPath || entry.relativePath);
        missingPaths.push(fallbackPath);
        issues.push(`Missing SVG file for screen-root fallback ${entry.nodeId}: ${fallbackPath}`);
        continue;
      }

      const source = filesByPath.get(matchedPath);
      if (!source) {
        missingPaths.push(matchedPath);
        issues.push(`Source file disappeared during root fallback: ${matchedPath}`);
        continue;
      }

      try {
        let parsedPromise = loadCache.get(matchedPath);
        if (!parsedPromise) {
          parsedPromise = source.loadText().then((text) => parseLayerSvg(text, bbox));
          loadCache.set(matchedPath, parsedPromise);
        }
        const parsed = await parsedPromise;
        renderLayers.push({ entry, parsed, matchedPath });
        usedPaths.add(matchedPath);
        usedRootFallback = true;
        break;
      } catch (error) {
        parseFailures += 1;
        issues.push(`SVG parse failed during root fallback (${matchedPath}): ${toErrorMessage(error)}`);
      }
    }
  }

  if (skippedRootEntries > 0 && !usedRootFallback) {
    issues.push(
      `Excluded ${skippedRootEntries} screen-root export entr${
        skippedRootEntries === 1 ? "y" : "ies"
      } to avoid full-screen duplication.`,
    );
  }
  if (usedRootFallback) {
    issues.push(
      "Used screen-root fallback because no child layer could be rendered for this screen.",
    );
  }
  if (allNonRootExcluded) {
    issues.push("All layers excluded by current filters.");
  }
  if (prunedByAncestor > 0) {
    issues.push(
      `Pruned ${prunedByAncestor} descendant export entr${
        prunedByAncestor === 1 ? "y" : "ies"
      } because ancestor exports already cover those subtrees.`,
    );
  }

  const layers = renderLayers
    .sort((left, right) => left.entry.zIndex - right.entry.zIndex)
    .map((item) => buildLayerMarkup(item.entry, item.parsed, item.matchedPath, canvas, selectedNodeId));

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
        excludedEntries,
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
      excludedEntries,
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

function isPathExcluded(
  entry: NodeLayoutEntry,
  matchedPath: string | null,
  excludedPaths: Set<string>,
): boolean {
  if (matchedPath && excludedPaths.has(normalizePath(matchedPath))) {
    return true;
  }
  const zipPath = normalizePath(entry.zipPath);
  if (zipPath && excludedPaths.has(zipPath)) {
    return true;
  }
  const relativePath = normalizePath(entry.relativePath);
  if (relativePath && excludedPaths.has(relativePath)) {
    return true;
  }
  return false;
}

function buildEntryMap(entries: NodeLayoutEntry[]): Map<string, NodeLayoutEntry> {
  const byId = new Map<string, NodeLayoutEntry>();
  for (const entry of entries) {
    byId.set(entry.nodeId, entry);
  }
  return byId;
}

function hasSelectedAncestor(
  parentId: string | null,
  entriesById: Map<string, NodeLayoutEntry>,
  selectedIds: Set<string>,
): boolean {
  const visited = new Set<string>();
  let current = parentId;

  while (current) {
    if (selectedIds.has(current)) {
      return true;
    }
    if (visited.has(current)) {
      return false;
    }
    visited.add(current);
    const parent = entriesById.get(current);
    current = parent?.parentId ?? null;
  }

  return false;
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
  matchedPath: string,
  canvas: ViewBoxRect,
  selectedNodeId: string | null,
): string {
  const bbox = entry.bbox;
  if (!bbox) {
    return "";
  }

  const x = bbox.x - canvas.x;
  const y = bbox.y - canvas.y;
  const selectedOutline =
    selectedNodeId && entry.nodeId === selectedNodeId
      ? `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(
          bbox.width,
        )}" height="${formatNumber(bbox.height)}" fill="none" stroke="#0d95c7" stroke-width="2" vector-effect="non-scaling-stroke" />`
      : "";

  return [
    `<g data-node-id="${escapeAttribute(entry.nodeId)}"`,
    ` data-node-name="${escapeAttribute(entry.nodeName)}"`,
    ` data-relative-path="${escapeAttribute(matchedPath)}"`,
    ` data-z-index="${entry.zIndex}">`,
    `<image x="${formatNumber(x)}"`,
    ` y="${formatNumber(y)}"`,
    ` width="${formatNumber(bbox.width)}"`,
    ` height="${formatNumber(bbox.height)}"`,
    ` preserveAspectRatio="none"`,
    ` href="${escapeAttribute(parsed.dataUri)}"`,
    ` xlink:href="${escapeAttribute(parsed.dataUri)}" />`,
    selectedOutline,
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
