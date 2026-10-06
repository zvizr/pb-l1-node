// pb-l1-node: the live fixture for Sites L1 (tests/sitesserver). built.json comes from the build
// step, which reads mode.txt: v1 and v2 serve; health500 answers 500 on /healthz; crash exits 3
// at start. health500 and crash print the probe key once, so the proof can check that the 200
// lines a failed release keeps are redacted.
'use strict';
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');

const built = JSON.parse(fs.readFileSync('built.json', 'utf8'));
const mode = built.mode;
if (mode === 'health500' || mode === 'crash') {
  console.log('pb-l1: probe key is ' + (process.env.PROBE_KEY || 'unset'));
}
if (mode === 'crash') {
  console.error('pb-l1: crash mode, exiting 3');
  process.exit(3);
}

// probe opens a TCP connection from inside the VM: REACHED or BLOCKED within 3 s.
function probe(host, port) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: 3000 });
    s.on('connect', () => { s.destroy(); resolve('REACHED'); });
    s.on('timeout', () => { s.destroy(); resolve('BLOCKED'); });
    s.on('error', () => resolve('BLOCKED'));
  });
}

const port = Number(process.env.PORT);
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://fixture');
  const text = (code, body) => { res.writeHead(code, { 'content-type': 'text/plain' }); res.end(body); };
  if (u.pathname === '/healthz') return text(mode === 'health500' ? 500 : 200, mode + '\n');
  if (u.pathname === '/') return text(200, `PB-L1-NODE mode=${mode} built=${built.stamp}\n`);
  if (u.pathname === '/env') return text(200, `greeting=${process.env.GREETING || 'unset'}\n`);
  if (u.pathname === '/whoami') return text(200, `uid=${process.getuid()} node=${process.versions.node.split('.')[0]} cwd=${process.cwd()}\n`);
  if (u.pathname === '/probe') {
    // The key travels in a header, never the URL (F25).
    if (!process.env.PROBE_KEY || req.headers['x-probe-key'] !== process.env.PROBE_KEY) return text(403, 'forbidden\n');
    const host = u.searchParams.get('host');
    const p = Number(u.searchParams.get('port'));
    if (!host || !(p > 0 && p < 65536)) return text(400, 'host and port\n');
    return text(200, `${host}:${p}=${await probe(host, p)}\n`);
  }
  return text(404, 'not found\n');
}).listen(port, () => console.log(`pb-l1: listening on ${port} mode=${mode}`));
