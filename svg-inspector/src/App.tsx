import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ChangeEvent,
  type PointerEvent,
  type MouseEvent,
} from "react";
import "./App.css";
import {
  pickDirectorySnapshot,
  removeNativeFile,
  rescanNativeDirectory,
  type DirectorySnapshot,
} from "./lib/fileSystem";
import { applyManifestReviews, buildReviewCsv, buildUnityManifest, parseUnityManifest } from "./lib/manifest";
import { applyStoredReviewState, loadStoredReviewState, saveStoredReviewState } from "./lib/reviewState";
import { buildInspectorProject, summarizeProject, type ScanResult, type ScreenSourceFile } from "./lib/scanner";
import { clamp, getPathSegments, normalizePath, toSafeFileStem } from "./lib/utils";
import { buildCompositeMarkup, type CompositeRenderResult } from "./lib/composer";
import { loadAuxiliaryData, selectScreenLayout, type LoadedAuxData } from "./lib/layout";
import {
  buildExclusionManifest,
  createEmptyScreenExclusion,
  DEFAULT_EXCLUSION_PRESET,
  hydrateExclusionState,
  loadStoredExclusionState,
  matchesPresetForFile,
  parseExclusionManifest,
  saveStoredExclusionState,
} from "./lib/exclusionState";
import type {
  ComponentSelection,
  CompositeMode,
  ExclusionPreset,
  InspectorProject,
  ReviewStatus,
  ScreenEntry,
  ScreenExclusion,
} from "./types";

type ScreenFilter = "all" | ReviewStatus;
type PreviewBg = "white" | "checker";

interface PreviewState {
  loading: boolean;
  markup: string | null;
  error: string | null;
}

interface CompositeState extends PreviewState {
  issues: string[];
  stats: CompositeRenderResult["stats"] | null;
  usedPaths: string[];
  failedPaths: string[];
  missingPaths: string[];
}

type ExclusionByScreenId = Record<string, ScreenExclusion>;

interface Notice {
  type: "info" | "error";
  message: string;
}

interface Viewport {
  zoom: number;
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  lastX: number;
  lastY: number;
}

interface FileTreeNode {
  name: string;
  kind: "dir" | "file";
  children: Map<string, FileTreeNode>;
  file: ScreenSourceFile | null;
}

const EMPTY_PREVIEW: PreviewState = { loading: false, markup: null, error: null };
const EMPTY_COMPOSITE: CompositeState = {
  ...EMPTY_PREVIEW,
  issues: [],
  stats: null,
  usedPaths: [],
  failedPaths: [],
  missingPaths: [],
};
const DEFAULT_VIEWPORT: Viewport = { zoom: 1, x: 0, y: 0 };
const VIEWPORT_MIN = 0.15;
const VIEWPORT_MAX = 8;
const STATUS_OPTIONS: Array<{ value: ScreenFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "hold", label: "Hold" },
  { value: "pending", label: "Pending" },
];

