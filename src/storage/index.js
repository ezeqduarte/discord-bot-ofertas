const fs = require('fs');

const STORAGE_PATH = './storage.json';
const STORAGE_TMP = STORAGE_PATH + '.tmp';

function load() {
  if (!fs.existsSync(STORAGE_PATH)) {
    return { users: {} };
  }
  const data = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));
  if (!data.users) data.users = {};
  return data;
}

function save(data) {
  fs.writeFileSync(STORAGE_TMP, JSON.stringify(data, null, 2));
  fs.renameSync(STORAGE_TMP, STORAGE_PATH);
}

function addUser(username, channelId) {
  const data = load();
  username = username.toLowerCase().replace('@', '');
  const existing = data.users[username];
  data.users[username] = {
    lastTweetId: existing ? existing.lastTweetId : null,
    channelId
  };
  save(data);
  return { alreadyExisted: !!existing };
}

function removeUser(username) {
  const data = load();
  username = username.toLowerCase().replace('@', '');
  if (data.users[username]) {
    delete data.users[username];
    save(data);
    return true;
  }
  return false;
}

function getAllUsers() {
  const data = load();
  return Object.entries(data.users).map(([username, info]) => ({
    username,
    ...info
  }));
}

function updateLastTweetId(username, tweetId) {
  const data = load();
  username = username.toLowerCase().replace('@', '');
  if (data.users[username]) {
    data.users[username].lastTweetId = tweetId;
    save(data);
  }
}

module.exports = { addUser, removeUser, getAllUsers, updateLastTweetId };
