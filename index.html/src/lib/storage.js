'use strict';
/**
 * File storage for uploads.
 *  • Payment proofs  → STORAGE_DIR/payment-proofs  (PRIVATE — only served to logged-in admins)
 *  • Product images  → STORAGE_DIR/product-images  (public, served at /media/products/<file>)
 * Files are identified by their real content (magic bytes), never by the name/extension sent by the browser.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ROOT } = require('./db');
const { HttpError } = require('./http');

const STORAGE_DIR = path.resolve(ROOT, process.env.STORAGE_DIR || 'storage');
const PROOF_DIR = path.join(STORAGE_DIR, 'payment-proofs');
const PRODUCT_DIR = path.join(STORAGE_DIR, 'product-images');
fs.mkdirSync(PROOF_DIR, { recursive: true });
fs.mkdirSync(PRODUCT_DIR, { recursive: true });

function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  if (buf.slice(0, 4).toString() === '%PDF') return { ext: 'pdf', mime: 'application/pdf' };
  return null;
}

function save(dir, file, { allowPdf, maxBytes, label }) {
  if (!file || !file.data || file.data.length === 0) throw new HttpError(400, `Please upload your ${label}.`);
  if (file.data.length > maxBytes) throw new HttpError(413, `Your ${label} is too large. Please upload a file under ${Math.round(maxBytes / 1048576)} MB.`);
  const kind = sniff(file.data);
  if (!kind || (kind.ext === 'pdf' && !allowPdf)) {
    throw new HttpError(400, `Please upload your ${label} as a JPG, PNG or WEBP image${allowPdf ? ' (or PDF)' : ''}.`);
  }
  const name = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${kind.ext}`;
  fs.writeFileSync(path.join(dir, name), file.data, { mode: 0o640 });
  return { name, mime: kind.mime };
}

const savePaymentProof = (file, maxBytes) => save(PROOF_DIR, file, { allowPdf: true, maxBytes, label: 'payment screenshot' });
const saveProductImage = (file, maxBytes) => save(PRODUCT_DIR, file, { allowPdf: false, maxBytes, label: 'product image' });

const SAFE_NAME = /^[0-9]+-[a-f0-9]{24}\.(jpg|png|webp|pdf)$/;
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

/** Resolve a stored file safely (no path traversal). Returns { file, mime } or null. */
function resolve(kind, name) {
  if (!SAFE_NAME.test(name || '')) return null;
  const dir = kind === 'proof' ? PROOF_DIR : PRODUCT_DIR;
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) return null;
  return { file, mime: MIME[name.split('.').pop()] };
}

function removeFile(dir, name) {
  try {
    if (SAFE_NAME.test(name || '')) fs.unlinkSync(path.join(dir, name));
  } catch {
    /* ignore */
  }
}

module.exports = { savePaymentProof, saveProductImage, resolve, removeFile, PROOF_DIR, PRODUCT_DIR };