function App() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [project, setProject] = useState<InspectorProject | null>(null);
  const [aux, setAux] = useState<LoadedAuxData>({
    layoutManifest: null,
    failedEntries: [],
    warnings: [],
  });
  const [exclusionPreset, setExclusionPreset] = useState<ExclusionPreset>({
    ...DEFAULT_EXCLUSION_PRESET,
  });
  const [exclusionsByScreenId, setExclusionsByScreenId] = useState<ExclusionByScreenId>({});
  const [componentSelection, setComponentSelection] = useState<ComponentSelection | null>(null);

  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScreenFilter>("all");
  const [bg, setBg] = useState<PreviewBg>("checker");
  const [compositeMode, setCompositeMode] = useState<CompositeMode>("all");
  const [rootPreview, setRootPreview] = useState<PreviewState>(EMPTY_PREVIEW);
  const [compositePreview, setCompositePreview] = useState<CompositeState>(EMPTY_COMPOSITE);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const manifestInputRef = useRef<HTMLInputElement>(null);
  const exclusionsInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (scan && project) {
      saveStoredReviewState(scan.storageKey, project);
    }
  }, [scan, project]);

  useEffect(() => {
    if (!scan || !project) {
      return;
    }
    const manifest = buildExclusionManifest(
      project.rootLabel,
      exclusionPreset,
      project.screens,
      exclusionsByScreenId,
    );
    saveStoredExclusionState(scan.storageKey, manifest);
  }, [scan, project, exclusionPreset, exclusionsByScreenId]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code !== "Space" || isEditable(event.target)) {
        return;
      }
      event.preventDefault();
      setIsSpacePressed(true);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.code !== "Space") {
        return;
      }
      setIsSpacePressed(false);
      setIsPanning(false);
      dragRef.current = null;
    };
    const onBlur = (): void => {
      setIsSpacePressed(false);
      setIsPanning(false);
      dragRef.current = null;
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const selectedScreen = useMemo(() => {
    if (!project || !selectedScreenId) {
      return null;
    }
    return project.screens.find((item) => item.id === selectedScreenId) ?? null;
  }, [project, selectedScreenId]);

  useEffect(() => {
    setComponentSelection(null);
  }, [selectedScreenId]);

  const summary = useMemo(() => (project ? summarizeProject(project) : null), [project]);

  const filteredScreens = useMemo(() => {
    if (!project) {
      return [];
    }
    const keyword = searchKeyword.trim().toLowerCase();
    return project.screens.filter((screen) => {
      if (statusFilter !== "all" && screen.reviewStatus !== statusFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return `${screen.name} ${screen.folderPath}`.toLowerCase().includes(keyword);
    });
  }, [project, searchKeyword, statusFilter]);

  const selectedFiles = useMemo(() => {
    if (!scan || !selectedScreenId) {
      return [];
    }
    return scan.filesByScreenId.get(selectedScreenId) ?? [];
  }, [scan, selectedScreenId]);

  const selectedScreenExclusion = useMemo(() => {
    if (!selectedScreen) {
      return null;
    }
    return (
      exclusionsByScreenId[selectedScreen.id] ??
      createEmptyScreenExclusion(selectedScreen)
    );
  }, [exclusionsByScreenId, selectedScreen]);

  const manualExcludedPathSet = useMemo(
    () =>
      new Set(
        (selectedScreenExclusion?.excludedPaths ?? []).map((path) => normalizePath(path)),
      ),
    [selectedScreenExclusion],
  );
  const manualExcludedNodeIdSet = useMemo(
    () => new Set(selectedScreenExclusion?.excludedNodeIds ?? []),
    [selectedScreenExclusion],
  );
  const autoExcludedPathSet = useMemo(() => {
    const set = new Set<string>();
    for (const file of selectedFiles) {
      if (matchesPresetForFile(file.nodeName, file.relativePath, exclusionPreset)) {
        set.add(normalizePath(file.relativePath));
      }
    }
    return set;
  }, [selectedFiles, exclusionPreset]);
  const effectiveExcludedPathSet = useMemo(() => {
    const set = new Set<string>(manualExcludedPathSet);
    for (const path of autoExcludedPathSet) {
      set.add(path);
    }
    return set;
  }, [manualExcludedPathSet, autoExcludedPathSet]);

  const selectedComponentIsManualExcluded = useMemo(() => {
    if (!componentSelection || !selectedScreen || componentSelection.screenId !== selectedScreen.id) {
      return false;
    }
    const byPath =
      componentSelection.relativePath &&
      manualExcludedPathSet.has(normalizePath(componentSelection.relativePath));
    const byNode = componentSelection.nodeId && manualExcludedNodeIdSet.has(componentSelection.nodeId);
    return Boolean(byPath || byNode);
  }, [componentSelection, selectedScreen, manualExcludedPathSet, manualExcludedNodeIdSet]);

  const selectedComponentIsAutoExcluded = useMemo(() => {
    if (!componentSelection || !selectedScreen || componentSelection.screenId !== selectedScreen.id) {
      return false;
    }
    return matchesPresetForFile(
      componentSelection.nodeName,
      componentSelection.relativePath ?? componentSelection.nodeName,
      exclusionPreset,
    );
  }, [componentSelection, selectedScreen, exclusionPreset]);

  const fileTree = useMemo(() => buildFileTree(selectedFiles), [selectedFiles]);
  const usedPathSet = useMemo(() => new Set(compositePreview.usedPaths), [compositePreview.usedPaths]);
  const failedPathSet = useMemo(() => new Set(compositePreview.failedPaths), [compositePreview.failedPaths]);
  const isNativeMode = scan?.accessMode === "native";
  const hasPreview = Boolean(rootPreview.markup || compositePreview.markup);

  const loadScreenVisuals = useCallback(
    async (
      scanSnapshot: ScanResult,
      auxSnapshot: LoadedAuxData,
      screenId: string,
      mode: CompositeMode,
      exclusionsByScreen: ExclusionByScreenId,
      preset: ExclusionPreset,
      selectedNodeId: string | null,
    ) => {
      const screen = scanSnapshot.project.screens.find((item) => item.id === screenId);
      const requestId = ++requestRef.current;
      if (!screen) {
        setRootPreview({ ...EMPTY_PREVIEW, error: "Screen not found." });
        setCompositePreview({ ...EMPTY_COMPOSITE, error: "Screen not found." });
        return;
      }

      setRootPreview({ ...EMPTY_PREVIEW, loading: true });
      setCompositePreview({ ...EMPTY_COMPOSITE, loading: true });

      const nextRoot = await loadRootPreview(scanSnapshot, screen);
      if (requestId !== requestRef.current) {
        return;
      }
      setRootPreview(nextRoot);

      const nextComposite = await loadCompositePreview(
        scanSnapshot,
        auxSnapshot,
        screen,
        mode,
        exclusionsByScreen[screen.id] ?? createEmptyScreenExclusion(screen),
        preset,
        selectedNodeId,
      );
      if (requestId !== requestRef.current) {
        return;
      }
      setCompositePreview(nextComposite);
    },
    [],
  );

  useEffect(() => {
    if (!scan || !selectedScreenId) {
      setRootPreview(EMPTY_PREVIEW);
      setCompositePreview(EMPTY_COMPOSITE);
      return;
    }
    void loadScreenVisuals(
      scan,
      aux,
      selectedScreenId,
      compositeMode,
      exclusionsByScreenId,
      exclusionPreset,
      componentSelection?.screenId === selectedScreenId ? componentSelection.nodeId : null,
    );
  }, [
    scan,
    aux,
    selectedScreenId,
    compositeMode,
    exclusionsByScreenId,
    exclusionPreset,
    componentSelection,
    loadScreenVisuals,
  ]);

  const updateSelectedScreen = useCallback(
    (updater: (screen: ScreenEntry) => ScreenEntry): void => {
      if (!selectedScreenId) {
        return;
      }
      setProject((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          screens: current.screens.map((screen) => (screen.id === selectedScreenId ? updater(screen) : screen)),
        };
      });
    },
    [selectedScreenId],
  );

  const hydrateFromSnapshot = useCallback(
    async (
      snapshot: DirectorySnapshot,
      options: { preferredScreenId?: string | null; resetFilters?: boolean } = {},
    ): Promise<void> => {
      const scanned = buildInspectorProject(snapshot);
      const storedReview = loadStoredReviewState(scanned.storageKey);
      const hydratedProject = storedReview
        ? applyStoredReviewState(scanned.project, storedReview)
        : scanned.project;
      const auxiliary = await loadAuxiliaryData(scanned.allFilesByPath);

      const storedExclusions = loadStoredExclusionState(scanned.storageKey);
      const exclusionHydrated = hydrateExclusionState(
        hydratedProject,
        scanned.sourceFiles,
        storedExclusions,
      );

      const preferredScreenId = options.preferredScreenId ?? null;
      const selectedId =
        preferredScreenId &&
        hydratedProject.screens.some((screen) => screen.id === preferredScreenId)
          ? preferredScreenId
          : hydratedProject.screens[0]?.id ?? null;

      setScan(scanned);
      setProject(hydratedProject);
      setAux({
        ...auxiliary,
        warnings: [...auxiliary.warnings, ...exclusionHydrated.warnings],
      });
      setExclusionPreset(exclusionHydrated.preset);
      setExclusionsByScreenId(exclusionHydrated.byScreenId);
      setSelectedScreenId(selectedId);
      setComponentSelection(null);
      setViewport(DEFAULT_VIEWPORT);
      if (options.resetFilters) {
        setSearchKeyword("");
        setStatusFilter("all");
        setCompositeMode("all");
      }

      const warningCount = auxiliary.warnings.length + exclusionHydrated.warnings.length;
      setNotice({
        type: "info",
        message: `Loaded ${hydratedProject.screens.length} screens${
          warningCount > 0 ? ` (${warningCount} warnings)` : ""
        }.`,
      });
    },
    [],
  );

  const openFolder = useCallback(async () => {
    setBusyLabel("Loading SVG tree...");
    setNotice(null);
    try {
      const snapshot = await pickDirectorySnapshot();
      if (!snapshot) {
        return;
      }
      await hydrateFromSnapshot(snapshot, { resetFilters: true });
    } catch (error) {
      setNotice({ type: "error", message: `Failed to load folder: ${getErrorMessage(error)}` });
    } finally {
      setBusyLabel(null);
    }
  }, [hydrateFromSnapshot]);

  const exportManifest = useCallback(() => {
    if (!scan || !project) {
      return;
    }
    const manifest = buildUnityManifest(project, scan.sourceFiles);
    downloadTextFile("unity-inspection-manifest.json", JSON.stringify(manifest, null, 2), "application/json;charset=utf-8");
    setNotice({ type: "info", message: "Saved unity-inspection-manifest.json" });
  }, [scan, project]);

  const importManifestFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !project) {
      return;
    }
    try {
      const manifest = parseUnityManifest(await file.text());
      setProject((current) => (current ? applyManifestReviews(current, manifest) : current));
      setNotice({ type: "info", message: `Imported states from ${manifest.screens.length} screens.` });
    } catch (error) {
      setNotice({ type: "error", message: `Manifest import failed: ${getErrorMessage(error)}` });
    }
  }, [project]);

  const exportCsv = useCallback(() => {
    if (!project) {
      return;
    }
    const csv = buildReviewCsv(project);
    downloadTextFile(`inspection-review-${toSafeFileStem(project.rootLabel)}.csv`, csv, "text/csv;charset=utf-8");
    setNotice({ type: "info", message: "Saved review CSV." });
  }, [project]);

  const exportExclusions = useCallback(() => {
    if (!project) {
      return;
    }
    const manifest = buildExclusionManifest(
      project.rootLabel,
      exclusionPreset,
      project.screens,
      exclusionsByScreenId,
    );
    downloadTextFile(
      "svg-inspector-exclusions.json",
      JSON.stringify(manifest, null, 2),
      "application/json;charset=utf-8",
    );
    setNotice({ type: "info", message: "Saved svg-inspector-exclusions.json" });
  }, [project, exclusionPreset, exclusionsByScreenId]);

  const importExclusionsFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (!file || !project || !scan) {
        return;
      }
      try {
        const parsed = parseExclusionManifest(await file.text());
        const hydrated = hydrateExclusionState(project, scan.sourceFiles, parsed);
        setExclusionPreset(hydrated.preset);
        setExclusionsByScreenId(hydrated.byScreenId);
        const warningSuffix =
          hydrated.warnings.length > 0 ? ` (${hydrated.warnings.length} warnings)` : "";
        setNotice({
          type: "info",
          message: `Imported exclusions from ${parsed.screens.length} screens${warningSuffix}.`,
        });
      } catch (error) {
        setNotice({ type: "error", message: `Exclusions import failed: ${getErrorMessage(error)}` });
      }
    },
    [project, scan],
  );

  const updateScreenExclusion = useCallback(
    (
      screen: ScreenEntry,
      updater: (current: ScreenExclusion) => ScreenExclusion,
    ): void => {
      setExclusionsByScreenId((current) => {
        const base = current[screen.id] ?? createEmptyScreenExclusion(screen);
        const next = updater(base);
        const normalized: ScreenExclusion = {
          screenId: screen.id,
          folderPath: screen.folderPath,
          excludedNodeIds: [...new Set(next.excludedNodeIds)].sort((left, right) =>
            left.localeCompare(right, "ko"),
          ),
          excludedPaths: [...new Set(next.excludedPaths.map((path) => normalizePath(path)))].sort(
            (left, right) => left.localeCompare(right, "ko"),
          ),
        };
        return {
          ...current,
          [screen.id]: normalized,
        };
      });
    },
    [],
  );

  const selectSourceFile = useCallback(
    (file: ScreenSourceFile) => {
      setComponentSelection({
        screenId: file.screenId,
        relativePath: normalizePath(file.relativePath),
        nodeId: file.nodeId,
        nodeName: file.nodeName,
      });
    },
    [],
  );

  const excludeSelectedComponent = useCallback(() => {
    if (!selectedScreen || !componentSelection || componentSelection.screenId !== selectedScreen.id) {
      return;
    }
    updateScreenExclusion(selectedScreen, (current) => {
      const nextNodeIds = new Set(current.excludedNodeIds);
      const nextPaths = new Set(current.excludedPaths.map((path) => normalizePath(path)));
      if (componentSelection.nodeId) {
        nextNodeIds.add(componentSelection.nodeId);
      }
      if (componentSelection.relativePath) {
        nextPaths.add(normalizePath(componentSelection.relativePath));
      }
      return {
        ...current,
        excludedNodeIds: [...nextNodeIds],
        excludedPaths: [...nextPaths],
      };
    });
  }, [selectedScreen, componentSelection, updateScreenExclusion]);

  const restoreSelectedComponent = useCallback(() => {
    if (!selectedScreen || !componentSelection || componentSelection.screenId !== selectedScreen.id) {
      return;
    }
    updateScreenExclusion(selectedScreen, (current) => ({
      ...current,
      excludedNodeIds: current.excludedNodeIds.filter((id) => id !== componentSelection.nodeId),
      excludedPaths: current.excludedPaths.filter(
        (path) => normalizePath(path) !== normalizePath(componentSelection.relativePath ?? ""),
      ),
    }));
  }, [selectedScreen, componentSelection, updateScreenExclusion]);

  const hardDeleteSelectedFile = useCallback(async () => {
    if (!scan || !selectedScreen || !componentSelection) {
      return;
    }
    if (scan.accessMode !== "native" || !scan.nativeRootHandle) {
      setNotice({
        type: "error",
        message: "Hard delete is available only in native folder mode.",
      });
      return;
    }
    if (!componentSelection.relativePath) {
      setNotice({ type: "error", message: "This selection has no file path to delete." });
      return;
    }

    const confirmed = window.confirm(
      `Delete this file permanently?\n${componentSelection.relativePath}`,
    );
    if (!confirmed) {
      return;
    }

    setBusyLabel("Deleting selected SVG...");
    try {
      await removeNativeFile(scan.nativeRootHandle, componentSelection.relativePath);
      const refreshed = await rescanNativeDirectory(scan.nativeRootHandle);
      await hydrateFromSnapshot(refreshed, {
        preferredScreenId: selectedScreen.id,
        resetFilters: false,
      });
      setNotice({
        type: "info",
        message: `Deleted ${componentSelection.relativePath}`,
      });
    } catch (error) {
      setNotice({ type: "error", message: `Delete failed: ${getErrorMessage(error)}` });
    } finally {
      setBusyLabel(null);
    }
  }, [scan, selectedScreen, componentSelection, hydrateFromSnapshot]);

  const toggleDeviceChromePreset = useCallback(() => {
    setExclusionPreset((current) => ({ ...current, deviceChrome: !current.deviceChrome }));
  }, []);

  const toggleKeyboardPreset = useCallback(() => {
    setExclusionPreset((current) => ({ ...current, keyboard: !current.keyboard }));
  }, []);

  const onCompositeLayerClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!selectedScreen || isPanning || isSpacePressed) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const layer = target.closest("g[data-node-id]");
      if (!layer) {
        return;
      }
      const nodeId = layer.getAttribute("data-node-id");
      const nodeName = layer.getAttribute("data-node-name") ?? "unknown";
      const relativePath = layer.getAttribute("data-relative-path");
      setComponentSelection({
        screenId: selectedScreen.id,
        nodeId: nodeId || null,
        nodeName,
        relativePath: relativePath ? normalizePath(relativePath) : null,
      });
    },
    [selectedScreen, isPanning, isSpacePressed],
  );

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!hasPreview || !isSpacePressed || event.button !== 0) {
      return;
    }
    dragRef.current = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, [hasPreview, isSpacePressed]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    dragRef.current = { ...drag, lastX: event.clientX, lastY: event.clientY };
    setViewport((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const viewerClass = useMemo(() => {
    if (!hasPreview) {
      return "viewer";
    }
    if (isPanning) {
      return "viewer panning";
    }
    if (isSpacePressed) {
      return "viewer can-pan";
    }
    return "viewer";
  }, [hasPreview, isPanning, isSpacePressed]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>SVG Inspector</h1>
        <div className="actions">
          <button onClick={openFolder} disabled={Boolean(busyLabel)}>Open Folder</button>
          <button onClick={() => exclusionsInputRef.current?.click()} disabled={!project}>Import Exclusions</button>
          <button onClick={exportExclusions} disabled={!project}>Save Exclusions</button>
          <button onClick={() => manifestInputRef.current?.click()} disabled={!project}>Import Manifest</button>
          <button onClick={exportManifest} disabled={!scan || !project}>Save Manifest</button>
          <button onClick={exportCsv} disabled={!project}>Export CSV</button>
        </div>
      </header>

      {notice ? <div className={`notice ${notice.type}`}>{notice.message}</div> : null}
      {aux.warnings.length > 0 ? <div className="notice error">{aux.warnings.join(" | ")}</div> : null}

      <div className="workspace">
        <aside className="panel left">
          <h2>Project</h2>
          {project ? (
            <>
              <p><strong>Root:</strong> {project.rootLabel}</p>
              <p><strong>Input:</strong> {scan?.inputMode}</p>
              {summary ? <p><strong>Screens:</strong> {summary.screenTotal} / <strong>SVG:</strong> {summary.svgTotal}</p> : null}
            </>
          ) : <p>Open an extracted SVG folder first.</p>}
          <input type="search" value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="Search screen" disabled={!project} />
          <div className="chips">
            {STATUS_OPTIONS.map((option) => (
              <button key={option.value} className={statusFilter === option.value ? "active" : ""} disabled={!project} onClick={() => setStatusFilter(option.value)}>{option.label}</button>
            ))}
          </div>
          <div className="screen-list">
            {filteredScreens.map((screen) => (
              <button key={screen.id} className={selectedScreenId === screen.id ? "active" : ""} onClick={() => { setSelectedScreenId(screen.id); setViewport(DEFAULT_VIEWPORT); }}>
                <span>{screen.name}</span>
                <small>{screen.reviewStatus} · {screen.svgCount} svg</small>
              </button>
            ))}
          </div>
        </aside>

        <main className="panel center">
          <div className="toolbar">
            <button onClick={() => setViewport((v) => ({ ...v, zoom: clamp(v.zoom * 0.87, VIEWPORT_MIN, VIEWPORT_MAX) }))} disabled={!hasPreview}>-</button>
            <span>{Math.round(viewport.zoom * 100)}%</span>
            <button onClick={() => setViewport((v) => ({ ...v, zoom: clamp(v.zoom * 1.15, VIEWPORT_MIN, VIEWPORT_MAX) }))} disabled={!hasPreview}>+</button>
            <button onClick={() => setViewport(DEFAULT_VIEWPORT)} disabled={!hasPreview}>Reset</button>
            <button className={bg === "checker" ? "active" : ""} onClick={() => setBg((v) => v === "checker" ? "white" : "checker")}>BG</button>
            <button className={compositeMode === "all" ? "active" : ""} onClick={() => setCompositeMode("all")} disabled={!aux.layoutManifest}>All (recommended)</button>
            <button className={compositeMode === "leaf" ? "active" : ""} onClick={() => setCompositeMode("leaf")} disabled={!aux.layoutManifest}>Leaf (diagnostic)</button>
          </div>
          <p className="hint">Pan: Space + Left Drag. Mouse wheel zoom disabled.</p>
          <div className="compare-grid">
            <section>
              <h3>Root SVG</h3>
              <div className={`${viewerClass} ${bg}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
                {busyLabel ? <div className="overlay">{busyLabel}</div> : null}
                {rootPreview.loading ? <div className="overlay">Loading root...</div> : null}
                {rootPreview.error ? <div className="overlay error">{rootPreview.error}</div> : null}
                {rootPreview.markup ? <div className="svg-xform" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }} dangerouslySetInnerHTML={{ __html: rootPreview.markup }} /> : null}
              </div>
            </section>
            <section>
              <h3>Composited SVG ({compositeMode})</h3>
              <div className={`${viewerClass} ${bg}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onClick={onCompositeLayerClick}>
                {compositePreview.loading ? <div className="overlay">Building composite...</div> : null}
                {compositePreview.error ? <div className="overlay error">{compositePreview.error}</div> : null}
                {compositePreview.markup ? <div className="svg-xform interactive" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }} dangerouslySetInnerHTML={{ __html: compositePreview.markup }} /> : null}
              </div>
            </section>
          </div>
          {compositePreview.stats ? (
            <p className="stats">
              entries {compositePreview.stats.totalEntries} · rendered {compositePreview.stats.renderedEntries} · excluded {compositePreview.stats.excludedEntries} · used {compositePreview.stats.usedFiles} · missing {compositePreview.stats.missingFiles}
            </p>
          ) : null}
        </main>

        <aside className="panel right">
          <h2>Review</h2>
          {selectedScreen ? (
            <>
              <p><strong>Screen:</strong> {selectedScreen.name}</p>
              <p><strong>Folder:</strong> {selectedScreen.folderPath}</p>
              <p><strong>Root:</strong> {selectedScreen.rootSvgPath ?? "-"}</p>
              <p><strong>Access:</strong> {isNativeMode ? "native" : "fallback"} mode</p>
              <div className="chips">
                <button className={selectedScreen.reviewStatus === "pending" ? "active" : ""} onClick={() => updateSelectedScreen((s) => ({ ...s, reviewStatus: "pending" }))}>Pending</button>
                <button className={selectedScreen.reviewStatus === "approved" ? "active" : ""} onClick={() => updateSelectedScreen((s) => ({ ...s, reviewStatus: "approved" }))}>Approved</button>
                <button className={selectedScreen.reviewStatus === "hold" ? "active" : ""} onClick={() => updateSelectedScreen((s) => ({ ...s, reviewStatus: "hold" }))}>Hold</button>
              </div>
              <textarea value={selectedScreen.reviewNote} onChange={(event) => updateSelectedScreen((s) => ({ ...s, reviewNote: event.target.value }))} placeholder="Write note for Unity handoff." />

              <h3>Auto Exclude Preset</h3>
              <div className="preset-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={exclusionPreset.deviceChrome}
                    onChange={toggleDeviceChromePreset}
                  />
                  Auto Exclude Device Chrome
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={exclusionPreset.keyboard}
                    onChange={toggleKeyboardPreset}
                  />
                  Auto Exclude Keyboard
                </label>
              </div>

              <h3>Component Actions</h3>
              <div className="component-box">
                <p><strong>Selected:</strong> {componentSelection?.screenId === selectedScreen.id ? componentSelection.nodeName : "-"}</p>
                <p><strong>Node ID:</strong> {componentSelection?.screenId === selectedScreen.id ? (componentSelection.nodeId ?? "-") : "-"}</p>
                <p><strong>Path:</strong> {componentSelection?.screenId === selectedScreen.id ? (componentSelection.relativePath ?? "-") : "-"}</p>
                <div className="chips">
                  <button
                    onClick={excludeSelectedComponent}
                    disabled={!componentSelection || componentSelection.screenId !== selectedScreen.id}
                  >
                    Exclude
                  </button>
                  <button
                    onClick={restoreSelectedComponent}
                    disabled={
                      !componentSelection ||
                      componentSelection.screenId !== selectedScreen.id ||
                      !selectedComponentIsManualExcluded
                    }
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => void hardDeleteSelectedFile()}
                    disabled={
                      !componentSelection ||
                      componentSelection.screenId !== selectedScreen.id ||
                      !componentSelection.relativePath ||
                      !isNativeMode
                    }
                  >
                    Delete File
                  </button>
                </div>
                {!isNativeMode ? (
                  <p className="hint">Hard delete is disabled in fallback mode. Use Exclude instead.</p>
                ) : null}
                {selectedComponentIsAutoExcluded ? (
                  <p className="hint">This component is auto-excluded by current preset.</p>
                ) : null}
              </div>

              <h3>Issues</h3>
              <ul className="issues">
                {[...selectedScreen.issues, ...compositePreview.issues].map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
              <h3>Screen File Tree</h3>
              <p className="hint">Badges: ROOT | USED | UNUSED | FAILED | EXCLUDED</p>
              <div className="tree-wrap">
                <ul className="tree">
                  {[...fileTree.children.values()].map((node) =>
                    renderTree(
                      node,
                      selectedScreen,
                      usedPathSet,
                      failedPathSet,
                      effectiveExcludedPathSet,
                      manualExcludedNodeIdSet,
                      exclusionPreset,
                      componentSelection?.screenId === selectedScreen.id
                        ? componentSelection.relativePath
                        : null,
                      selectSourceFile,
                    ),
                  )}
                </ul>
              </div>
              {compositePreview.missingPaths.length > 0 ? (
                <>
                  <h3>Missing References</h3>
                  <ul className="issues">
                    {compositePreview.missingPaths.map((path) => <li key={path}>{path}</li>)}
                  </ul>
                </>
              ) : null}
            </>
          ) : <p>Select a screen to review.</p>}
        </aside>
      </div>

      <input ref={manifestInputRef} type="file" accept=".json,application/json" className="hidden" onChange={importManifestFile} />
      <input ref={exclusionsInputRef} type="file" accept=".json,application/json" className="hidden" onChange={importExclusionsFile} />
    </div>
  );
}

