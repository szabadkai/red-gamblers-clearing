import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf',
  '.mml': 'text/plain', '.md': 'text/plain', '.json': 'application/json'
};

export async function serveGame(req, res, {devTools = false} = {}) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, {Allow: 'GET, HEAD'}).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const parts = pathname.split('/');
    if (parts.some(part => part.startsWith('.') || part.includes('\\'))) {
      res.writeHead(404).end();
      return;
    }
    const local = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(req.headers.host || '')
      && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    const developer = devTools && local;
    const route = path.posix.normalize(pathname);
    const folded = route.toLowerCase();
    if (folded === '/local-tools.mjs' || (folded.startsWith('/tests/') && !developer)) {
      res.writeHead(404).end();
      return;
    }
    const asset = route === '/' ? 'index.html' : route;
    const file = path.join(root, route === '/runtime.mjs' && developer ? 'local-tools.mjs' : asset);
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache'
    }).end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404).end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const firstPort = Number(process.env.PORT || process.env.RED_PORT || 4310);
  const devTools = process.argv.includes('--dev-tools');
  const server = http.createServer((req, res) => serveGame(req, res, {devTools}));
  let port = firstPort;
  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && port < firstPort + 10) {
      server.listen(++port, '127.0.0.1');
    } else {
      console.error(error.message);
      process.exitCode = 1;
    }
  });
  server.on('listening', () => {
    const url = `http://127.0.0.1:${server.address().port}/`;
    console.log(`RED — The Gambler's Clearing\n${url}\nPress Ctrl+C to stop.`);
    if (devTools) console.log('Local developer tools enabled.');
    if (process.argv.includes('--open')) {
      const cmd = {darwin: 'open', win32: 'cmd'}[process.platform] || 'xdg-open';
      const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
      const child = spawn(cmd, args, {detached: true, stdio: 'ignore'});
      child.on('error', () => console.log('Open the URL above in your browser.'));
      child.unref();
    }
  });
  server.listen(port, '127.0.0.1');
}
