import type { InspectorProject, ReviewStatus } from "../types";

interface StoredReviewEntry {
  id: string;
  reviewStatus: ReviewStatus;
  reviewNote: string;
}

interface StoredReviewState {
  version: 1;
  savedAt: string;
  rootLabel: string;
  screens: StoredReviewEntry[];
}

export function loadStoredReviewState(storageKey: string): StoredReviewState | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoredReviewState(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredReviewState(storageKey: string, project: InspectorProject): void {
  const payload: StoredReviewState = {
    version: 1,
    savedAt: new Date().toISOString(),
    rootLabel: project.rootLabel,
    screens: project.screens.map((screen) => ({
      id: screen.id,
      reviewStatus: screen.reviewStatus,
      reviewNote: screen.reviewNote,
    })),
  };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // localStorage may be full or unavailable in private contexts.
  }
}

export function applyStoredReviewState(
  project: InspectorProject,
  stored: StoredReviewState,
): InspectorProject {
  const byId = new Map<string, StoredReviewEntry>();
  for (const entry of stored.screens) {
    byId.set(entry.id, entry);
  }

  return {
    ...project,
    screens: project.screens.map((screen) => {
      const matched = byId.get(screen.id);
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

function isValidStoredReviewState(value: unknown): value is StoredReviewState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<StoredReviewState>;
  if (candidate.version !== 1) {
    return false;
  }
  if (!Array.isArray(candidate.screens)) {
    return false;
  }
  return candidate.screens.every((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const casted = entry as Partial<StoredReviewEntry>;
    return (
      typeof casted.id === "string" &&
      isReviewStatus(casted.reviewStatus) &&
      typeof casted.reviewNote === "string"
    );
  });
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === "pending" || value === "approved" || value === "hold";
}
