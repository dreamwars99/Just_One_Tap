import { getPathSegments, normalizePath } from "./utils";

export interface SourceFile {
  relativePath: string;
  name: string;
  loadText: () => Promise<string>;
}

export interface DirectorySnapshot {
  rootLabel: string;
  selectedAt: string;
  files: SourceFile[];
  directories: string[];
  accessMode: "native" | "fallback";
  nativeRootHandle?: FileSystemDirectoryHandle;
}

interface PickerWindow extends Window {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
}

interface DirectoryIterableHandle {
  entries?: () => AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
  values?: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
}

export async function pickDirectorySnapshot(): Promise<DirectorySnapshot | null> {
  const pickerWindow = window as PickerWindow;
  if (typeof pickerWindow.showDirectoryPicker === "function") {
    return pickWithNativeDirectoryHandle(() => pickerWindow.showDirectoryPicker!());
  }
  return pickWithInputFallback();
}

export async function rescanNativeDirectory(
  rootHandle: FileSystemDirectoryHandle,
): Promise<DirectorySnapshot> {
  return snapshotFromNativeRoot(rootHandle);
}

export async function removeNativeFile(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<void> {
  const segments = getPathSegments(relativePath);
  if (segments.length === 0) {
    throw new Error("Invalid file path.");
  }

  let currentDir = rootHandle;
  for (let index = 0; index < segments.length - 1; index += 1) {
    currentDir = await currentDir.getDirectoryHandle(segments[index]);
  }

  await currentDir.removeEntry(segments[segments.length - 1], { recursive: false });
}

async function pickWithNativeDirectoryHandle(
  picker: () => Promise<FileSystemDirectoryHandle>,
): Promise<DirectorySnapshot | null> {
  try {
    const root = await picker();
    return snapshotFromNativeRoot(root);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  }
}

async function snapshotFromNativeRoot(
  root: FileSystemDirectoryHandle,
): Promise<DirectorySnapshot> {
  const files: SourceFile[] = [];
  const directories = new Set<string>();
  await walkDirectory(root, "", files, directories);

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "ko"));
  const sortedDirectories = [...directories].sort((left, right) =>
    left.localeCompare(right, "ko"),
  );

  return {
    rootLabel: root.name,
    selectedAt: new Date().toISOString(),
    files,
    directories: sortedDirectories,
    accessMode: "native",
    nativeRootHandle: root,
  };
}

async function walkDirectory(
  handle: FileSystemDirectoryHandle,
  currentPath: string,
  files: SourceFile[],
  directories: Set<string>,
): Promise<void> {
  const entries = await readDirectoryEntries(handle);
  entries.sort((left, right) => left.name.localeCompare(right.name, "ko"));

  for (const entry of entries) {
    const name = entry.name;
    const relativePath = normalizePath(currentPath ? `${currentPath}/${name}` : name);
    if (entry.kind === "directory") {
      directories.add(relativePath);
      await walkDirectory(entry, relativePath, files, directories);
      continue;
    }

    const fileHandle = entry;
    files.push({
      relativePath,
      name,
      loadText: async () => {
        const file = await fileHandle.getFile();
        return file.text();
      },
    });
  }
}

async function readDirectoryEntries(
  handle: FileSystemDirectoryHandle,
): Promise<Array<FileSystemDirectoryHandle | FileSystemFileHandle>> {
  const entries: Array<FileSystemDirectoryHandle | FileSystemFileHandle> = [];
  const iterable = handle as unknown as DirectoryIterableHandle;

  if (typeof iterable.entries === "function") {
    for await (const [, entry] of iterable.entries()) {
      entries.push(entry);
    }
    return entries;
  }

  if (typeof iterable.values === "function") {
    for await (const entry of iterable.values()) {
      entries.push(entry);
    }
    return entries;
  }

  throw new Error("Directory iteration is not supported in this browser.");
}

function pickWithInputFallback(): Promise<DirectorySnapshot | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    (input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
    input.style.display = "none";
    document.body.appendChild(input);

    let settled = false;

    const cleanup = (): void => {
      settled = true;
      input.remove();
      window.removeEventListener("focus", onWindowFocus);
    };

    const onWindowFocus = (): void => {
      window.setTimeout(() => {
        if (!settled) {
          cleanup();
          resolve(null);
        }
      }, 250);
    };

    input.addEventListener(
      "change",
      () => {
        const selectedFiles = Array.from(input.files ?? []);
        cleanup();

        if (selectedFiles.length === 0) {
          resolve(null);
          return;
        }

        const firstPath =
          normalizePath(selectedFiles[0].webkitRelativePath || selectedFiles[0].name) ||
          "selected-root";
        const rootLabel = getPathSegments(firstPath)[0] ?? "selected-root";
        const directories = new Set<string>();
        const files: SourceFile[] = [];

        for (const file of selectedFiles) {
          const rawPath = normalizePath(file.webkitRelativePath || file.name);
          if (!rawPath) {
            continue;
          }

          const segments = getPathSegments(rawPath);
          const relativeSegments =
            segments.length > 1 && segments[0] === rootLabel ? segments.slice(1) : segments;
          if (relativeSegments.length === 0) {
            continue;
          }

          const relativePath = relativeSegments.join("/");
          for (let depth = 1; depth < relativeSegments.length; depth += 1) {
            directories.add(relativeSegments.slice(0, depth).join("/"));
          }

          files.push({
            relativePath,
            name: file.name,
            loadText: () => file.text(),
          });
        }

        files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "ko"));
        const sortedDirectories = [...directories].sort((left, right) =>
          left.localeCompare(right, "ko"),
        );

        resolve({
          rootLabel,
          selectedAt: new Date().toISOString(),
          files,
          directories: sortedDirectories,
          accessMode: "fallback",
        });
      },
      { once: true },
    );

    window.addEventListener("focus", onWindowFocus, { once: true });
    input.click();
  });
}
