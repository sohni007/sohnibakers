'use strict';
/** Input validation helpers. All customer input is validated on the server. */

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const text = (v, max = 1000) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim().slice(0, max) : '');

/**
 * Pakistani mobile numbers: 03XX XXXXXXX, accepted as 03..., 3..., 92..., +92..., 0092...
 * Returns the normalised 11-digit form "03XXXXXXXXX" or null.
 */
function pakMobile(v) {
  if (typeof v !== 'string') return null;
  let d = v.replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('0092')) d = d.slice(4);
  else if (d.startsWith('92')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  if (!/^3\d{9}$/.test(d)) return null;
  return '0' + d;
}

const formatPhone = (p) => (p && p.length === 11 ? `${p.slice(0, 4)} ${p.slice(4)}` : p || '');

function email(v) {
  const s = str(v, 200);
  if (!s) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s.toLowerCase() : null;
}

/** Today's date in Pakistan (YYYY-MM-DD). */
function todayPK() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function dateInRange(v, maxDaysAhead = 120) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  const today = new Date(todayPK() + 'T00:00:00Z');
  const diff = (d - today) / 86400000;
  if (diff < 0 || diff > maxDaysAhead) return null;
  return v;
}

const time = (v) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null);
const int = (v, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d.length === 10 ? d + 'T00:00:00Z' : d.replace(' ', 'T') + 'Z');
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function formatDateTime(sqliteUtc) {
  if (!sqliteUtc) return '';
  const dt = new Date(sqliteUtc.replace(' ', 'T') + 'Z');
  return dt.toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const pkr = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK');

module.exports = { str, text, pakMobile, formatPhone, email, todayPK, dateInRange, time, int, formatTime12, formatDate, formatDateTime, pkr };
