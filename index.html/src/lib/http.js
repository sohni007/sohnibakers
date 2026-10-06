'use strict';
/** Small HTTP helpers: body parsing (urlencoded / JSON / multipart), cookies, responses. */

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > limitBytes) {
      reject(new HttpError(413, 'The file you uploaded is too large.'));
      req.resume();
      return;
    }
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > limitBytes) {
        done = true;
        reject(new HttpError(413, 'The file you uploaded is too large.'));
        req.resume();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => !done && resolve(Buffer.concat(chunks)));
    req.on('error', (e) => !done && reject(e));
  });
}

function parseMultipart(buffer, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) throw new HttpError(400, 'Invalid form submission.');
  const boundary = Buffer.from('--' + (m[1] || m[2]).trim());
  const fields = {};
  const files = {};
  let pos = buffer.indexOf(boundary);
  if (pos === -1) throw new HttpError(400, 'Invalid form submission.');
  while (true) {
    pos += boundary.length;
    if (buffer[pos] === 0x2d && buffer[pos + 1] === 0x2d) break; // closing "--"
    pos += 2; // skip CRLF
    const headerEnd = buffer.indexOf('\r\n\r\n', pos);
    if (headerEnd === -1) break;
    const headerText = buffer.slice(pos, headerEnd).toString('utf8');
    const next = buffer.indexOf(boundary, headerEnd + 4);
    if (next === -1) break;
    const content = buffer.slice(headerEnd + 4, next - 2); // strip trailing CRLF
    const disp = /content-disposition:[^\r\n]*\bname="([^"]*)"(?:;\s*filename="([^"]*)")?/i.exec(headerText);
    const typeMatch = /content-type:\s*([^\r\n]+)/i.exec(headerText);
    if (disp) {
      const name = disp[1];
      if (disp[2] !== undefined) {
        if (content.length > 0) files[name] = { filename: disp[2], mime: typeMatch ? typeMatch[1].trim() : '', data: content };
      } else {
        const value = content.toString('utf8');
        if (name in fields) fields[name] = [].concat(fields[name], value);
        else fields[name] = value;
      }
    }
    pos = next;
  }
  return { fields, files };
}

function parseUrlEncoded(buffer) {
  const out = {};
  for (const [k, v] of new URLSearchParams(buffer.toString('utf8'))) {
    if (k in out) out[k] = [].concat(out[k], v);
    else out[k] = v;
  }
  return out;
}

/** Parse request body into { fields, files }. */
async function parseBody(req, limitBytes = 64 * 1024) {
  const type = req.headers['content-type'] || '';
  const buf = await readBody(req, limitBytes);
  if (type.startsWith('multipart/form-data')) return parseMultipart(buf, type);
  if (type.startsWith('application/json')) {
    try {
      return { fields: JSON.parse(buf.toString('utf8') || '{}'), files: {} };
    } catch {
      throw new HttpError(400, 'Invalid request.');
    }
  }
  return { fields: parseUrlEncoded(buf), files: {} };
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function html(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

function json(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}

function redirect(res, location, status = 303, headers = {}) {
  res.writeHead(status, { Location: location, 'Cache-Control': 'no-store', ...headers });
  res.end();
}

function clientIp(req) {
  // Only trust X-Forwarded-For when running behind your own reverse proxy (TRUST_PROXY=1).
  if (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']) {
    return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

module.exports = { HttpError, parseBody, parseCookies, html, json, redirect, clientIp };