async function loadRootPreview(scan: ScanResult, screen: ScreenEntry): Promise<PreviewState> {
  if (!screen.rootSvgPath) {
    return { ...EMPTY_PREVIEW, error: "Root SVG not found for this screen." };
  }
  const source = scan.filesByPath.get(screen.rootSvgPath);
  if (!source) {
    return { ...EMPTY_PREVIEW, error: `Root SVG source missing: ${screen.rootSvgPath}` };
  }
  try {
    const parsed = parseSvg(await source.loadText());
    if (parsed.error) {
      return { ...EMPTY_PREVIEW, error: parsed.error };
    }
    return { ...EMPTY_PREVIEW, markup: parsed.markup };
  } catch (error) {
    return { ...EMPTY_PREVIEW, error: getErrorMessage(error) };
  }
}

async function loadCompositePreview(
  scan: ScanResult,
  aux: LoadedAuxData,
  screen: ScreenEntry,
  mode: CompositeMode,
  screenExclusion: ScreenExclusion,
  preset: ExclusionPreset,
  selectedNodeId: string | null,
): Promise<CompositeState> {
  if (!aux.layoutManifest) {
    return { ...EMPTY_COMPOSITE, error: "No _node_layout.json found in selected root." };
  }
  const selection = selectScreenLayout(screen, aux.layoutManifest, mode, scan.inputMode);
  const excludedNodeIds = new Set(screenExclusion.excludedNodeIds);
  const excludedPaths = new Set(screenExclusion.excludedPaths.map((path) => normalizePath(path)));
  const result = await buildCompositeMarkup({
    screen,
    selection,
    filesByPath: scan.filesByPath,
    failedEntries: aux.failedEntries,
    inputMode: scan.inputMode,
    excludedNodeIds,
    excludedPaths,
    preset,
    selectedNodeId,
  });
  return {
    loading: false,
    markup: result.markup,
    error: result.markup ? null : pickCompositeError(result.issues),
    issues: result.issues,
    stats: result.stats,
    usedPaths: result.usedPaths,
    failedPaths: result.failedPaths,
    missingPaths: result.missingPaths,
  };
}

