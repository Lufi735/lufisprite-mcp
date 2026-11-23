---
name: lufisprite-studio
description: Create 2D pixel art sprites, multi-frame animations, and 3D low-poly models/scenes directly inside LufiSprite Studio v1.224+ via the lufisprite-mcp bridge. Use whenever the user asks to draw pixel art, paint sprites, build animations, or create/edit 3D models or scenes in LufiSprite Studio.
---

# LufiSprite Studio MCP Skill

This skill guides AI coding agents (Google Antigravity, Cursor, Claude Code, etc.) on how to create high-quality 2D pixel art, animations, and 3D models inside a live **LufiSprite Studio** session using the `lufisprite-mcp` MCP server.

## 1. Connection & Preflight Check

Before drawing or modeling, always call `get_app_state` first:
- **If connected and `screen === "editor"`**: Inspect `project.width`, `project.height`, `layers`, `enable3D`, and `objects3D` so you match the user's existing canvas or scene.
- **If connected and `screen === "splash"`**: Call `create_project` (or `list_projects` + `open_project` if the user referenced an existing project).
- **If `get_app_state` returns a "No LufiSprite Studio instance is connected" error**:
  - Do NOT improvise local files as a replacement.
  - Instruct the user clearly: *"Open LufiSprite Studio v1.224+, click the MCP plug icon in the top-right corner of the home page (or editor bar), and click **Connect** to `ws://127.0.0.1:41924`."* Then wait for the user to confirm.

## 2. 2D Pixel Art Workflow

1. **Choose the right canvas size**:
   - Icons / tiles / retro sprites: `16x16` or `32x32`
   - Detailed characters / UI portraits: `48x48` or `64x64`
   - Set `enable3D: true` if the user might combine 2D and 3D layers.
2. **Design your color palette intentionally**:
   - Define 4–12 cohesive hex colors: an outline/shadow color (dark, slightly desaturated/hue-shifted — avoid pure `#000000` unless stylized), midtone, highlight, and accent colors.
   - Optionally call `set_palette_colors` so the user can see and reuse your colors in the UI swatch bar.
3. **Prefer `draw_grid_ascii` for full sprites**:
   - Painting pixel-by-pixel with `draw_pixels` is slow and hard to read. Instead, compose a clean ASCII art grid in `rows` where each character maps to a hex color in `palette` (use `.` for transparent background).
   - Every string in `rows` should be the same length and match the target width/region.
   - Use `draw_shape` (`line`, `rect`, `circle`, `ellipse`) and `flood_fill` for backgrounds, bounding boxes, and geometric bases, then refine details with `draw_grid_ascii` or `draw_pixels`.
4. **Use layers cleanly**:
   - Separate background, character/subject, and highlights/FX with `create_layer({ name, type: "2d" })` and `update_layer`.
5. **Animations**:
   - Use `manage_frames({ action: "add" })` or `manage_frames({ action: "duplicate" })` to create subsequent animation frames, then paint frame differences on the active frame. Adjust timing with `manage_frames({ action: "set_fps", fps })`.
6. **Always visually verify your work**:
   - Call `get_canvas_screenshot({ source: "2d" })` after major drawing steps to inspect proportions, silhouette, shading, and alignment. Fix defects with `draw_pixels` / `draw_grid_ascii` / `undo_redo` before concluding.

## 3. 3D Modeling & Scene Workflow

LufiSprite Studio uses a **right-handed Y-up** 3D coordinate system (`+Y` is up, `+X` is right, `+Z` is toward the default camera). Rotations in all MCP tools are specified in **degrees** `[rx, ry, rz]`.

1. **Open the 3D viewport**:
   - Call `open_3d_viewport` (this automatically enables 3D on the project and creates/focuses the `3d` layer if needed).
2. **Compose with `add_3d_primitive` for multi-part models**:
   - Supported `kind` values: `cube`, `cuboid`, `sphere`, `cylinder`, `cone`, `torus`, `plane`.
   - Give every part a descriptive `name`, `position: [x, y, z]`, `rotation: [rx, ry, rz]`, `scale: [sx, sy, sz]`, and `color: "#hex"`.
   - Example: To build a stylized tree, place a brown `cylinder` trunk at `[0, 0.5, 0]` (`params: { r: 0.18, h: 1.0 }`), then stack 2–3 green `cone` foliage tiers at `[0, 1.3, 0]`, `[0, 1.8, 0]`, etc.
3. **Create custom/organic/architectural geometry with `import_3d_obj`**:
   - When primitives aren't enough (swords, roofs, spaceships, low-poly rocks, stairs, furniture), generate valid Wavefront `.obj` text (`v x y z`, `vn nx ny nz`, `vt u v`, `f v1/vt1/vn1 ...` triangles or quads) and pass it to `import_3d_obj`.
   - Keep vertex coordinates centered around `(0, 0, 0)` or sitting on `y = 0` so `position` and `rotation` behave predictably.
4. **Organize, light, and inspect**:
   - Group related parts with `add_3d_scene_item({ kind: "group", name })` or add extra lights (`light`, `sun`, `point`, `ambient`) if you want warmer/cooler contrast.
   - Adjust existing objects anytime with `transform_3d_object` (lookup by `id`, `index`, or `name`).
   - Always call `get_canvas_screenshot({ source: "3d" })` to visually verify that parts connect properly with no floating gaps or unintended clipping!

## 4. Quick Reference — Available Tools

| Category | Tools |
| --- | --- |
| **App & Project** | `get_app_state`, `create_project`, `list_projects`, `open_project`, `undo_redo` |
| **2D Painting** | `draw_grid_ascii`, `draw_pixels`, `draw_shape`, `flood_fill`, `clear_layer`, `get_layer_pixels` |
| **Layers & Palette** | `list_layers`, `create_layer`, `update_layer`, `set_palette_colors` |
| **Animation** | `manage_frames` (`list`, `add`, `duplicate`, `select`, `delete`, `set_fps`) |
| **3D Modeling** | `open_3d_viewport`, `add_3d_primitive`, `import_3d_obj`, `transform_3d_object`, `add_3d_scene_item`, `list_3d_objects` |
| **Visual Inspection** | `get_canvas_screenshot` (`source: "2d"` or `"3d"`) |

## 5. Common Pitfalls to Avoid
- **2D coordinates**: `(0, 0)` is the **top-left** pixel; `y` increases downward.
- **Maximum one 3D layer per project**: LufiSprite Studio allows at most one `type: "3d"` layer per project, containing many 3D objects (`add_3d_primitive`, `import_3d_obj`, lights, groups, bones, cameras).
- **Screenshot before finishing**: Never assume a sprite or 3D composition looks right without inspecting `get_canvas_screenshot` at least once.
