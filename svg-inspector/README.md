# SVG Inspector

Local QA app for checking exported Figma SVG assets before Unity import.

## What it does
1. Loads extracted SVG folders from local disk.
2. Shows **2-panel comparison** per screen:
   - Left: root screen SVG
   - Right: composited SVG from `_node_layout.json`
3. Records review status (`pending`, `approved`, `hold`) and notes.
4. Exports/Imports `unity-inspection-manifest.json`.
5. Exports review CSV.

## Supported input roots
1. `figma-svg-export-<timestamp>/` root
2. `Page 1/` style page root

If `_node_layout.json` is missing, root preview still works and composite panel shows metadata-missing state.

## Controls
1. Zoom: toolbar buttons only (`-`, `+`, `Reset`)
2. Pan: `Space + Left Drag`
3. Mouse wheel zoom: disabled

## Run
```bash
cd svg-inspector
npm install
npm run dev
```

## Build / lint
```bash
npm run build
npm run lint
```

## Composite mode
1. `All`: recommended. Excludes the screen-root SVG and prunes descendant duplicates when an ancestor export already covers the subtree. If that leaves zero renderable layers, it automatically falls back to the screen-root export.
2. `Leaf`: diagnostic mode that renders `isLeaf=true` entries only.

## File tree badges
1. `ROOT`: selected screen root SVG
2. `USED`: used by current composite result
3. `UNUSED`: present in screen folder but not used in current composite mode
4. `FAILED`: listed in `_failed.json` for the current screen
