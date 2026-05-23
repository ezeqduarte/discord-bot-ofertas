const VALID_USERNAME = /^[a-zA-Z0-9_]{1,15}$/;

function parseUsername(raw) {
  const username = raw.replace('@', '').toLowerCase().trim();
  if (!VALID_USERNAME.test(username)) return null;
  return username;
}

module.exports = { parseUsername };
