# lufisprite-mcp

> **Model Context Protocol (MCP) Server & Agent Skill for LufiSprite Studio v1.224+**

[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-blue.svg)](#installation)
[![MCP Compatible](https://img.shields.io/badge/MCP-2024--11--05-purple.svg)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

`lufisprite-mcp` bridges **LufiSprite Studio v1.224+** with AI coding agents such as **Google Antigravity**, **Cursor**, **Claude Code**, and **Windsurf**. Just like **Blender MCP**, it lets your AI assistant control the live studio canvas in real time—creating projects, painting 2D pixel art, managing layers and animation frames, building 3D scenes/models, and inspecting its own work via PNG screenshots.

---

## Features

- **Zero External Dependencies** — Built purely on Node.js native `http`, `crypto`, `readline`, and `fs`. No `npm install` required.
- **2D Pixel Art Creation** — Paint whole sprites fast with ASCII character grids (`draw_grid_ascii`), individual pixels (`draw_pixels`), geometric shapes (`draw_shape`), flood fill (`flood_fill`), and palette management.
- **Layer & Animation Control** — Create, reorder/select, toggle visibility/opacity on 2D and 3D layers, add/duplicate animation frames, and adjust FPS.
- **3D Low-Poly Modeling & Scene Building** — Open the 3D viewport, add primitives (`cube`, `cuboid`, `sphere`, `cylinder`, `cone`, `torus`, `plane`), import procedural or custom Wavefront `.obj` meshes (`import_3d_obj`), transform objects, and add lights, cameras, groups, or bones.
- **Visual Feedback Loop** — Capture crisp 2D composite or 3D viewport PNG screenshots (`get_canvas_screenshot`) so the AI agent can visually inspect and refine what it drew.
- **Included Agent Skill (`SKILL.md`)** — Ships with [`skill/lufisprite-studio/SKILL.md`](skill/lufisprite-studio/SKILL.md) so AI agents automatically follow best practices for palette design, ASCII sprite grids, Y-up 3D modeling, and visual verification.

---

## Architecture

```text
+-----------------------------------+   stdio (JSON-RPC 2.0)   +-----------------------------------+
| AI Coding Agent                   | <----------------------> | lufisprite-mcp                    |
| (Google Antigravity / Cursor /    |                          | server/index.js                   |
|  Claude Code + SKILL.md)          |                          | WebSocket Server: 127.0.0.1:41924 |
+-----------------------------------+                          +-----------------+-----------------+
                                                                                 ^
                                                                                 | WebSocket (RFC 6455)
                                                                                 v
                                                               +-----------------------------------+
                                                               | LufiSprite Studio v1.224+         |
                                                               | (Browser / Desktop / Capacitor)   |
                                                               | Top-Right MCP Connection Panel    |
                                                               +-----------------------------------+
```

Because LufiSprite Studio runs in a web/Capacitor environment (where the browser cannot bind a listening TCP port directly), `lufisprite-mcp` starts the local WebSocket bridge on `ws://127.0.0.1:41924`, and LufiSprite Studio connects to it from its built-in **MCP** panel.

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/lufisprite-mcp.git
cd lufisprite-mcp
```

**Requirements:**
- **Node.js 18+** (`node -v`)
- **LufiSprite Studio v1.224+**

*(No `npm install` step is needed—there are zero runtime dependencies.)*

### 2. Configure Your AI Coding Tool

#### Google Antigravity
Add `lufisprite-studio` to your `~/.gemini/config/mcp_config.json` (see [`examples/antigravity-mcp-config.json`](examples/antigravity-mcp-config.json)):

```json
{
  "mcpServers": {
    "lufisprite-studio": {
      "command": "node",
      "args": [
        "C:\\path\\to\\lufisprite-mcp\\server\\index.js",
        "--port",
        "41924"
      ]
    }
  }
}
```

#### Cursor / Claude Code / Windsurf
See [`examples/cursor-mcp-config.json`](examples/cursor-mcp-config.json):

```json
{
  "mcpServers": {
    "lufisprite-studio": {
      "command": "node",
      "args": [
        "/absolute/path/to/lufisprite-mcp/server/index.js"
      ],
      "env": {
        "LUFISPRITE_MCP_PORT": "41924"
      }
    }
  }
}
```

### 3. Install the Agent Skill (`SKILL.md`)

Copy the `skill/lufisprite-studio` folder into your agent's skills directory so the AI knows the recommended 2D/3D workflows automatically:

- **Google Antigravity (Global):** `~/.gemini/config/skills/lufisprite-studio/SKILL.md`
- **Workspace-level:** `<your-project>/.agent/skills/lufisprite-studio/SKILL.md`

---

## How to Use

1. Start your AI coding agent (e.g., **Google Antigravity**)—it automatically launches `lufisprite-mcp` and opens `ws://127.0.0.1:41924`.
2. Open **LufiSprite Studio v1.224+**.
3. On the **Home Page** (top-right corner, next to the Guide and Settings buttons) or in the **Editor** top-right bar, click the **MCP plug icon**.
4. Verify the WebSocket URL is `ws://127.0.0.1:41924` (optional: enable **Auto-reconnect**) and click **Connect**.
   - The indicator dot turns **green** when connected.
   - All incoming MCP tool calls appear in real time in the **Live MCP Activity Log**.
5. Prompt your AI agent!

### Example Prompts

- **2D Pixel Art:**
  > *"Create a 32x32 pixel art project in LufiSprite Studio and draw a glowing blue mana potion with highlight shading and a cork stopper. Take a screenshot to verify."*
- **Sprite Animation:**
  > *"Add a 4-frame idle bounce animation to the current sprite at 8 FPS."*
- **3D Low-Poly Modeling:**
  > *"Open the 3D viewport in LufiSprite Studio and build a low-poly stylized pine tree next to a wooden cabin using 3D primitives and custom OBJ meshes, then inspect the 3D screenshot."*

---

## Available MCP Tools (40 Tools)

### App & Project
| Tool | Description |
| --- | --- |
| `get_app_state` | Inspect current screen (`splash`/`editor`), project dimensions, layers, 3D status, and 3D objects. |
| `create_project` | Create and open a new project (`name`, `width`, `height`, `enable3D`). |
| `list_projects` | List projects saved in LufiSprite Studio IndexedDB. |
| `open_project` | Open a saved project by `id` or `name`. |
| `undo_redo` | Undo or redo recent operations (`steps`). |

### 2D Pixel Art, Gradients, Text & Filters
| Tool | Description |
| --- | --- |
| `draw_grid_ascii` | Paint a full sprite or region using ASCII character rows + a char-to-hex palette map. |
| `draw_pixels` | Set an array of `{ x, y, color }` pixels in one undoable step. |
| `draw_shape` | Draw filled or outlined `line`, `rect`, `circle`, or `ellipse`. |
| `draw_gradient` | Paint linear or radial gradients with optional quantization steps and Bayer 2x2 dithering. |
| `flood_fill` | Contiguous 4-way flood fill starting at `(x, y)`. |
| `replace_color` | Globally replace a hex color (with optional tolerance) on one or all 2D layers. |
| `add_text_2d` | Stamp crisp pixel text onto a new or existing 2D layer. |
| `apply_filter` | Apply `contrast`, `hue_saturation`, `grayscale`, `invert`, `sepia`, `posterize`, `blur`, `crt`, `pixel_outline`, `wobble`, or `wave`. |
| `transform_canvas` | Resize the canvas (`scaleContent`) or `flip_h`, `flip_v`, `rotate_cw`, `rotate_ccw`, `shift` layers. |
| `generate_normal_map` | Auto-generate a tangent-space normal map for 2D lighting. |
| `clear_layer` | Clear all pixels on a 2D layer. |
| `get_layer_pixels` | Read non-empty pixels from a 2D layer or bounding box. |

### Layers, Lighting, Particles, Palette & Animation
| Tool | Description |
| --- | --- |
| `list_layers` | List all layers with indices, IDs, types (`2d`/`3d`/`group`/`light2d`/`particle2d`), visibility, and opacity. |
| `create_layer` | Create a new `2d` or `3d` layer. |
| `update_layer` | Select, rename, toggle visibility/opacity/blendMode, or delete a layer. |
| `add_light_2d` | Add a dynamic 2D light (`light2d`) layer. |
| `add_particle_2d` | Add a 2D particle emitter (`fire`, `smoke`, `spark`, `snow`, `rain`, `magic`). |
| `add_special_layer` | Add a `group`, `parallax2d`, or `ninerect2d` layer. |
| `set_palette_colors` | Set the active color and/or append colors to the active palette. |
| `manage_frames` | `list`, `add`, `duplicate`, `select`, `delete` animation frames or `set_fps`. |
| `manage_anim_tags` | `list`, `add`, or `delete` animation frame tags (Idle, Walk, Attack, etc.). |

### 3D Modeling, Textures, Terrains & FX
| Tool | Description |
| --- | --- |
| `open_3d_viewport` | Ensure a 3D layer exists and open the interactive 3D viewport. |
| `add_3d_primitive` | Add `cube`, `cuboid`, `sphere`, `cylinder`, `cone`, `torus`, or `plane` with position/rotation/scale/color. |
| `import_3d_obj` | Import custom/procedural Wavefront `.obj` mesh text directly into the 3D layer. |
| `create_3d_terrain` | Generate a 3D heightmap terrain (`hills`, `mountain`, `island`, `flat`). |
| `transform_3d_object` | Move, rotate (degrees), scale, recolor, rename, toggle visibility, or delete any 3D object. |
| `set_3d_texture` | Apply pixel-art ASCII textures, 2D layer textures, or PNG data URLs to 3D meshes. |
| `set_3d_material` | Edit `color`, `roughness`, `metalness`, `opacity`, `wireframe`, `flatShading`, and `emissive`. |
| `set_3d_fx` | Configure 3D pixelation, palette clamp, outlines, dithering, and shader post-FX. |
| `add_3d_scene_item` | Add `light`, `sun`, `point`, `ambient`, `camera`, `group`, or `bone`. |
| `list_3d_objects` | List all 3D objects in the 3D layer with their transforms. |
| `bake_3d_to_2d` | Render/bake the 3D scene directly into a 2D pixel art layer. |

### Tilemap, Export & Visual Inspection
| Tool | Description |
| --- | --- |
| `tilemap_2d` | Inspect, create, or paint tiles in the 2D Tilemap Editor. |
| `export_asset` | Export `png`, `spritesheet` (with atlas JSON), `obj`, or `lufi_json`. |
| `get_canvas_screenshot` | Capture a PNG screenshot of the `2d` composite canvas or `3d` viewport/layer. |

---

## CLI Options & Health Endpoint

- `--port <number>` or `LUFISPRITE_MCP_PORT`: WebSocket bridge port (default: `41924`)
- `--host <ip>` or `LUFISPRITE_MCP_HOST`: Bind address (default: `127.0.0.1`)
- Health check endpoint: `GET http://127.0.0.1:41924/health` returns JSON `{ ok, connected, client, wsUrl }`.

---

## Running Tests

```bash
npm test
```

Runs `test/test-mcp-server.js`, verifying MCP `initialize`, `tools/list` (23 tools), `/health` endpoint, WebSocket client connection, JSON tool calls, and >64 KB base64 PNG image round-trips.

---

## Troubleshooting

- **"No LufiSprite Studio instance is connected to ws://127.0.0.1:41924"**
  Open LufiSprite Studio v1.224+, click the **MCP** plug button in the top-right corner, and click **Connect**.
- **Port `41924` already in use**
  Pass `--port 41925` in `mcp_config.json`, restart your MCP client, and select the `localhost:41925` preset in LufiSprite Studio's MCP panel.
- **Standalone / Manual Bridge Check**
  You can test the bridge directly with `node server/index.js --port 41924` and open `http://127.0.0.1:41924/health` in your browser.

---

## License

[MIT](LICENSE)
