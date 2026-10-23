import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('./public/', import.meta.url);
http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const files = { '/player-face.png': ['player-face.png', 'image/png'], '/': ['index.html', 'text/html; charset=utf-8'], '/game.js': ['game.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
  if (!files[path]) { res.writeHead(404); res.end('Not found'); return; }
  try { const [file, type] = files[path]; res.writeHead(200, { 'Content-Type': type }); res.end(await readFile(fileURLToPath(new URL(file, root)))); }
  catch { res.writeHead(500); res.end('Server error'); }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Headball running on port ' + (process.env.PORT || 3000)));
