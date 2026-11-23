#!/usr/bin/env node
'use strict';

const readline = require('readline');
const { createBridgeServer } = require('./ws-server');
const { TOOLS } = require('./tools-schema');

function parseArgs(argv) {
  let host = process.env.LUFISPRITE_MCP_HOST || '127.0.0.1';
  let port = Number(process.env.LUFISPRITE_MCP_PORT || 41924);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--port' || a === '-p') && argv[i + 1]) {
      port = Number(argv[++i]);
    } else if (a.startsWith('--port=')) {
      port = Number(a.slice('--port='.length));
    } else if ((a === '--host' || a === '-h') && argv[i + 1]) {
      host = argv[++i];
    } else if (a.startsWith('--host=')) {
      host = a.slice('--host='.length);
    }
  }
  return { host, port };
}

function writeJsonRpc(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function sendResult(id, result) {
  writeJsonRpc({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message, data) {
  const err = { code, message };
  if (data !== undefined) err.data = data;
  writeJsonRpc({ jsonrpc: '2.0', id, error: err });
}

async function main() {
  const { host, port } = parseArgs(process.argv.slice(2));
  const bridge = createBridgeServer({ host, port });

  try {
    await bridge.start();
  } catch (err) {
    process.stderr.write(`[lufisprite-mcp] Failed to start WebSocket bridge on ${host}:${port}: ${err.message}\n`);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity
  });

  async function handleMessage(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let req;
    try {
      req = JSON.parse(trimmed);
    } catch (e) {
      sendError(null, -32700, 'Parse error');
      return;
    }

    const { id, method, params } = req;
    const hasId = id !== undefined && id !== null;

    if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
      return;
    }

    if (method === 'initialize') {
      if (hasId) {
        sendResult(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'lufisprite-mcp',
            version: '1.0.0'
          }
        });
      }
      return;
    }

    if (method === 'ping') {
      if (hasId) sendResult(id, {});
      return;
    }

    if (method === 'tools/list') {
      if (hasId) sendResult(id, { tools: TOOLS });
      return;
    }

    if (method === 'tools/call') {
      if (!hasId) return;
      const toolName = params && params.name;
      const toolArgs = (params && params.arguments) || {};
      if (!toolName || !TOOLS.some(t => t.name === toolName)) {
        sendError(id, -32602, `Unknown tool: ${toolName}`);
        return;
      }

      try {
        const res = await bridge.callTool(toolName, toolArgs);
        const content = [];
        if (res && typeof res === 'object' && res._imageBase64) {
          const { _imageBase64, _imageMimeType, ...meta } = res;
          content.push({
            type: 'text',
            text: JSON.stringify(meta, null, 2)
          });
          content.push({
            type: 'image',
            data: _imageBase64,
            mimeType: _imageMimeType || 'image/png'
          });
        } else {
          content.push({
            type: 'text',
            text: typeof res === 'string' ? res : JSON.stringify(res, null, 2)
          });
        }
        sendResult(id, { content, isError: false });
      } catch (err) {
        sendResult(id, {
          content: [{ type: 'text', text: err.message || String(err) }],
          isError: true
        });
      }
      return;
    }

    if (hasId) {
      sendError(id, -32601, `Method not found: ${method}`);
    }
  }

  rl.on('line', line => {
    handleMessage(line).catch(err => {
      process.stderr.write(`[lufisprite-mcp] Unhandled message error: ${err.stack || err.message}\n`);
    });
  });

  const shutdown = async () => {
    try { await bridge.close(); } catch (e) {}
    process.exit(0);
  };

  rl.on('close', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
