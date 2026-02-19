figma.showUI(__html__, { width: 460, height: 600, themeColors: true });

const DEFAULT_SETTINGS = {
  scope: "selection",
  includeHidden: false,
  includeLocked: true,
  onlyLeafNodes: false,
  outlineText: false
};

const ZIP_VERSION = 20;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_STORE_METHOD = 0;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      if ((c & 1) !== 0) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c >>>= 1;
      }
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const SCREEN_FOLDER_FALLBACK = "_screen";

function sanitizeSegment(name) {
  const safe = String(name || "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return safe.length > 0 ? safe : "_unnamed";
}

function isContainerNode(node) {
  return "children" in node && Array.isArray(node.children);
}

function isPageNode(node) {
  return !!node && node.type === "PAGE";
}

function isExportableNode(node) {
  return typeof node.exportAsync === "function";
}

function getPageNode(node) {
  let current = node;
  while (current && !isPageNode(current)) {
    current = current.parent;
  }
  return isPageNode(current) ? current : null;
}

function getScreenRootNode(node, pageNode) {
  if (!node) {
    return null;
  }
  if (!pageNode) {
    return node;
  }

  let current = node;
  while (current.parent && current.parent !== pageNode && !isPageNode(current.parent)) {
    current = current.parent;
  }
  return current;
}

function distanceFromAncestor(node, ancestor) {
  if (!node || !ancestor) {
    return 0;
  }

  let depth = 0;
  let current = node;
  while (current && current !== ancestor) {
    current = current.parent;
    depth += 1;
  }
  return current === ancestor ? depth : 0;
}

function getNodeParentId(node) {
  if (!node || !node.parent || typeof node.parent.id !== "string") {
    return null;
  }
  return node.parent.id;
}

function toBBox(boundsLike) {
  if (!boundsLike) {
    return null;
  }

  const x = Number(boundsLike.x);
  const y = Number(boundsLike.y);
  const width = Number(boundsLike.width);
  const height = Number(boundsLike.height);

  if (![x, y, width, height].every((value) => Number.isFinite(value))) {
    return null;
  }

  return { x, y, width, height };
}

function readNodeBounds(node) {
  try {
    if ("absoluteRenderBounds" in node && node.absoluteRenderBounds) {
      const bbox = toBBox(node.absoluteRenderBounds);
      if (bbox) {
        return { bbox, issues: [] };
      }
    }

    if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
      const bbox = toBBox(node.absoluteBoundingBox);
      if (bbox) {
        return { bbox, issues: [] };
      }
    }

    return { bbox: null, issues: [] };
  } catch (error) {
    return {
      bbox: null,
      issues: ["Failed to read bounds: " + (error && error.message ? error.message : String(error))]
    };
  }
}

function createRootContext(root) {
  const pageNode = getPageNode(root);
  const pageName = pageNode ? pageNode.name : figma.currentPage.name;
  const pageSegment = pageNode ? sanitizeSegment(pageNode.name || pageNode.type) : null;

  const screenRootNode = getScreenRootNode(root, pageNode) || root;
  const screenRootId = screenRootNode && typeof screenRootNode.id === "string" ? screenRootNode.id : root.id;
  const screenFolder = sanitizeSegment(
    (screenRootNode && (screenRootNode.name || screenRootNode.type)) || SCREEN_FOLDER_FALLBACK
  );

  return {
    pageName,
    pageSegment,
    screenRootId,
    screenFolder,
    screenRootNode,
    depth: distanceFromAncestor(root, screenRootNode)
  };
}

function registerScreen(screenMap, context) {
  const key = `${context.pageName}::${context.screenRootId}`;
  if (screenMap.has(key)) {
    return;
  }

  const boundsResult = readNodeBounds(context.screenRootNode);
  const screenEntry = {
    pageName: context.pageName,
    screenRootId: context.screenRootId,
    screenFolder: context.screenFolder,
    bbox: boundsResult.bbox
  };
  if (boundsResult.issues.length > 0) {
    screenEntry.issues = boundsResult.issues.slice();
  }

  screenMap.set(key, screenEntry);
}

function hasRenderableChildren(node, settings) {
  if (!isContainerNode(node)) {
    return false;
  }
  for (const child of node.children) {
    if (shouldVisitNode(child, settings) && isExportableNode(child)) {
      return true;
    }
    if (hasRenderableChildren(child, settings)) {
      return true;
    }
  }
  return false;
}

function shouldVisitNode(node, settings) {
  if (!settings.includeHidden && "visible" in node && node.visible === false) {
    return false;
  }
  if (!settings.includeLocked && "locked" in node && node.locked === true) {
    return false;
  }
  return true;
}

