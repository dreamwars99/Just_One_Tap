import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent, type WheelEvent } from "react";
import "./App.css";
import { pickDirectorySnapshot } from "./lib/fileSystem";
import { applyManifestReviews, buildReviewCsv, buildUnityManifest, parseUnityManifest } from "./lib/manifest";
import { applyStoredReviewState, loadStoredReviewState, saveStoredReviewState } from "./lib/reviewState";
import { buildInspectorProject, summarizeProject, type ScanResult } from "./lib/scanner";
import { clamp, toSafeFileStem } from "./lib/utils";
import type { InspectorProject, ReviewStatus, ScreenEntry } from "./types";

type ScreenFilter = "all" | ReviewStatus;
type PreviewBackground = "white" | "checker";

interface PreviewState {
  loading: boolean;
  markup: string | null;
  error: string | null;
}

interface NoticeState {
  type: "info" | "error";
  message: string;
}

interface ViewportState {
  zoom: number;
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  lastX: number;
  lastY: number;
}

const DEFAULT_VIEWPORT: ViewportState = {
  zoom: 1,
  x: 0,
  y: 0,
};

const PARSE_ISSUE_PREFIX = "Root SVG parse failed:";
const LOAD_ISSUE_PREFIX = "Root SVG load failed:";
const VIEWPORT_MIN = 0.15;
const VIEWPORT_MAX = 8;

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "대기",
  approved: "승인",
  hold: "보류",
};

const STATUS_OPTIONS: Array<{ value: ScreenFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "approved", label: "승인" },
  { value: "hold", label: "보류" },
  { value: "pending", label: "대기" },
];

