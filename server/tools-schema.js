'use strict';

const TOOLS = [
  {
    name: 'get_app_state',
    description: 'Get the current LufiSprite Studio state: screen (splash/editor), active project name/dimensions, 3D enabled flag, active layer/frame, layers list, and 3D objects list.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'create_project',
    description: 'Create and open a new LufiSprite Studio project with the given canvas width/height (4..512) and 3D mode enabled/disabled.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name (default: "MCP Project").' },
        width: { type: 'integer', minimum: 4, maximum: 512, description: 'Canvas width in pixels (default: 32).' },
        height: { type: 'integer', minimum: 4, maximum: 512, description: 'Canvas height in pixels (default: 32).' },
        enable3D: { type: 'boolean', description: 'Enable 3D features for this project (default: true).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'list_projects',
    description: 'List saved projects stored in LufiSprite Studio IndexedDB.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'open_project',
    description: 'Open an existing saved project by id or name.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID from list_projects.' },
        name: { type: 'string', description: 'Case-insensitive project name.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'draw_pixels',
    description: 'Paint individual pixels on a 2D layer in a single undoable operation. Coordinates are 0-based from top-left (x: 0..width-1, y: 0..height-1).',
    inputSchema: {
      type: 'object',
      required: ['pixels'],
      properties: {
        layerIndex: { type: 'integer', description: 'Target 2D layer index (defaults to active layer).' },
        pixels: {
          type: 'array',
          description: 'List of pixels to set.',
          items: {
            type: 'object',
            required: ['x', 'y', 'color'],
            properties: {
              x: { type: 'integer' },
              y: { type: 'integer' },
              color: { type: ['string', 'null'], description: 'Hex color like "#ff5500" or null/"transparent" to erase.' }
            }
          }
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'draw_grid_ascii',
    description: 'Paint an entire 2D sprite or region quickly using ASCII character rows and a char->hex color palette map. Characters "." or " " are skipped unless mapped in palette or clearBackground is true.',
    inputSchema: {
      type: 'object',
      required: ['rows', 'palette'],
      properties: {
        rows: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of equal-length strings representing pixel rows from top to bottom.'
        },
        palette: {
          type: 'object',
          additionalProperties: { type: ['string', 'null'] },
          description: 'Mapping of single character to hex color (e.g. {"#": "#1e1b2e", "R": "#e63946", ".": null}).'
        },
        offsetX: { type: 'integer', description: 'Top-left X offset on canvas (default: 0).' },
        offsetY: { type: 'integer', description: 'Top-left Y offset on canvas (default: 0).' },
        layerIndex: { type: 'integer', description: 'Target 2D layer index (defaults to active layer).' },
        clearLayer: { type: 'boolean', description: 'Clear entire target layer before painting.' },
        clearBackground: { type: 'boolean', description: 'Erase "." or space characters that are not in palette.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'draw_shape',
    description: 'Draw a 2D geometric shape (line, rect, circle, ellipse) on a 2D layer.',
    inputSchema: {
      type: 'object',
      required: ['shape', 'x', 'y', 'color'],
      properties: {
        shape: { type: 'string', enum: ['line', 'rect', 'circle', 'ellipse'] },
        x: { type: 'integer', description: 'Start X (line/rect) or center X (circle/ellipse).' },
        y: { type: 'integer', description: 'Start Y (line/rect) or center Y (circle/ellipse).' },
        x2: { type: 'integer', description: 'End X for line/rect.' },
        y2: { type: 'integer', description: 'End Y for line/rect.' },
        width: { type: 'integer', description: 'Width for rect or ellipse.' },
        height: { type: 'integer', description: 'Height for rect or ellipse.' },
        radius: { type: 'integer', description: 'Radius for circle.' },
        color: { type: 'string', description: 'Hex color string e.g. "#38bdf8".' },
        filled: { type: 'boolean', description: 'Fill interior (default: true).' },
        layerIndex: { type: 'integer', description: 'Target 2D layer index.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'flood_fill',
    description: 'Flood fill a contiguous region starting at (x, y) with the given hex color (or null to erase).',
    inputSchema: {
      type: 'object',
      required: ['x', 'y', 'color'],
      properties: {
        x: { type: 'integer' },
        y: { type: 'integer' },
        color: { type: ['string', 'null'] },
        layerIndex: { type: 'integer' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'clear_layer',
    description: 'Clear all pixels on the target 2D layer.',
    inputSchema: {
      type: 'object',
      properties: {
        layerIndex: { type: 'integer' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_layer_pixels',
    description: 'Read non-empty pixels from a 2D layer (optionally within a bounding rectangle).',
    inputSchema: {
      type: 'object',
      properties: {
        layerIndex: { type: 'integer' },
        x: { type: 'integer' },
        y: { type: 'integer' },
        width: { type: 'integer' },
        height: { type: 'integer' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'list_layers',
    description: 'List all layers in the active project with their indices, IDs, names, types (2d/3d/group), visibility, and opacity.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'create_layer',
    description: 'Create a new 2D pixel layer or 3D layer in the active project.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Layer name.' },
        type: { type: 'string', enum: ['2d', '3d'], description: 'Layer type (default: "2d").' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'update_layer',
    description: 'Select, rename, toggle visibility/opacity/blendMode, or delete a layer.',
    inputSchema: {
      type: 'object',
      required: ['layerIndex'],
      properties: {
        layerIndex: { type: 'integer' },
        action: { type: 'string', enum: ['select', 'update', 'delete'], description: 'Action to perform (default: "update").' },
        name: { type: 'string' },
        visible: { type: 'boolean' },
        opacity: { type: 'number', minimum: 0, maximum: 1 },
        blendMode: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'manage_frames',
    description: 'List, add, duplicate, select, delete animation frames, or change FPS.',
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['list', 'add', 'duplicate', 'select', 'delete', 'set_fps'] },
        frameIndex: { type: 'integer', description: 'Frame index for select/delete.' },
        fps: { type: 'integer', minimum: 1, maximum: 60, description: 'Animation FPS for set_fps.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'set_palette_colors',
    description: 'Set the active brush color and/or append hex colors to the active project palette.',
    inputSchema: {
      type: 'object',
      properties: {
        activeColor: { type: 'string', description: 'Hex color to set as active.' },
        colors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Hex colors to add to the active palette.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'open_3d_viewport',
    description: 'Ensure a 3D layer exists and open the interactive 3D viewport in LufiSprite Studio.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'add_3d_primitive',
    description: 'Add a 3D primitive mesh (cube, cuboid, sphere, cylinder, cone, torus, plane) to the project 3D layer with optional dimensions, position, rotation (degrees), scale, and hex color.',
    inputSchema: {
      type: 'object',
      required: ['kind'],
      properties: {
        kind: { type: 'string', enum: ['cube', 'cuboid', 'sphere', 'cylinder', 'cone', 'torus', 'plane'] },
        name: { type: 'string', description: 'Display name in 3D hierarchy.' },
        params: {
          type: 'object',
          description: 'Optional geometry parameters: s (cube), w/h/d (cuboid/plane), r/rTop/rBot/h/seg (sphere/cylinder/cone), r/tube (torus).'
        },
        position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        rotation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Euler XYZ rotation in degrees.' },
        scale: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        color: { type: 'string', description: 'Material hex color e.g. "#f59e0b".' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'import_3d_obj',
    description: 'Import a procedural or custom Wavefront .obj 3D mesh from raw OBJ text into the project 3D layer.',
    inputSchema: {
      type: 'object',
      required: ['objText'],
      properties: {
        objText: { type: 'string', description: 'Valid Wavefront .obj content (v, vt, vn, f lines).' },
        name: { type: 'string', description: 'Display name in 3D hierarchy.' },
        position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        rotation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Euler XYZ rotation in degrees.' },
        scale: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        color: { type: 'string', description: 'Material hex color.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'transform_3d_object',
    description: 'Move, rotate (degrees), scale, recolor, rename, toggle visibility, or delete an existing 3D object by id, index, or name.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: ['number', 'string'] },
        index: { type: 'integer' },
        name: { type: 'string', description: 'Lookup object by current name.' },
        newName: { type: 'string', description: 'Rename object to this value.' },
        position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        rotation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Euler XYZ rotation in degrees.' },
        scale: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        color: { type: 'string' },
        visible: { type: 'boolean' },
        delete: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'add_3d_scene_item',
    description: 'Add a 3D light (light, sun, point, ambient), extra camera, group, or bone to the 3D layer.',
    inputSchema: {
      type: 'object',
      required: ['kind'],
      properties: {
        kind: { type: 'string', enum: ['light', 'sun', 'point', 'ambient', 'camera', 'group', 'bone'] },
        name: { type: 'string' },
        position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        rotation: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        color: { type: 'string' },
        intensity: { type: 'number' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'list_3d_objects',
    description: 'List all objects (meshes, lights, cameras, groups, bones) in the project 3D layer with their transforms.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'get_canvas_screenshot',
    description: 'Capture a PNG screenshot of the current 2D composite canvas (source="2d") or 3D viewport/layer (source="3d") so you can visually inspect your work.',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['2d', '3d'], description: 'Capture 2D composite or 3D viewport (default: "2d").' },
        scale: { type: 'integer', minimum: 1, maximum: 16, description: 'Integer pixel upscale factor for 2D screenshots.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'undo_redo',
    description: 'Undo or redo recent actions in LufiSprite Studio.',
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['undo', 'redo'] },
        steps: { type: 'integer', minimum: 1, maximum: 50, description: 'Number of steps (default: 1).' }
      },
      additionalProperties: false
    }
  }
];

module.exports = { TOOLS };