function collectTargetsFromNode(node, parentPath, settings, context, output, zIndexCounter) {
  if (!shouldVisitNode(node, settings)) {
    return;
  }

  const segment = sanitizeSegment(node.name || node.type);
  const currentPath = parentPath.concat(segment);
  const childContext = Object.assign({}, context, { depth: context.depth + 1 });

  if (isExportableNode(node)) {
    const isLeaf = !hasRenderableChildren(node, settings);
    const includeNode = !settings.onlyLeafNodes || isLeaf;
    if (includeNode) {
      const boundsResult = readNodeBounds(node);
      output.push({
        node,
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.name || node.type,
        parentId: getNodeParentId(node),
        pageName: context.pageName,
        pageSegment: context.pageSegment,
        screenRootId: context.screenRootId,
        screenFolder: context.screenFolder,
        isLeaf,
        depth: context.depth,
        zIndex: zIndexCounter.value,
        bbox: boundsResult.bbox,
        issues: boundsResult.issues,
        pathSegments: currentPath
      });
      zIndexCounter.value += 1;
    }
  }

  if (isContainerNode(node)) {
    for (const child of node.children) {
      collectTargetsFromNode(child, currentPath, settings, childContext, output, zIndexCounter);
    }
  }
}

function getRootNodes(settings) {
  if (settings.scope === "selection") {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      throw new Error("Selection scope is empty. Select at least one node or switch scope.");
    }
    return selection;
  }
  if (settings.scope === "current-page") {
    return [figma.currentPage];
  }
  if (settings.scope === "all-pages") {
    return figma.root.children;
  }
  throw new Error(`Unknown scope: ${settings.scope}`);
}

function writeUint16LE(buf, offset, value) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(buf, offset, value) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
  buf[offset + 2] = (value >>> 16) & 0xff;
  buf[offset + 3] = (value >>> 24) & 0xff;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosDate, dosTime };
}

function concatUint8Arrays(parts) {
  const totalLength = parts.reduce((acc, part) => acc + part.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function utf8Encode(value) {
  const text = String(value == null ? "" : value);
  const utf8 = unescape(encodeURIComponent(text));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i += 1) {
    bytes[i] = utf8.charCodeAt(i);
  }
  return bytes;
}

function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const { dosDate, dosTime } = toDosDateTime(now);

  for (const file of files) {
    const fileNameBytes = utf8Encode(file.path);
    const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
    const dataCrc32 = crc32(data);
    const localHeader = new Uint8Array(30);

    writeUint32LE(localHeader, 0, 0x04034b50);
    writeUint16LE(localHeader, 4, ZIP_VERSION);
    writeUint16LE(localHeader, 6, ZIP_UTF8_FLAG);
    writeUint16LE(localHeader, 8, ZIP_STORE_METHOD);
    writeUint16LE(localHeader, 10, dosTime);
    writeUint16LE(localHeader, 12, dosDate);
    writeUint32LE(localHeader, 14, dataCrc32);
    writeUint32LE(localHeader, 18, data.length);
    writeUint32LE(localHeader, 22, data.length);
    writeUint16LE(localHeader, 26, fileNameBytes.length);
    writeUint16LE(localHeader, 28, 0);

    localParts.push(localHeader, fileNameBytes, data);

    const centralHeader = new Uint8Array(46);
    writeUint32LE(centralHeader, 0, 0x02014b50);
    writeUint16LE(centralHeader, 4, ZIP_VERSION);
    writeUint16LE(centralHeader, 6, ZIP_VERSION);
    writeUint16LE(centralHeader, 8, ZIP_UTF8_FLAG);
    writeUint16LE(centralHeader, 10, ZIP_STORE_METHOD);
    writeUint16LE(centralHeader, 12, dosTime);
    writeUint16LE(centralHeader, 14, dosDate);
    writeUint32LE(centralHeader, 16, dataCrc32);
    writeUint32LE(centralHeader, 20, data.length);
    writeUint32LE(centralHeader, 24, data.length);
    writeUint16LE(centralHeader, 28, fileNameBytes.length);
    writeUint16LE(centralHeader, 30, 0);
    writeUint16LE(centralHeader, 32, 0);
    writeUint16LE(centralHeader, 34, 0);
    writeUint16LE(centralHeader, 36, 0);
    writeUint32LE(centralHeader, 38, 0);
    writeUint32LE(centralHeader, 42, offset);

    centralParts.push(centralHeader, fileNameBytes);
    offset += localHeader.length + fileNameBytes.length + data.length;
  }

  const centralDirectory = concatUint8Arrays(centralParts);
  const centralOffset = offset;
  const endHeader = new Uint8Array(22);
  writeUint32LE(endHeader, 0, 0x06054b50);
  writeUint16LE(endHeader, 4, 0);
  writeUint16LE(endHeader, 6, 0);
  writeUint16LE(endHeader, 8, files.length);
  writeUint16LE(endHeader, 10, files.length);
  writeUint32LE(endHeader, 12, centralDirectory.length);
  writeUint32LE(endHeader, 16, centralOffset);
  writeUint16LE(endHeader, 20, 0);

  const allParts = localParts.concat([centralDirectory, endHeader]);
  return concatUint8Arrays(allParts);
}