function App() {
  const [session, setSession] = useState<ScanResult | null>(null);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<ScreenFilter>("all");
  const [previewBackground, setPreviewBackground] = useState<PreviewBackground>("checker");
  const [preview, setPreview] = useState<PreviewState>({
    loading: false,
    markup: null,
    error: null,
  });
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const manifestInputRef = useRef<HTMLInputElement>(null);
  const previewRequestRef = useRef(0);
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    saveStoredReviewState(session.storageKey, session.project);
  }, [session]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const selectedScreen = useMemo(() => {
    if (!session || !selectedScreenId) {
      return null;
    }
    return session.project.screens.find((screen) => screen.id === selectedScreenId) ?? null;
  }, [selectedScreenId, session]);

  const summary = useMemo(() => {
    if (!session) {
      return null;
    }
    return summarizeProject(session.project);
  }, [session]);

  const filteredScreens = useMemo(() => {
    if (!session) {
      return [];
    }

    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    return session.project.screens.filter((screen) => {
      if (statusFilter !== "all" && screen.reviewStatus !== statusFilter) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      const target = `${screen.name} ${screen.folderPath}`.toLowerCase();
      return target.includes(normalizedKeyword);
    });
  }, [searchKeyword, session, statusFilter]);

  const loadPreviewForScreen = useCallback(async (sessionSnapshot: ScanResult, screenId: string) => {
    const screen = sessionSnapshot.project.screens.find((item) => item.id === screenId);
    const requestId = ++previewRequestRef.current;

    if (!screen) {
      setPreview({ loading: false, markup: null, error: "선택된 화면을 찾을 수 없습니다." });
      return;
    }

    if (!screen.rootSvgPath) {
      setPreview({ loading: false, markup: null, error: "Root SVG가 없어 미리보기를 표시할 수 없습니다." });
      setSession((current) => (current ? setRuntimeIssue(current, screenId, LOAD_ISSUE_PREFIX, `${LOAD_ISSUE_PREFIX} missing root SVG.`) : current));
      return;
    }

    const source = sessionSnapshot.filesByPath.get(screen.rootSvgPath);
    if (!source) {
      setPreview({
        loading: false,
        markup: null,
        error: "Root SVG 파일을 찾을 수 없습니다. 폴더 구조를 확인하세요.",
      });
      setSession((current) =>
        current
          ? setRuntimeIssue(
              current,
              screenId,
              LOAD_ISSUE_PREFIX,
              `${LOAD_ISSUE_PREFIX} missing source file for '${screen.rootSvgPath}'.`,
            )
          : current,
      );
      return;
    }

    setPreview({ loading: true, markup: null, error: null });

    try {
      const text = await source.loadText();
      if (requestId !== previewRequestRef.current) {
        return;
      }

      const parsed = parseSvgMarkup(text);
      if (parsed.error) {
        setPreview({ loading: false, markup: null, error: parsed.error });
        setSession((current) => {
          if (!current) {
            return current;
          }
          const withLoadClean = setRuntimeIssue(current, screenId, LOAD_ISSUE_PREFIX, null);
          return setRuntimeIssue(
            withLoadClean,
            screenId,
            PARSE_ISSUE_PREFIX,
            `${PARSE_ISSUE_PREFIX} ${parsed.error}`,
          );
        });
        return;
      }

      setPreview({ loading: false, markup: parsed.markup, error: null });
      setSession((current) => (current ? clearPreviewIssues(current, screenId) : current));
    } catch (error) {
      const message = getErrorMessage(error);
      setPreview({ loading: false, markup: null, error: message });
      setSession((current) =>
        current ? setRuntimeIssue(current, screenId, LOAD_ISSUE_PREFIX, `${LOAD_ISSUE_PREFIX} ${message}`) : current,
      );
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    setBusyLabel("폴더를 스캔하는 중입니다...");
    setNotice(null);

    try {
      const snapshot = await pickDirectorySnapshot();
      if (!snapshot) {
        setBusyLabel(null);
        return;
      }

      const scanned = buildInspectorProject(snapshot);
      const saved = loadStoredReviewState(scanned.storageKey);
      const hydratedProject = saved ? applyStoredReviewState(scanned.project, saved) : scanned.project;
      const nextSession: ScanResult = {
        ...scanned,
        project: hydratedProject,
      };

      setSession(nextSession);
      setSearchKeyword("");
      setStatusFilter("all");
      setViewport(DEFAULT_VIEWPORT);

      const firstScreenId = hydratedProject.screens[0]?.id ?? null;
      setSelectedScreenId(firstScreenId);
      if (firstScreenId) {
        void loadPreviewForScreen(nextSession, firstScreenId);
      } else {
        setPreview({
          loading: false,
          markup: null,
          error: "화면 폴더를 찾지 못했습니다. 루트로 'Page 1' 같은 폴더를 선택하세요.",
        });
      }

      setNotice({
        type: "info",
        message: `화면 ${hydratedProject.screens.length}개를 로드했습니다.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: `폴더 로드 실패: ${getErrorMessage(error)}`,
      });
    } finally {
      setBusyLabel(null);
    }
  }, [loadPreviewForScreen]);

  const handleSelectScreen = useCallback(
    (screenId: string) => {
      if (!session) {
        return;
      }
      setSelectedScreenId(screenId);
      setViewport(DEFAULT_VIEWPORT);
      void loadPreviewForScreen(session, screenId);
    },
    [loadPreviewForScreen, session],
  );

  const updateSelectedScreen = useCallback(
    (updater: (screen: ScreenEntry) => ScreenEntry) => {
      if (!selectedScreenId) {
        return;
      }
      setSession((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          project: updateProjectScreen(current.project, selectedScreenId, updater),
        };
      });
    },
    [selectedScreenId],
  );

  const handleStatusChange = useCallback(
    (nextStatus: ReviewStatus) => {
      updateSelectedScreen((screen) => ({ ...screen, reviewStatus: nextStatus }));
    },
    [updateSelectedScreen],
  );

  const handleNoteChange = useCallback(
    (note: string) => {
      updateSelectedScreen((screen) => ({ ...screen, reviewNote: note }));
    },
    [updateSelectedScreen],
  );

  const handleExportManifest = useCallback(() => {
    if (!session) {
      return;
    }
    const manifest = buildUnityManifest(session.project, session.sourceFiles);
    downloadTextFile(
      "unity-inspection-manifest.json",
      JSON.stringify(manifest, null, 2),
      "application/json;charset=utf-8",
    );
    setNotice({ type: "info", message: "unity-inspection-manifest.json 파일을 저장했습니다." });
  }, [session]);

  const handleImportManifestClick = useCallback(() => {
    manifestInputRef.current?.click();
  }, []);

  const handleManifestFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!selected) {
      return;
    }
    if (!session) {
      setNotice({ type: "error", message: "먼저 SVG 폴더를 연 뒤 매니페스트를 불러오세요." });
      return;
    }

    try {
      const text = await selected.text();
      const manifest = parseUnityManifest(text);
      setSession((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          project: applyManifestReviews(current.project, manifest),
        };
      });
      setNotice({
        type: "info",
        message: `매니페스트를 불러와 상태를 동기화했습니다. (화면 ${manifest.screens.length}개)`,
      });
    } catch (error) {
      setNotice({ type: "error", message: `매니페스트 불러오기 실패: ${getErrorMessage(error)}` });
    }
  }, [session]);

  const handleExportCsv = useCallback(() => {
    if (!session) {
      return;
    }
    const csv = buildReviewCsv(session.project);
    const fileStem = toSafeFileStem(session.project.rootLabel);
    downloadTextFile(`inspection-review-${fileStem}.csv`, csv, "text/csv;charset=utf-8");
    setNotice({ type: "info", message: "검수 CSV를 저장했습니다." });
  }, [session]);

  const handleZoomIn = useCallback(() => {
    setViewport((current) => ({ ...current, zoom: clamp(current.zoom * 1.15, VIEWPORT_MIN, VIEWPORT_MAX) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((current) => ({ ...current, zoom: clamp(current.zoom * 0.87, VIEWPORT_MIN, VIEWPORT_MAX) }));
  }, []);

  const handleResetViewport = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  const handlePreviewWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (!preview.markup) {
      return;
    }
    event.preventDefault();
    const multiplier = event.deltaY < 0 ? 1.1 : 0.9;
    setViewport((current) => ({
      ...current,
      zoom: clamp(current.zoom * multiplier, VIEWPORT_MIN, VIEWPORT_MAX),
    }));
  }, [preview.markup]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!preview.markup) {
      return;
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [preview.markup]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.lastX;
    const deltaY = event.clientY - drag.lastY;
    dragStateRef.current = {
      ...drag,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    setViewport((current) => ({
      ...current,
      x: current.x + deltaX,
      y: current.y + deltaY,
    }));
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="headline">
          <p className="eyebrow">Pre-Unity QA</p>
          <h1>SVG Inspector</h1>
        </div>
        <div className="actions">
          <button type="button" className="action-btn primary" onClick={handleOpenFolder} disabled={Boolean(busyLabel)}>
            폴더 열기
          </button>
          <button type="button" className="action-btn" onClick={handleImportManifestClick} disabled={!session}>
            매니페스트 불러오기
          </button>
          <button type="button" className="action-btn" onClick={handleExportManifest} disabled={!session}>
            매니페스트 저장
          </button>
          <button type="button" className="action-btn" onClick={handleExportCsv} disabled={!session}>
            CSV 내보내기
          </button>
        </div>
      </header>

      {notice ? <div className={`notice ${notice.type}`}>{notice.message}</div> : null}

      <div className="workspace">
        <aside className="panel left-panel">
          <section className="panel-section">
            <h2>프로젝트</h2>
            {session ? (
              <>
                <p className="meta-line">
                  <span>루트</span>
                  <strong>{session.project.rootLabel}</strong>
                </p>
                <p className="meta-line">
                  <span>선택 시각</span>
                  <strong>{formatDateTime(session.project.selectedAt)}</strong>
                </p>
                {summary ? (
                  <div className="summary-grid">
                    <span>화면 {summary.screenTotal}</span>
                    <span>승인 {summary.approved}</span>
                    <span>보류 {summary.hold}</span>
                    <span>대기 {summary.pending}</span>
                    <span>SVG {summary.svgTotal}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="placeholder-text">먼저 화면 SVG 루트 폴더를 열어주세요.</p>
            )}
          </section>

          <section className="panel-section">
            <h2>화면 목록</h2>
            <input
              type="search"
              className="search-input"
              placeholder="화면명 검색"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              disabled={!session}
            />
            <div className="filter-row">
              {STATUS_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`chip ${statusFilter === option.value ? "active" : ""}`}
                  onClick={() => setStatusFilter(option.value)}
                  disabled={!session}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="screen-list">
              {filteredScreens.map((screen) => (
                <button
                  type="button"
                  key={screen.id}
                  className={`screen-item ${selectedScreenId === screen.id ? "active" : ""} ${
                    screen.issues.length > 0 ? "warning" : ""
                  }`}
                  onClick={() => handleSelectScreen(screen.id)}
                >
                  <span className="screen-title">{screen.name}</span>
                  <span className="screen-meta">
                    {STATUS_LABEL[screen.reviewStatus]} · {screen.svgCount} SVG
                    {screen.issues.length > 0 ? ` · issue ${screen.issues.length}` : ""}
                  </span>
                </button>
              ))}
              {session && filteredScreens.length === 0 ? (
                <p className="placeholder-text">필터에 맞는 화면이 없습니다.</p>
              ) : null}
            </div>
          </section>
        </aside>

        <main className="panel center-panel">
          <section className="panel-section preview-head">
            <h2>미리보기</h2>
            <div className="preview-toolbar">
              <button type="button" className="chip" onClick={handleZoomOut} disabled={!preview.markup}>
                -
              </button>
              <span className="zoom-label">{Math.round(viewport.zoom * 100)}%</span>
              <button type="button" className="chip" onClick={handleZoomIn} disabled={!preview.markup}>
                +
              </button>
              <button type="button" className="chip" onClick={handleResetViewport} disabled={!preview.markup}>
                리셋
              </button>
              <button
                type="button"
                className={`chip ${previewBackground === "checker" ? "active" : ""}`}
                onClick={() =>
                  setPreviewBackground((current) => (current === "checker" ? "white" : "checker"))
                }
              >
                배경 {previewBackground === "checker" ? "체커" : "흰색"}
              </button>
            </div>
          </section>

          <section className="preview-panel">
            {busyLabel ? <div className="overlay">{busyLabel}</div> : null}
            {!session ? (
              <div className="empty-state">
                <p>폴더를 열면 화면별 root SVG를 바로 검수할 수 있습니다.</p>
                <p>
                  규칙: 선택한 루트의 1-depth 폴더를 화면으로 보고,
                  {" "}
                  <code>{"<screenName>__*.svg"}</code>
                  {" "}
                  를 root SVG로 우선 선택합니다.
                </p>
              </div>
            ) : null}

            {session && !selectedScreen ? (
              <div className="empty-state">
                <p>좌측에서 화면을 선택하세요.</p>
              </div>
            ) : null}

            {session && selectedScreen ? (
              <div
                className={`preview-stage ${previewBackground}`}
                onWheel={handlePreviewWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {preview.loading ? <div className="overlay">SVG를 로드하는 중입니다...</div> : null}
                {preview.error ? <div className="overlay error">{preview.error}</div> : null}
                {preview.markup ? (
                  <div
                    className="svg-transform"
                    style={{
                      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                    }}
                    dangerouslySetInnerHTML={{ __html: preview.markup }}
                  />
                ) : null}
              </div>
            ) : null}
          </section>
        </main>

        <aside className="panel right-panel">
          <section className="panel-section">
            <h2>검수 정보</h2>
            {!selectedScreen ? (
              <p className="placeholder-text">화면을 선택하면 검수 상태를 편집할 수 있습니다.</p>
            ) : (
              <>
                <p className="meta-line">
                  <span>화면</span>
                  <strong>{selectedScreen.name}</strong>
                </p>
                <p className="meta-line">
                  <span>폴더</span>
                  <strong>{selectedScreen.folderPath}</strong>
                </p>
                <p className="meta-line">
                  <span>Root SVG</span>
                  <strong>{selectedScreen.rootSvgPath ?? "-"}</strong>
                </p>
                <p className="meta-line">
                  <span>SVG 수</span>
                  <strong>{selectedScreen.svgCount}</strong>
                </p>
                <div className="status-row">
                  <button
                    type="button"
                    className={`chip ${selectedScreen.reviewStatus === "pending" ? "active" : ""}`}
                    onClick={() => handleStatusChange("pending")}
                  >
                    대기
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedScreen.reviewStatus === "approved" ? "active" : ""}`}
                    onClick={() => handleStatusChange("approved")}
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className={`chip ${selectedScreen.reviewStatus === "hold" ? "active" : ""}`}
                    onClick={() => handleStatusChange("hold")}
                  >
                    보류
                  </button>
                </div>
                <label className="note-label" htmlFor="reviewNote">
                  메모
                </label>
                <textarea
                  id="reviewNote"
                  className="note-input"
                  value={selectedScreen.reviewNote}
                  onChange={(event) => handleNoteChange(event.target.value)}
                  placeholder="Unity 전달 전 확인 사항을 적어주세요."
                />
                <h3 className="issue-title">이슈</h3>
                {selectedScreen.issues.length === 0 ? (
                  <p className="placeholder-text">현재 이슈 없음</p>
                ) : (
                  <ul className="issue-list">
                    {selectedScreen.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </aside>
      </div>

      <input
        ref={manifestInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden-input"
        onChange={handleManifestFileChange}
      />
    </div>
  );
}

function updateProjectScreen(
  project: InspectorProject,
  screenId: string,
  updater: (screen: ScreenEntry) => ScreenEntry,
): InspectorProject {
  return {
    ...project,
    screens: project.screens.map((screen) => (screen.id === screenId ? updater(screen) : screen)),
  };
}

function setRuntimeIssue(
  current: ScanResult,
  screenId: string,
  issuePrefix: string,
  message: string | null,
): ScanResult {
  return {
    ...current,
    project: updateProjectScreen(current.project, screenId, (screen) => ({
      ...screen,
      issues: replaceIssueByPrefix(screen.issues, issuePrefix, message),
    })),
  };
}

function clearPreviewIssues(current: ScanResult, screenId: string): ScanResult {
  const withoutLoad = setRuntimeIssue(current, screenId, LOAD_ISSUE_PREFIX, null);
  return setRuntimeIssue(withoutLoad, screenId, PARSE_ISSUE_PREFIX, null);
}

function replaceIssueByPrefix(
  issues: string[],
  prefix: string,
  message: string | null,
): string[] {
  const filtered = issues.filter((issue) => !issue.startsWith(prefix));
  if (message) {
    filtered.push(message);
  }
  return filtered;
}

function parseSvgMarkup(rawSvg: string): { markup: string | null; error: string | null } {
  try {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(rawSvg, "image/svg+xml");

    if (parsed.querySelector("parsererror")) {
      return {
        markup: null,
        error: "SVG 파싱 실패. 파일이 손상되었거나 XML 형식이 잘못되었습니다.",
      };
    }

    const root = parsed.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg") {
      return {
        markup: null,
        error: "SVG 루트 노드를 찾지 못했습니다.",
      };
    }

    const serializer = new XMLSerializer();
    return {
      markup: serializer.serializeToString(root),
      error: null,
    };
  } catch (error) {
    return {
      markup: null,
      error: getErrorMessage(error),
    };
  }
}

function formatDateTime(isoValue: string): string {
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return isoValue;
  }
  return parsed.toLocaleString();
}

function downloadTextFile(fileName: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

export default App;