function pickCompositeError(issues: string[]): string {
  const critical = issues.find((issue) =>
    /all layers excluded|no layers could|failed|missing svg file|parse failed/i.test(issue),
  );
  if (critical) {
    return critical;
  }
  return issues[issues.length - 1] ?? "Composite render failed.";
}

function parseSvg(raw: string): { markup: string | null; error: string | null } {
  try {
    const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
    if (doc.querySelector("parsererror")) {
      return { markup: null, error: "SVG parse failed." };
    }
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg") {
      return { markup: null, error: "SVG root node not found." };
    }
    return { markup: new XMLSerializer().serializeToString(root), error: null };
  } catch (error) {
    return { markup: null, error: getErrorMessage(error) };
  }
}

function buildFileTree(files: ScreenSourceFile[]): FileTreeNode {
  const root: FileTreeNode = { name: "(root)", kind: "dir", children: new Map(), file: null };
  for (const file of files) {
    const segments = getPathSegments(file.screenRelativePath);
    if (segments.length === 0) {
      continue;
    }
    let cursor = root;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;
      const kind = isLast ? "file" : "dir";
      const key = `${kind}:${segment}`;
      if (!cursor.children.has(key)) {
        cursor.children.set(key, {
          name: segment,
          kind,
          children: new Map(),
          file: isLast ? file : null,
        });
      }
      cursor = cursor.children.get(key)!;
      if (isLast) {
        cursor.file = file;
      }
    }
  }
  return root;
}

