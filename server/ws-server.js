'use strict';

const http = require('http');
const crypto = require('crypto');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function encodeWsFrame(opcode, payloadBuf) {
  const len = payloadBuf.length;
  let header;
  if (len < 126) {
    header = Buffer.allocUnsafe(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payloadBuf]);
}

function createBridgeServer(options = {}) {
  const host = options.host || '127.0.0.1';
  const port = Number(options.port || 41924);
  const log = options.log || (msg => process.stderr.write(`[lufisprite-mcp] ${msg}\n`));

  let activeClient = null;
  let clientInfo = null;
  let nextReqId = 1;
  const pending = new Map();

  function rejectAllPending(reason) {
    for (const [id, entry] of pending.entries()) {
      clearTimeout(entry.timer);
      entry.reject(new Error(reason));
      pending.delete(id);
    }
  }

  function sendText(socket, text) {
    if (!socket || socket.destroyed || !socket.writable) return false;
    const frame = encodeWsFrame(0x1, Buffer.from(text, 'utf8'));
    socket.write(frame);
    return true;
  }

  function sendPong(socket, data) {
    if (!socket || socket.destroyed || !socket.writable) return;
    socket.write(encodeWsFrame(0xA, data || Buffer.alloc(0)));
  }

  function sendClose(socket, code = 1000, reason = '') {
    if (!socket || socket.destroyed || !socket.writable) return;
    const rBuf = Buffer.from(reason, 'utf8');
    const buf = Buffer.allocUnsafe(2 + rBuf.length);
    buf.writeUInt16BE(code, 0);
    rBuf.copy(buf, 2);
    socket.write(encodeWsFrame(0x8, buf));
  }

  function handleClientJson(socket, str) {
    let msg;
    try {
      msg = JSON.parse(str);
    } catch (e) {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'hello') {
      clientInfo = {
        app: msg.app || 'LufiSprite Studio',
        version: msg.version || 'unknown',
        capabilities: Array.isArray(msg.capabilities) ? msg.capabilities : [],
        connectedAt: new Date().toISOString()
      };
      log(`Browser client connected: ${clientInfo.app} v${clientInfo.version}`);
      return;
    }

    if (msg.type === 'pong') {
      return;
    }

    if (msg.type === 'tool_result' && msg.id !== undefined) {
      const entry = pending.get(msg.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(msg.id);
      if (msg.ok) entry.resolve(msg.result);
      else entry.reject(new Error(msg.error || 'Tool execution failed in LufiSprite Studio.'));
    }
  }

  function attachWsParser(socket) {
    let rxBuf = Buffer.alloc(0);
    let fragOpcode = null;
    let fragChunks = [];

    socket.on('data', chunk => {
      rxBuf = Buffer.concat([rxBuf, chunk]);

      while (rxBuf.length >= 2) {
        const b0 = rxBuf[0];
        const b1 = rxBuf[1];
        const fin = (b0 & 0x80) !== 0;
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;
        let payloadLen = b1 & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (rxBuf.length < offset + 2) break;
          payloadLen = rxBuf.readUInt16BE(offset);
          offset += 2;
        } else if (payloadLen === 127) {
          if (rxBuf.length < offset + 8) break;
          const bigLen = rxBuf.readBigUInt64BE(offset);
          payloadLen = Number(bigLen);
          offset += 8;
        }

        const maskLen = masked ? 4 : 0;
        if (rxBuf.length < offset + maskLen + payloadLen) break;

        let maskKey = null;
        if (masked) {
          maskKey = rxBuf.subarray(offset, offset + 4);
          offset += 4;
        }

        const payload = Buffer.from(rxBuf.subarray(offset, offset + payloadLen));
        rxBuf = rxBuf.subarray(offset + payloadLen);

        if (masked && maskKey) {
          for (let i = 0; i < payload.length; i++) {
            payload[i] ^= maskKey[i & 3];
          }
        }

        if (opcode === 0x8) {
          sendClose(socket, 1000, 'bye');
          socket.end();
          return;
        }
        if (opcode === 0x9) {
          sendPong(socket, payload);
          continue;
        }
        if (opcode === 0xA) {
          continue;
        }

        if (opcode === 0x0) {
          if (fragOpcode === null) continue;
          fragChunks.push(payload);
          if (fin) {
            const full = Buffer.concat(fragChunks);
            const op = fragOpcode;
            fragOpcode = null;
            fragChunks = [];
            if (op === 0x1) handleClientJson(socket, full.toString('utf8'));
          }
        } else if (opcode === 0x1 || opcode === 0x2) {
          if (fin) {
            if (opcode === 0x1) handleClientJson(socket, payload.toString('utf8'));
          } else {
            fragOpcode = opcode;
            fragChunks = [payload];
          }
        }
      }
    });
  }

  const httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        connected: !!(activeClient && !activeClient.destroyed),
        client: clientInfo,
        wsUrl: `ws://${host}:${port}`
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  httpServer.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    const upgrade = (req.headers['upgrade'] || '').toLowerCase();
    if (!key || upgrade !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const accept = crypto
      .createHash('sha1')
      .update(String(key).trim() + WS_GUID)
      .digest('base64');

    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n'
    ].join('\r\n'));

    if (activeClient && activeClient !== socket) {
      try {
        sendClose(activeClient, 1000, 'Replaced by newer client');
        activeClient.destroy();
      } catch (e) {}
      rejectAllPending('Connection replaced by another LufiSprite Studio tab.');
    }

    activeClient = socket;
    clientInfo = { app: 'LufiSprite Studio', version: 'connecting', connectedAt: new Date().toISOString() };
    attachWsParser(socket);

    const cleanup = () => {
      if (activeClient === socket) {
        activeClient = null;
        clientInfo = null;
        rejectAllPending('LufiSprite Studio WebSocket disconnected.');
        log('Browser client disconnected.');
      }
    };
    socket.on('close', cleanup);
    socket.on('error', cleanup);
  });

  function callTool(name, args = {}, timeoutMs = 30000) {
    if (!activeClient || activeClient.destroyed) {
      return Promise.reject(new Error(
        `No LufiSprite Studio instance is connected to ws://${host}:${port}. ` +
        `Open LufiSprite Studio v1.224+, click the MCP plug icon in the top-right corner, and connect to ws://${host}:${port}.`
      ));
    }

    const id = nextReqId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out waiting for LufiSprite Studio to execute "${name}" (${timeoutMs}ms).`));
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer });
      const ok = sendText(activeClient, JSON.stringify({ type: 'call_tool', id, name, args }));
      if (!ok) {
        clearTimeout(timer);
        pending.delete(id);
        reject(new Error('Failed to write to LufiSprite Studio WebSocket.'));
      }
    });
  }

  function start() {
    return new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(port, host, () => {
        httpServer.removeListener('error', reject);
        const addr = httpServer.address();
        log(`WebSocket bridge listening on ws://${host}:${addr.port}`);
        resolve({ host, port: addr.port });
      });
    });
  }

  function close() {
    rejectAllPending('Bridge server shutting down.');
    if (activeClient) {
      try {
        sendClose(activeClient, 1001, 'Server closing');
        activeClient.destroy();
      } catch (e) {}
      activeClient = null;
    }
    return new Promise(resolve => {
      httpServer.close(() => resolve());
    });
  }

  return {
    start,
    close,
    callTool,
    isConnected: () => !!(activeClient && !activeClient.destroyed),
    getClientInfo: () => clientInfo
  };
}

module.exports = { createBridgeServer };