function toPath(entry) {
  const safeName = sanitizeSegment(entry.nodeName);
  const safeId = entry.nodeId.replace(/[:;]/g, "-");
  return `${entry.pathSegments.join("/")}/${safeName}__${safeId}.svg`;
}

function toRelativePath(zipPath, pageSegment) {
  if (!pageSegment) {
    return zipPath;
  }
  const prefix = `${pageSegment}/`;
  return zipPath.startsWith(prefix) ? zipPath.slice(prefix.length) : zipPath;
}

async function exportToZip(settings) {
  const roots = getRootNodes(settings);
  const targets = [];
  const screens = new Map();
  const zIndexCounter = { value: 0 };

  for (const root of roots) {
    const rootSegment = sanitizeSegment(root.name || root.type);
    if (root.type === "PAGE") {
      for (const child of root.children) {
        const context = createRootContext(child);
        registerScreen(screens, context);
        collectTargetsFromNode(child, [rootSegment], settings, context, targets, zIndexCounter);
      }
    } else {
      const context = createRootContext(root);
      registerScreen(screens, context);
      collectTargetsFromNode(root, [rootSegment], settings, context, targets, zIndexCounter);
    }
  }

  figma.ui.postMessage({
    type: "collect-summary",
    totalTargets: targets.length
  });

  if (targets.length === 0) {
    throw new Error("No exportable nodes found with current settings.");
  }

  const files = [];
  const failures = [];
  const layoutEntries = [];
  const exportSettings = {
    format: "SVG",
    svgOutlineText: settings.outlineText,
    svgIdAttribute: false
  };

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const filePath = toPath(target);
    try {
      const data = await target.node.exportAsync(exportSettings);
      files.push({ path: filePath, data });

      const entry = {
        nodeId: target.nodeId,
        parentId: target.parentId,
        nodeName: target.nodeName,
        nodeType: target.nodeType,
        pageName: target.pageName,
        screenRootId: target.screenRootId,
        screenFolder: target.screenFolder,
        isLeaf: target.isLeaf,
        depth: target.depth,
        zIndex: target.zIndex,
        bbox: target.bbox,
        zipPath: filePath,
        relativePath: toRelativePath(filePath, target.pageSegment)
      };
      if (target.issues && target.issues.length > 0) {
        entry.issues = target.issues.slice();
      }

      layoutEntries.push(entry);
    } catch (error) {
      failures.push({
        id: target.nodeId,
        name: target.nodeName,
        type: target.nodeType,
        path: filePath,
        reason: error && error.message ? error.message : String(error)
      });
    }

    if ((i + 1) % 10 === 0 || i === targets.length - 1) {
      figma.ui.postMessage({
        type: "progress",
        phase: "export",
        completed: i + 1,
        total: targets.length,
        current: filePath
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    fileName: figma.root.name,
    pageName: figma.currentPage.name,
    settings,
    totalTargets: targets.length,
    exportedCount: files.length,
    failedCount: failures.length
  };

  const nodeLayout = {
    version: 1,
    generatedAt: new Date().toISOString(),
    fileName: figma.root.name,
    scope: settings.scope,
    entries: layoutEntries,
    screens: Array.from(screens.values())
  };

  files.push({
    path: "_manifest.json",
    data: utf8Encode(JSON.stringify(manifest, null, 2))
  });
  files.push({
    path: "_failed.json",
    data: utf8Encode(JSON.stringify(failures, null, 2))
  });
  files.push({
    path: "_node_layout.json",
    data: utf8Encode(JSON.stringify(nodeLayout, null, 2))
  });

  figma.ui.postMessage({
    type: "progress",
    phase: "zip",
    completed: files.length,
    total: files.length,
    current: "Building zip..."
  });

  const zipBytes = buildZip(files);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  figma.ui.postMessage({
    type: "done",
    fileName: `figma-svg-export-${stamp}.zip`,
    zipBytes,
    exportedCount: files.length - 3,
    failedCount: failures.length,
    totalTargets: targets.length,
    layoutMetadataPath: "_node_layout.json",
    layoutEntryCount: layoutEntries.length
  });
}

figma.ui.onmessage = async (msg) => {
  if (!msg || typeof msg !== "object") {
    return;
  }

  if (msg.type === "start-export") {
    const settings = Object.assign({}, DEFAULT_SETTINGS, msg.settings || {});

    try {
      await exportToZip(settings);
    } catch (error) {
      figma.ui.postMessage({
        type: "error",
        message: error && error.message ? error.message : String(error)
      });
    }
    return;
  }

  if (msg.type === "close-plugin") {
    figma.closePlugin();
  }
};

figma.ui.postMessage({
  type: "ready",
  selectionCount: figma.currentPage.selection.length,
  currentPageName: figma.currentPage.name,
  fileName: figma.root.name
});