function renderTree(
  node: FileTreeNode,
  screen: ScreenEntry,
  usedPaths: Set<string>,
  failedPaths: Set<string>,
  excludedPaths: Set<string>,
  excludedNodeIds: Set<string>,
  preset: ExclusionPreset,
  selectedRelativePath: string | null,
  onSelectFile: (file: ScreenSourceFile) => void,
): ReactElement {
  const children = [...node.children.values()].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "ko");
  });

  if (node.kind === "dir") {
    return (
      <li key={`dir:${node.name}`} className="node dir">
        <details open>
          <summary>{node.name}</summary>
          {children.length > 0 ? (
            <ul>
              {children.map((child) =>
                renderTree(
                  child,
                  screen,
                  usedPaths,
                  failedPaths,
                  excludedPaths,
                  excludedNodeIds,
                  preset,
                  selectedRelativePath,
                  onSelectFile,
                ),
              )}
            </ul>
          ) : null}
        </details>
      </li>
    );
  }

  const file = node.file;
  const path = normalizePath(file?.relativePath ?? node.name);
  const badges: string[] = [];
  if (screen.rootSvgPath && normalizePath(screen.rootSvgPath) === path) {
    badges.push("ROOT");
  }
  badges.push(usedPaths.has(path) ? "USED" : "UNUSED");
  if (failedPaths.has(path)) {
    badges.push("FAILED");
  }
  const manuallyExcluded = excludedPaths.has(path) || (file?.nodeId ? excludedNodeIds.has(file.nodeId) : false);
  const autoExcluded = file ? matchesPresetForFile(file.nodeName, path, preset) : false;
  if (manuallyExcluded || autoExcluded) {
    badges.push("EXCLUDED");
  }
  const isSelected = selectedRelativePath !== null && normalizePath(selectedRelativePath) === path;
  const classNames = ["node", "file"];
  if (isSelected) {
    classNames.push("selected");
  }
  if (manuallyExcluded || autoExcluded) {
    classNames.push("excluded");
  }

  return (
    <li
      key={`file:${path}`}
      className={classNames.join(" ")}
      onClick={() => {
        if (file) {
          onSelectFile(file);
        }
      }}
    >
      <span>{node.name}</span>
      <span className="badge-row">{badges.map((badge) => <em key={`${path}:${badge}`} className={badge.toLowerCase()}>{badge}</em>)}</span>
    </li>
  );
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function downloadTextFile(fileName: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unknown error.";
}

export default App;
