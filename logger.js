const fs = require('fs');
const path = require('path');

const LOG_DIR = './logs';
const LOG_FILE = path.join(LOG_DIR, 'bot.log');
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function rotate() {
  const backup = LOG_FILE + '.1';
  if (fs.existsSync(backup)) fs.unlinkSync(backup);
  if (fs.existsSync(LOG_FILE)) fs.renameSync(LOG_FILE, backup);
}

function writeLine(level, args) {
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size >= MAX_SIZE_BYTES) {
      rotate();
    }
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (_) {
    // no romper el bot si el logging falla
  }
}

function init() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.log = (...args) => { origLog(...args); writeLine('LOG', args); };
  console.warn = (...args) => { origWarn(...args); writeLine('WARN', args); };
  console.error = (...args) => { origError(...args); writeLine('ERROR', args); };
}

module.exports = { init };
