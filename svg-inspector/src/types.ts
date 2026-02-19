export type ReviewStatus = "pending" | "approved" | "hold";
export type InputRootMode = "page-root" | "export-root";
export type CompositeMode = "leaf" | "all";

export interface ExclusionPreset {
  deviceChrome: boolean;
  keyboard: boolean;
}

export interface ScreenEntry {
  id: string;
  name: string;
  folderPath: string;
  rootSvgPath: string | null;
  svgCount: number;
  reviewStatus: ReviewStatus;
  reviewNote: string;
  issues: string[];
}

export interface InspectorProject {
  rootLabel: string;
  selectedAt: string;
  screens: ScreenEntry[];
}

export interface NodeLayoutBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeLayoutEntry {
  nodeId: string;
  parentId: string | null;
  nodeName: string;
  nodeType: string;
  pageName: string;
  screenRootId: string;
  screenFolder: string;
  isLeaf: boolean;
  depth: number;
  zIndex: number;
  bbox: NodeLayoutBBox | null;
  zipPath: string;
  relativePath: string;
  issues?: string[];
}

export interface NodeLayoutScreen {
  pageName: string;
  screenRootId: string;
  screenFolder: string;
  bbox: NodeLayoutBBox | null;
  issues?: string[];
}

export interface NodeLayoutManifest {
  version: 1;
  generatedAt: string;
  fileName: string;
  scope: string;
  entries: NodeLayoutEntry[];
  screens: NodeLayoutScreen[];
}

export interface FailedExportEntry {
  id: string;
  name: string;
  type: string;
  path: string;
  reason: string;
}

export interface UnityManifestSummary {
  screenTotal: number;
  approved: number;
  hold: number;
  pending: number;
  svgTotal: number;
}

export interface UnityManifestFile {
  screenId: string;
  relativePath: string;
  nodeId: string | null;
  nodeName: string;
}

export interface UnityManifestScreen {
  id: string;
  name: string;
  folderPath: string;
  rootSvgPath: string | null;
  svgCount: number;
  reviewStatus: ReviewStatus;
  reviewNote: string;
  issues: string[];
}

export interface UnityManifest {
  version: 1;
  generatedAt: string;
  sourceRoot: string;
  summary: UnityManifestSummary;
  screens: UnityManifestScreen[];
  files: UnityManifestFile[];
}

export interface ScreenExclusion {
  screenId: string;
  folderPath: string;
  excludedNodeIds: string[];
  excludedPaths: string[];
}

export interface ExclusionManifest {
  version: 1;
  generatedAt: string;
  sourceRoot: string;
  preset: ExclusionPreset;
  screens: ScreenExclusion[];
}

export interface ComponentSelection {
  screenId: string;
  relativePath: string | null;
  nodeId: string | null;
  nodeName: string;
}
