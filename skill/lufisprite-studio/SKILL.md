---
name: lufisprite-studio
description: Create 2D pixel art sprites, filters, gradients, normal maps, lights, particles, animations, tilemaps, and 3D models/textures/terrains inside LufiSprite Studio v1.224+ via the lufisprite-mcp bridge. Use whenever the user asks to draw pixel art, apply effects, build animations, or create/edit 3D models or scenes in LufiSprite Studio.
---

# LufiSprite Studio MCP Skill

This skill guides AI coding agents (Google Antigravity, Cursor, Claude Code, etc.) on how to use all **40 live MCP tools** inside **LufiSprite Studio v1.224+** via `lufisprite-mcp`.

## 1. Connection & Preflight Check

Before drawing or modeling, always call `get_app_state` first:
- **If connected and `screen === "editor"`**: Inspect `project.width`, `project.height`, `layers`, `enable3D`, and `objects3D` so you match the user's existing canvas or scene.
- **If connected and `screen === "splash"`**: Call `create_project` (or `list_projects` + `open_project`).
- **If `get_app_state` returns a "No LufiSprite Studio instance is connected" error**:
  - Do NOT improvise local files as a replacement.
  - Instruct the user: *"Open LufiSprite Studio v1.224+, ensure PRO is active, click the MCP plug icon (home top-right or editor Toolbar), and click **Connect** to `ws://127.0.0.1:41924`."*

## 2. 2D Pixel Art, Filters, Lighting & FX Workflow

1. **Create / Setup**: `create_project({ width, height, enable3D })`. Optionally call `set_palette_colors`.
2. **Base Painting**:
   - Use `draw_gradient` (`vertical`, `horizontal`, `diagonal`, `radial`, optional `dither: true`) for skies/backgrounds.
   - Use `draw_grid_ascii` for fast full-sprite painting (`.` for transparent).
   - Use `draw_shape`, `draw_pixels`, `flood_fill`, `add_text_2d`, and `replace_color` for refinements and color swaps.
3. **Filters & Transforms**:
   - `apply_filter`: `pixel_outline` (great for crisp sprite outlines!), `contrast`, `hue_saturation`, `grayscale`, `invert`, `sepia`, `posterize`, `blur`, `crt`, `wobble`, `wave`.
   - `transform_canvas`: `resize` (with optional `scaleContent`), `flip_h`, `flip_v`, `rotate_cw`, `rotate_ccw`, `shift`.
4. **Dynamic 2D Lighting, Particles & Special Layers**:
   - Call `generate_normal_map` on a pixel layer and add `add_light_2d` for dynamic 2D shading.
   - Add `add_particle_2d` (`fire`, `smoke`, `spark`, `snow`, `rain`, `magic`) or `add_special_layer` (`group`, `parallax2d`, `ninerect2d`).
5. **Animation & Tags**:
   - `manage_frames` (`add`, `duplicate`, `select`, `delete`, `set_fps`) + `manage_anim_tags` (`add`, `list`, `delete` e.g. Idle/Walk/Attack).
6. **Verify Visually**: Always call `get_canvas_screenshot({ source: "2d" })` after major steps.

## 3. 3D Modeling, Textures, Terrains & Baking Workflow

LufiSprite Studio uses a **right-handed Y-up** 3D coordinate system (`+Y` up, `+X` right, `+Z` toward camera). Rotations are in **degrees** `[rx, ry, rz]`.

1. **Open 3D**: Call `open_3d_viewport` (auto-enables 3D and creates the `3d` layer).
2. **Build Geometry**:
   - `add_3d_primitive`: `cube`, `cuboid`, `sphere`, `cylinder`, `cone`, `torus`, `plane`.
   - `import_3d_obj`: custom procedural Wavefront `.obj` geometry.
   - `create_3d_terrain`: heightmap terrain (`hills`, `mountain`, `island`, `flat`).
3. **Apply Pixel Textures, PBR Materials & FX**:
   - `set_3d_texture`: paint a pixel-art texture directly onto any 3D mesh via ASCII `rows` + `palette`, or from an existing 2D layer (`fromLayerIndex`), or `dataUrl` (use `filterMode: "nearest"` for crisp pixel-art textures).
   - `set_3d_material`: adjust `color`, `roughness`, `metalness`, `opacity`, `wireframe`, `flatShading`, `emissive`.
   - `set_3d_fx`: configure 3D-to-pixel effects (`pixelate`, `paletteLimit`, `outlineEnabled`, `dither`, `shaderEnabled`, `resDown`, `posterize`).
   - `add_3d_scene_item`: add `light`, `sun`, `point`, `ambient`, `camera`, `group`, or `bone`.
   - `bake_3d_to_2d`: bake the 3D scene view directly into a 2D pixel layer!
4. **Verify Visually**: Call `get_canvas_screenshot({ source: "3d" })` to inspect alignment, textures, and lighting.

## 4. Tilemap & Export

- `tilemap_2d`: `get_state`, `create`, `set_tiles`, `fill_rect` for 2D tilemaps.
- `export_asset`: export `png`, `spritesheet` (horizontal PNG + atlas frames), `obj` (3D Wavefront OBJ text), or `lufi_json`.

## 5. Quick Reference — All 40 Tools

| Category | Tools |
| --- | --- |
| **App & Project** | `get_app_state`, `create_project`, `list_projects`, `open_project`, `undo_redo` |
| **2D Painting & Text** | `draw_grid_ascii`, `draw_pixels`, `draw_shape`, `draw_gradient`, `flood_fill`, `replace_color`, `add_text_2d`, `clear_layer`, `get_layer_pixels` |
| **Filters & Transforms** | `apply_filter`, `transform_canvas`, `generate_normal_map` |
| **Layers, FX & Palette** | `list_layers`, `create_layer`, `update_layer`, `add_light_2d`, `add_particle_2d`, `add_special_layer`, `set_palette_colors` |
| **Animation** | `manage_frames`, `manage_anim_tags` |
| **3D Modeling & Textures** | `open_3d_viewport`, `add_3d_primitive`, `import_3d_obj`, `create_3d_terrain`, `transform_3d_object`, `set_3d_texture`, `set_3d_material`, `set_3d_fx`, `add_3d_scene_item`, `list_3d_objects`, `bake_3d_to_2d` |
| **Tilemap & Export** | `tilemap_2d`, `export_asset`, `get_canvas_screenshot` |
