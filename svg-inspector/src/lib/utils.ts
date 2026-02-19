const NODE_ID_PATTERN = /^(.*)__([0-9]+-[0-9]+)\.svg$/i;

export interface ParsedNodeMeta {
  nodeId: string | null;
  nodeName: string;
  rawId: string | null;
}

export function normalizePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
}

export function getPathSegments(value: string): string[] {
  const normalized = normalizePath(value);
  return normalized ? normalized.split("/") : [];
}

export function toFileName(value: string): string {
  const segments = getPathSegments(value);
  return segments.length > 0 ? segments[segments.length - 1] : "";
}

export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

export function isSvgPath(value: string): boolean {
  return /\.svg$/i.test(value);
}

export function parseNodeMeta(fileName: string): ParsedNodeMeta {
  const match = fileName.match(NODE_ID_PATTERN);
  if (!match) {
    return {
      nodeId: null,
      nodeName: stripExtension(fileName),
      rawId: null,
    };
  }

  return {
    nodeId: match[2].replace("-", ":"),
    nodeName: match[1],
    rawId: match[2],
  };
}

export function tryGetRawIdFromFileName(fileName: string): string | null {
  return parseNodeMeta(fileName).rawId;
}

export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function toSafeFileStem(label: string): string {
  const normalized = label
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "export";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
