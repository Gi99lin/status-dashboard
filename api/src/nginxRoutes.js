import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Pure nginx config parser: extract server_name -> upstream host:port.
// Supports two shapes:
//   1) a literal `proxy_pass http://host:port` (hand-written vhosts), and
//   2) Nginx Proxy Manager's generated form, where the upstream is declared
//      via `set $server "host"; set $port N;` and the actual proxy_pass lives
//      in an included file using those variables.
export function parseNginx(conf = '') {
  const routes = [];
  const blocks = String(conf).split(/server\s*\{/).slice(1);

  for (const block of blocks) {
    const name = block.match(/server_name\s+([^;]+);/)?.[1];
    if (!name) continue;
    const host = name.trim().split(/\s+/)[0];
    if (!host || host === '_') continue;

    let upstreamHost;
    let upstreamPort = '';
    const literal = block.match(/proxy_pass\s+https?:\/\/([a-z0-9_.-]+):(\d+)/i);
    if (literal) {
      upstreamHost = literal[1];
      upstreamPort = literal[2];
    } else {
      const server = block.match(/set\s+\$server\s+"?([a-z0-9_.-]+)"?\s*;/i);
      const port = block.match(/set\s+\$port\s+(\d+)\s*;/i);
      if (server) {
        upstreamHost = server[1];
        upstreamPort = port?.[1] || '';
      }
    }
    if (!upstreamHost) continue;

    routes.push({
      url: `https://${host}`,
      host,
      upstreamHost,
      upstreamPort,
    });
  }

  return routes;
}

// Reads nginx routes from NGINX_CONF_PATH, which may be either a single
// config file or a directory of *.conf files (NPM writes one per proxy host).
export function readNginxRoutes(path = process.env.NGINX_CONF_PATH) {
  if (!path) return [];
  try {
    if (statSync(path).isDirectory()) {
      const conf = readdirSync(path)
        .filter((file) => file.endsWith('.conf'))
        .map((file) => {
          try {
            return readFileSync(join(path, file), 'utf8');
          } catch {
            return '';
          }
        })
        .join('\n');
      return parseNginx(conf);
    }
    return parseNginx(readFileSync(path, 'utf8'));
  } catch {
    return [];
  }
}
