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
  },
  {
    name: 'apply_filter',
    description: 'Apply an image/pixel filter (contrast, hue_saturation, grayscale, invert, sepia, posterize, blur, crt, pixel_outline, wobble, wave) to a 2D layer.',
    inputSchema: {
      type: 'object',
      required: ['filter'],
      properties: {
        filter: {
          type: 'string',
          enum: ['contrast', 'hue_saturation', 'grayscale', 'invert', 'sepia', 'posterize', 'blur', 'crt', 'pixel_outline', 'wobble', 'wave']
        },
        layerIndex: { type: 'integer' },
        amount: { type: 'number', description: 'Contrast amount (-254..254).' },
        brightness: { type: 'number', description: 'Brightness offset (-255..255).' },
        hue: { type: 'number', description: 'Hue shift in degrees (-180..180).' },
        saturation: { type: 'number', description: 'Saturation shift (-100..100).' },
        lightness: { type: 'number', description: 'Lightness shift (-100..100).' },
        levels: { type: 'integer', minimum: 2, maximum: 32, description: 'Posterize levels.' },
        radius: { type: 'integer', minimum: 1, maximum: 5, description: 'Blur radius.' },
        intensity: { type: 'number', minimum: 0, maximum: 1, description: 'CRT scanline intensity.' },
        color: { type: 'string', description: 'Hex color for pixel_outline.' },
        mode: { type: 'string', enum: ['outside', 'inside'], description: 'Outline placement mode.' },
        connectivity: { type: 'integer', enum: [4, 8], description: 'Outline connectivity (4 or 8).' },
        amplitude: { type: 'number', description: 'Wobble/wave amplitude in pixels.' },
        frequency: { type: 'number', description: 'Wobble/wave frequency.' },
        phase: { type: 'number', description: 'Wobble/wave phase offset.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'draw_gradient',
    description: 'Paint a linear (vertical, horizontal, diagonal) or radial gradient with optional quantization steps and Bayer 2x2 dithering onto a 2D layer.',
    inputSchema: {
      type: 'object',
      required: ['fromColor', 'toColor'],
      properties: {
        fromColor: { type: 'string' },
        toColor: { type: 'string' },
        direction: { type: 'string', enum: ['vertical', 'horizontal', 'diagonal', 'radial'] },
        steps: { type: 'integer', minimum: 2, maximum: 256 },
        dither: { type: 'boolean' },
        x: { type: 'integer' },
        y: { type: 'integer' },
        width: { type: 'integer' },
        height: { type: 'integer' },
        layerIndex: { type: 'integer' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'replace_color',
    description: 'Globally replace one hex color with another (or null to erase) on a 2D layer or across all 2D layers, with optional RGB tolerance.',
    inputSchema: {
      type: 'object',
      required: ['fromColor', 'toColor'],
      properties: {
        fromColor: { type: 'string' },
        toColor: { type: ['string', 'null'] },
        tolerance: { type: 'number', minimum: 0 },
        allLayers: { type: 'boolean' },
        layerIndex: { type: 'integer' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'transform_canvas',
    description: 'Resize the project canvas (crop/pad or nearest-neighbor scale) or transform 2D layers (flip_h, flip_v, rotate_cw, rotate_ccw, shift).',
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['resize', 'flip_h', 'flip_v', 'rotate_cw', 'rotate_ccw', 'shift'] },
        width: { type: 'integer', minimum: 4, maximum: 512 },
        height: { type: 'integer', minimum: 4, maximum: 512 },
        scaleContent: { type: 'boolean', description: 'When resizing, scale existing pixels using nearest-neighbor.' },
        dx: { type: 'integer' },
        dy: { type: 'integer' },
        wrap: { type: 'boolean' },
        allLayers: { type: 'boolean' },
        layerIndex: { type: 'integer' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'add_text_2d',
    description: 'Render crisp pixel text onto a new or existing 2D layer.',
    inputSchema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string' },
        x: { type: 'integer' },
        y: { type: 'integer' },
        color: { type: 'string' },
        fontSize: { type: 'integer', minimum: 5, maximum: 64 },
        fontFamily: { type: 'string' },
        createLayer: { type: 'boolean' },
        layerIndex: { type: 'integer' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'generate_normal_map',
    description: 'Auto-generate a tangent-space normal map for a 2D pixel layer so 2D lights shade it realistically.',
    inputSchema: {
      type: 'object',
      properties: {
        layerIndex: { type: 'integer' },
        strength: { type: 'number', minimum: 0.1, maximum: 10 },
        invertY: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'add_light_2d',
    description: 'Add a 2D dynamic light (light2d) layer to illuminate pixel layers and normal maps.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        x: { type: 'integer' },
        y: { type: 'integer' },
        z: { type: 'number' },
        color: { type: 'string' },
        intensity: { type: 'number' },
        radius: { type: 'number' },
        ambient: { type: 'number' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'add_particle_2d',
    description: 'Add a 2D particle emitter layer (fire, smoke, spark, snow, rain, magic) with customizable emitter parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        preset: { type: 'string', enum: ['fire', 'smoke', 'spark', 'snow', 'rain', 'magic'] },
        x: { type: 'number' },
        y: { type: 'number' },
        rate: { type: 'number' },
        life: { type: 'number' },
        speed: { type: 'number' },
        gravity: { type: 'number' },
        color: { type: 'string' },
        size: { type: 'integer' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'add_special_layer',
    description: 'Add a folder group, Parallax2D layer, or NineRect2D (9-slice panel) layer.',
    inputSchema: {
      type: 'object',
      required: ['kind'],
      properties: {
        kind: { type: 'string', enum: ['group', 'parallax2d', 'ninerect2d'] },
        name: { type: 'string' },
        speedX: { type: 'number' },
        speedY: { type: 'number' },
        x: { type: 'integer' },
        y: { type: 'integer' },
        width: { type: 'integer' },
        height: { type: 'integer' },
        borderColor: { type: 'string' },
        fillColor: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'set_3d_texture',
    description: 'Assign or clear a pixel-art or image texture on a 3D mesh object from ASCII rows+palette, an existing 2D layer, or a PNG dataUrl.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: ['number', 'string'] },
        index: { type: 'integer' },
        name: { type: 'string' },
        rows: { type: 'array', items: { type: 'string' }, description: 'ASCII texture rows.' },
        palette: { type: 'object', additionalProperties: { type: ['string', 'null'] } },
        fromLayerIndex: { type: 'integer', description: 'Copy pixels from a 2D layer as the texture.' },
        dataUrl: { type: 'string', description: 'Direct PNG data URL.' },
        filterMode: { type: 'string', enum: ['nearest', 'linear'] },
        clear: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'set_3d_material',
    description: 'Update material properties (color, roughness, metalness, opacity, wireframe, flatShading, emissive) of a 3D mesh object.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: ['number', 'string'] },
        index: { type: 'integer' },
        name: { type: 'string' },
        color: { type: 'string' },
        roughness: { type: 'number', minimum: 0, maximum: 1 },
        metalness: { type: 'number', minimum: 0, maximum: 1 },
        opacity: { type: 'number', minimum: 0, maximum: 1 },
        wireframe: { type: 'boolean' },
        flatShading: { type: 'boolean' },
        emissive: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'set_3d_fx',
    description: 'Configure 3D-to-pixel FX and shader post-processing (pixelate, paletteLimit, outlineEnabled, outlineColor, dither, textureFilter, shaderEnabled, resDown, posterize).',
    inputSchema: {
      type: 'object',
      properties: {
        pixelate: { type: 'boolean' },
        paletteLimit: { type: 'boolean' },
        outlineEnabled: { type: 'boolean' },
        outlineColor: { type: 'string' },
        dither: { type: 'boolean' },
        textureFilter: { type: 'string', enum: ['nearest', 'linear'] },
        shaderEnabled: { type: 'boolean' },
        resDown: { type: 'integer', minimum: 1, maximum: 16 },
        posterize: { type: 'integer', minimum: 2, maximum: 16 }
      },
      additionalProperties: false
    }
  },
  {
    name: 'create_3d_terrain',
    description: 'Generate and add a 3D heightmap terrain mesh (hills, mountain, island, flat) to the 3D layer.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        preset: { type: 'string', enum: ['hills', 'mountain', 'island', 'flat'] },
        size: { type: 'number', minimum: 1, maximum: 20 },
        segments: { type: 'integer', minimum: 4, maximum: 32 },
        heightScale: { type: 'number' },
        seed: { type: 'number' },
        position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        color: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'bake_3d_to_2d',
    description: 'Render/bake the current 3D scene camera view into a 2D pixel art layer.',
    inputSchema: {
      type: 'object',
      properties: {
        targetLayerName: { type: 'string' },
        createLayer: { type: 'boolean' },
        layerIndex: { type: 'integer' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'manage_anim_tags',
    description: 'List, add, or delete animation frame tags (e.g. Idle, Walk, Attack) with frame ranges and colors.',
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['list', 'add', 'delete'] },
        id: { type: 'string' },
        name: { type: 'string' },
        from: { type: 'integer', minimum: 0 },
        to: { type: 'integer', minimum: 0 },
        color: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'tilemap_2d',
    description: 'Inspect, create, or paint tiles in LufiSprite Studio 2D Tilemap Editor.',
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['get_state', 'create', 'set_tiles', 'fill_rect'] },
        name: { type: 'string' },
        mapW: { type: 'integer', minimum: 2, maximum: 256 },
        mapH: { type: 'integer', minimum: 2, maximum: 256 },
        tileW: { type: 'integer', minimum: 4, maximum: 128 },
        tileH: { type: 'integer', minimum: 4, maximum: 128 },
        layerIndex: { type: 'integer' },
        x: { type: 'integer' },
        y: { type: 'integer' },
        width: { type: 'integer' },
        height: { type: 'integer' },
        tileIndex: { type: 'integer' },
        tiles: {
          type: 'array',
          items: {
            type: 'object',
            required: ['x', 'y', 'tileIndex'],
            properties: {
              x: { type: 'integer' },
              y: { type: 'integer' },
              tileIndex: { type: 'integer' }
            }
          }
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'export_asset',
    description: 'Export the active project as a PNG, horizontal Sprite Sheet PNG + atlas JSON, Wavefront .obj text, or .lufi project JSON.',
    inputSchema: {
      type: 'object',
      required: ['format'],
      properties: {
        format: { type: 'string', enum: ['png', 'spritesheet', 'obj', 'lufi_json'] },
        scale: { type: 'integer', minimum: 1, maximum: 8 }
      },
      additionalProperties: false
    }
  }
];

module.exports = { TOOLS };
