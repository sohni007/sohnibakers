'use strict';
/**
 * Create (or reset the password of) an admin account.
 *   npm run admin:create
 * Non-interactive:  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long-password' npm run admin:create
 */
const path = require('node:path');
const fs = require('node:fs');
const readline = require('node:readline');
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);
const { createAdmin } = require('../src/lib/auth');

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write('*'); };
    }
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
  });
}

(async () => {
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  if (!email) email = await ask('Admin email: ');
  if (!password) password = await ask('Admin password (min 10 characters): ', true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) { console.error('Please enter a valid email address.'); process.exit(1); }
  if (!password || password.length < 10) { console.error('Password must be at least 10 characters.'); process.exit(1); }
  const r = createAdmin(email.toLowerCase(), password);
  console.log(r.updated ? `Password updated for ${email}.` : `Admin account created for ${email}. Log in at /admin`);
})();
