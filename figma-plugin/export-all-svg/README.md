# Export All Nodes To SVG (Full Tree)

This Figma plugin recursively walks the selected scope and exports every exportable node as its own SVG file.

- Full folder hierarchy is preserved.
- Each file name includes node id: `<NodeName>__<NodeId>.svg`.
- Output is downloaded as one ZIP.
- ZIP includes `_manifest.json` and `_failed.json`.

## Files
- `manifest.json`
- `code.js`
- `ui.html`

## Install (Development Plugin)
1. Open Figma Desktop app.
2. Go to `Plugins > Development > Import plugin from manifest...`
3. Select `figma-plugin/export-all-svg/manifest.json`
4. Open your design file.
5. Run plugin from `Plugins > Development > Export All Nodes To SVG (Full Tree)`.

## How To Use
1. Choose scope:
   - `Selection`: export subtree of currently selected nodes.
   - `Current page`: export full current page.
   - `All pages`: export every page in the file.
2. Optional toggles:
   - `Include hidden nodes`
   - `Include locked nodes`
   - `Only leaf render nodes` (skip container exports, export final leaves only)
   - `Outline text in SVG`
3. Click `Start Export`.
4. Wait until ZIP downloads.

## Notes
- Running this on very large files can take time and memory.
- Some node types may fail to export; check `_failed.json`.
- If you are in view-only mode and plugins are blocked by workspace policy, this plugin cannot run in that file.
