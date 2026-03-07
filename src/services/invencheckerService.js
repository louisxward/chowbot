const { INVENCHECKER_API_URL } = require("config");

async function request(method, path, body) {
  const res = await fetch(`${INVENCHECKER_API_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw Object.assign(new Error(data?.error ?? res.statusText), { status: res.status });
  return data;
}

// POST /accounts/discord → { uid }
async function createAccountByDiscord(discordId) {
  return request("POST", "/accounts/discord", { discordId });
}

// POST /accounts/{uid}/steam64ids → Account
async function addSteam64Id(uid, steam64id) {
  return request("POST", `/accounts/${uid}/steam64ids`, { steam64id });
}

// DELETE /accounts/{uid}/steam64ids/{id} → Account
async function removeSteam64Id(uid, id) {
  return request("DELETE", `/accounts/${uid}/steam64ids/${encodeURIComponent(id)}`);
}

// POST /accounts/{uid}/customItems → Account
async function addCustomItem(uid, item) {
  return request("POST", `/accounts/${uid}/customItems`, { item });
}

// DELETE /accounts/{uid}/customItems/{item} → Account
async function removeCustomItem(uid, item) {
  return request("DELETE", `/accounts/${uid}/customItems/${encodeURIComponent(item)}`);
}

// PUT /alerts/user/{uid}/resolve-all → { resolved }
async function resolveAllAlerts(uid) {
  return request("PUT", `/alerts/user/${uid}/resolve-all`);
}

// GET /alerts/user/{uid} → AlertRecipient[]
async function getUserAlerts(uid) {
  return request("GET", `/alerts/user/${uid}`);
}

module.exports = {
  createAccountByDiscord,
  addSteam64Id,
  removeSteam64Id,
  addCustomItem,
  removeCustomItem,
  resolveAllAlerts,
  getUserAlerts
};
