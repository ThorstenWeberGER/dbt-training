import http from 'http';
import { spawn, exec } from 'child_process';
import { readdir, readFile } from 'fs/promises';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAUNCHER_PORT = 9000;
const SLIDEV_PORT = 3030;


let slidevProcess = null;

function parseFrontmatterTitle(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const titleMatch = match[1].match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
  return titleMatch ? titleMatch[1] : null;
}

async function getDecks() {
  const files = await readdir(__dirname);
  const mdFiles = files
    .filter(f => f.endsWith('.md') && f !== 'CLAUDE.md' && f !== 'README.md')
    .sort();

  const decks = [];
  for (const file of mdFiles) {
    const content = await readFile(path.join(__dirname, file), 'utf8');
    const title = parseFrontmatterTitle(content);
    if (title) decks.push({ file, title });
  }
  return decks;
}

// Single-shot check — client polls this endpoint every second
function isSlidevReady() {
  return new Promise(resolve => {
    const req = http.request(
      { hostname: 'localhost', port: SLIDEV_PORT, path: '/', method: 'GET' },
      () => resolve(true)
    );
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function renderHTML(decks) {
  const cards = decks.map(({ file, title }) => {
    const label = file === 'course_overview.md'
      ? 'Overview'
      : file.replace('module_', 'M').replace('.md', '').toUpperCase();
    return `
    <div class="card">
      <div class="label">${label}</div>
      <div class="title">${title}</div>
      <button onclick="launch(event, '${file}')">&#9654; Start</button>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>dbt Training — Launcher</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #f9f8f5;
      color: #1a1a1a;
      min-height: 100vh;
      padding: 48px 32px;
    }
    header { margin-bottom: 40px; }
    header .eyebrow {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    header h1 { font-size: 28px; font-weight: 600; color: #1e293b; }
    .status { font-size: 13px; color: #64748b; margin-top: 4px; }
    .status span { font-family: 'JetBrains Mono', monospace; color: #22c55e; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      max-width: 1100px;
    }
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: box-shadow 0.15s, border-color 0.15s;
    }
    .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); border-color: #cbd5e1; }
    .label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .title { font-size: 15px; font-weight: 500; color: #1e293b; line-height: 1.4; flex: 1; }
    button {
      margin-top: 10px;
      align-self: flex-start;
      background: #1e293b;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 7px 16px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #334155; }
    button:disabled { background: #94a3b8; cursor: default; }
    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      color: #fff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    #toast.show { opacity: 1; }
  </style>
</head>
<body>
  <header>
    <div class="eyebrow">dbt Training</div>
    <h1>Select a Module</h1>
    <p class="status">Launcher on <span>:${LAUNCHER_PORT}</span> &nbsp;·&nbsp; Slidev opens on <span>:${SLIDEV_PORT}</span></p>
  </header>
  <div class="grid">
    ${cards}
  </div>
  <div id="toast"></div>
  <script>
    let toastTimer;
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
    }

    function launch(event, file) {
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = 'Starting…';
      showToast('Compiling slides — this takes a few seconds…');

      fetch('/start/' + encodeURIComponent(file), { method: 'POST' })
        .then(r => r.json())
        .then(d => {
          if (!d.ok) {
            showToast('Error: ' + d.error);
            btn.disabled = false;
            btn.textContent = '\\u25B6 Start';
            return;
          }
          // Poll /ready until Slidev is up, then open the tab
          showToast('Waiting for Slidev to be ready…');
          pollReady(btn);
        })
        .catch(() => {
          showToast('Failed to reach launcher server.');
          btn.disabled = false;
          btn.textContent = '\\u25B6 Start';
        });
    }

    function pollReady(btn) {
      fetch('/ready')
        .then(r => r.json())
        .then(d => {
          if (d.ready) {
            showToast('Opening presentation…');
            window.open('http://localhost:${SLIDEV_PORT}', '_blank');
            btn.disabled = false;
            btn.textContent = '\\u25B6 Start';
          } else {
            setTimeout(() => pollReady(btn), 1000);
          }
        })
        .catch(() => setTimeout(() => pollReady(btn), 1000));
    }
  </script>
</body>
</html>`;
}

function killSlidev() {
  return new Promise(resolve => {
    if (!slidevProcess) return resolve();
    const proc = slidevProcess;
    slidevProcess = null;
    if (process.platform === 'win32') {
      // SIGTERM is not reliable on Windows — use taskkill to force-kill the
      // entire process tree (cmd.exe + child npx/node), freeing port 3030
      exec(`taskkill /F /T /PID ${proc.pid}`, () => setTimeout(resolve, 1000));
    } else {
      proc.kill('SIGTERM');
      setTimeout(resolve, 500);
    }
  });
}

async function startSlidev(file) {
  await killSlidev();
  // On Windows, use cmd.exe /c without quoting the filename — quotes were passed
  // as literal characters to Slidev, which then appended .md again ("file.md".md).
  // Presentation filenames never contain spaces so quoting is not needed.
  const [cmd, args] = process.platform === 'win32'
    ? ['cmd.exe', ['/c', `npx slidev ${file} --port ${SLIDEV_PORT} --no-open`]]
    : ['npx', ['slidev', file, '--port', String(SLIDEV_PORT), '--no-open']];
  slidevProcess = spawn(cmd, args, { cwd: __dirname, stdio: 'inherit' });
  slidevProcess.on('error', (err) => {
    console.error('Slidev failed to start:', err.message);
    slidevProcess = null;
  });
  slidevProcess.on('exit', () => { slidevProcess = null; });
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {

  if (req.method === 'GET' && req.url === '/') {
    const decks = await getDecks();
    const html = renderHTML(decks);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && req.url === '/ready') {
    const ready = await isSlidevReady();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ready }));
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/start/')) {
    const file = decodeURIComponent(req.url.replace('/start/', ''));
    if (!file.endsWith('.md') || file.includes('/') || file.includes('..')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid file' }));
      return;
    }
    await startSlidev(file);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

    res.writeHead(404);
    res.end();
  } catch (err) {
    console.error('Request error:', err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }
});

server.listen(LAUNCHER_PORT, () => {
  const url = `http://localhost:${LAUNCHER_PORT}`;
  console.log(`\n  dbt Training Launcher\n  → ${url}\n`);
  const cmd = process.platform === 'win32'
    ? `start ${url}`
    : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
  exec(cmd);
});

process.on('SIGINT', async () => {
  await killSlidev();
  process.exit(0);
});
