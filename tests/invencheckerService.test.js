jest.mock("config", () => ({ INVENCHECKER_API_URL: "http://inv.test" }));

const service = require("services/invencheckerService");

function mockResponse({ ok = true, status = 200, statusText = "OK", body } = {}) {
  return { ok, status, statusText, text: async () => (body === undefined ? "" : JSON.stringify(body)) };
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(mockResponse({ body: { ok: true } }));
});

test("sends JSON bodies with a timeout signal", async () => {
  await service.addSteam64Id("uid1", "76561198000000000");
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe("http://inv.test/accounts/uid1/steam64ids");
  expect(options.method).toBe("POST");
  expect(options.headers).toEqual({ "Content-Type": "application/json" });
  expect(JSON.parse(options.body)).toEqual({ steam64id: "76561198000000000" });
  expect(options.signal).toBeInstanceOf(AbortSignal);
});

test("encodes item names in the path", async () => {
  await service.removeCustomItem("uid1", "AK-47 | Redline (Field-Tested)");
  expect(fetch.mock.calls[0][0]).toBe(
    "http://inv.test/accounts/uid1/customItems/AK-47%20%7C%20Redline%20(Field-Tested)"
  );
});

test("builds the prices query string", async () => {
  await service.getAccountPrices("uid1", 30, "Case Key");
  expect(fetch.mock.calls[0][0]).toBe("http://inv.test/accounts/uid1/prices?days=30&item=Case+Key");
  await service.getAccountPrices("uid1", null, null);
  expect(fetch.mock.calls[1][0]).toBe("http://inv.test/accounts/uid1/prices");
});

test("returns null for an empty response body", async () => {
  fetch.mockResolvedValue(mockResponse({ body: undefined }));
  expect(await service.getUserAlerts("uid1")).toBeNull();
});

test("throws the API's error message with the HTTP status", async () => {
  fetch.mockResolvedValue(
    mockResponse({ ok: false, status: 404, statusText: "Not Found", body: { error: "no account" } })
  );
  await expect(service.getAccountSummary("uid1")).rejects.toMatchObject({ message: "no account", status: 404 });
});

test("falls back to the status text when the error has no body", async () => {
  fetch.mockResolvedValue(mockResponse({ ok: false, status: 502, statusText: "Bad Gateway" }));
  await expect(service.getAccountSummary("uid1")).rejects.toMatchObject({ message: "Bad Gateway", status: 502 });
});
