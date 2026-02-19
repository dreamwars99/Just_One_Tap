export type ReviewStatus = "pending" | "approved" | "hold";

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
