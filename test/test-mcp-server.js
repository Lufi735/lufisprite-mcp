'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const SERVER_PATH = path.resolve(__dirname, '..', 'server', 'index.js');
const TEST_PORT = 41999;

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const proc = spawn(process.execPath, [SERVER_PATH, '--port', String(TEST_PORT)], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stdoutBuf = '';
  const pendingRpc = new Map();
  let serverReady = false;

  proc.stderr.on('data', chunk => {
    const s = chunk.toString();
    if (s.includes('WebSocket bridge listening')) serverReady = true;
  });

  proc.stdout.on('data', chunk => {
    stdoutBuf += chunk.toString();
    let idx;
    while ((idx = stdoutBuf.indexOf('\n')) !== -1) {
      const line = stdoutBuf.slice(0, idx).trim();
      stdoutBuf = stdoutBuf.slice(idx + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pendingRpc.has(msg.id)) {
        const { resolve } = pendingRpc.get(msg.id);
        pendingRpc.delete(msg.id);
        resolve(msg);
      }
    }
  });

  let rpcId = 1;
  function rpc(method, params) {
    const id = rpcId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`RPC timeout for ${method}`)), 5000);
      pendingRpc.set(id, {
        resolve: msg => {
          clearTimeout(timer);
          resolve(msg);
        }
      });
      proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  try {
    // Wait for bridge server startup
    for (let i = 0; i < 40 && !serverReady; i++) {
      await new Promise(r => setTimeout(r, 50));
    }
    assert.ok(serverReady, 'MCP bridge server should start and log listening');

    // 1. initialize
    const initRes = await rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-harness', version: '1.0.0' }
    });
    assert.strictEqual(initRes.result.serverInfo.name, 'lufisprite-mcp');

    // 2. tools/list
    const listRes = await rpc('tools/list', {});
    assert.strictEqual(listRes.result.tools.length, 40, 'Expected 40 tools');

    // 3. Health check before WebSocket client connects
    const h1 = await httpGetJson(`http://127.0.0.1:${TEST_PORT}/health`);
    assert.strictEqual(h1.ok, true);
    assert.strictEqual(h1.connected, false);

    // 4. Error when no client connected
    const noClientRes = await rpc('tools/call', { name: 'get_app_state', arguments: {} });
    assert.strictEqual(noClientRes.result.isError, true);

    // 5. Connect mock WebSocket client (using Node 24 built-in WebSocket)
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });
    ws.send(JSON.stringify({ type: 'hello', app: 'LufiSprite Studio', version: '1.224' }));

    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'call_tool') {
        if (msg.name === 'get_app_state') {
          ws.send(JSON.stringify({
            type: 'tool_result',
            id: msg.id,
            ok: true,
            result: { app: 'LufiSprite Studio', version: '1.224', screen: 'editor' }
          }));
        } else if (msg.name === 'get_canvas_screenshot') {
          // 70KB+ payload to verify 16-bit extended WS frame length handling
          const bigB64 = 'A'.repeat(70000);
          ws.send(JSON.stringify({
            type: 'tool_result',
            id: msg.id,
            ok: true,
            result: { source: '2d', _imageBase64: bigB64, _imageMimeType: 'image/png' }
          }));
        }
      }
    });

    await new Promise(r => setTimeout(r, 80));
    const h2 = await httpGetJson(`http://127.0.0.1:${TEST_PORT}/health`);
    assert.strictEqual(h2.connected, true);

    // 6. Tool call round-trip (JSON)
    const call1 = await rpc('tools/call', { name: 'get_app_state', arguments: {} });
    assert.strictEqual(call1.result.isError, false);
    assert.ok(call1.result.content[0].text.includes('1.224'));

    // 7. Tool call round-trip (large image >64KB)
    const call2 = await rpc('tools/call', { name: 'get_canvas_screenshot', arguments: { source: '2d' } });
    assert.strictEqual(call2.result.isError, false);
    assert.strictEqual(call2.result.content[1].type, 'image');
    assert.strictEqual(call2.result.content[1].data.length, 70000);

    ws.close();
    console.log('ALL lufisprite-mcp TESTS PASSED (7/7)');
  } finally {
    proc.kill();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
