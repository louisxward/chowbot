jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("repositories/message", () => ({ upsertMessage: jest.fn() }));
jest.mock("services/applicationConfigService", () => ({
  getAppConfig: jest.fn().mockResolvedValue({
    domainList: [
      "youtube.com/",
      "twitter.com/",
      "x.com/",
      "streamable.com/",
      "youtu.be/",
      "tiktok.com/",
      "gyazo.com/",
      "twitch.com/"
    ]
  })
}));
jest.mock("services/karmaEmojiService", () => ({
  hasKarmaEmojis: jest.fn().mockReturnValue(true),
  getKarmaEmojis: jest.fn().mockReturnValue([
    { id: "up", sort: 1, value: 1 },
    { id: "🔥", sort: 2, value: 3 },
    { id: "down", sort: 3, value: -1 }
  ])
}));

const { contentDetector, checkMessageAge, addKarmaReactions } = require("services/messageService");

describe("contentDetector", () => {
  const makeMessage = ({ embeds = [], attachments = [] } = {}) => ({
    embeds,
    attachments
  });

  describe("valid embeds", () => {
    const validDomains = [
      "youtube.com/watch?v=abc",
      "twitter.com/user/status/123",
      "x.com/user/status/123",
      "streamable.com/abc",
      "youtu.be/abc",
      "tiktok.com/@user/video/123",
      "gyazo.com/abc"
    ];

    test.each(validDomains)("detects embed from %s", async (url) => {
      const message = makeMessage({ embeds: [{ url }] });
      expect(await contentDetector(message)).toBe(true);
    });

    test("ignores embed with no url", async () => {
      const message = makeMessage({ embeds: [{ url: null }] });
      expect(await contentDetector(message)).toBe(false);
    });

    test("ignores embed from unknown domain", async () => {
      const message = makeMessage({ embeds: [{ url: "https://example.com/video" }] });
      expect(await contentDetector(message)).toBe(false);
    });
  });

  describe("valid attachments", () => {
    test("detects image attachment", async () => {
      const message = makeMessage({ attachments: [{ contentType: "image/png" }] });
      expect(await contentDetector(message)).toBe(true);
    });

    test("detects video attachment", async () => {
      const message = makeMessage({ attachments: [{ contentType: "video/mp4" }] });
      expect(await contentDetector(message)).toBe(true);
    });

    test("ignores attachment with no contentType", async () => {
      const message = makeMessage({ attachments: [{ contentType: null }] });
      expect(await contentDetector(message)).toBe(false);
    });

    test("ignores non-media attachment", async () => {
      const message = makeMessage({ attachments: [{ contentType: "application/pdf" }] });
      expect(await contentDetector(message)).toBe(false);
    });
  });

  test("returns false with no embeds or attachments", async () => {
    expect(await contentDetector(makeMessage())).toBe(false);
  });

  test("returns true when both embed and attachment are valid", async () => {
    const message = makeMessage({
      embeds: [{ url: "youtube.com/watch?v=abc" }],
      attachments: [{ contentType: "image/jpeg" }]
    });
    expect(await contentDetector(message)).toBe(true);
  });
});

describe("checkMessageAge", () => {
  test("returns true for a message created just now", () => {
    const message = { createdTimestamp: Date.now() };
    expect(checkMessageAge(message)).toBe(true);
  });

  test("returns true for a message created 23 hours ago", () => {
    const message = { createdTimestamp: Date.now() - 23 * 60 * 60 * 1000 };
    expect(checkMessageAge(message)).toBe(true);
  });

  test("returns false for a message created 25 hours ago", () => {
    const message = { createdTimestamp: Date.now() - 25 * 60 * 60 * 1000 };
    expect(checkMessageAge(message)).toBe(false);
  });

  test("returns false for a very old message", () => {
    const message = { createdTimestamp: 0 };
    expect(checkMessageAge(message)).toBe(false);
  });
});

describe("addKarmaReactions", () => {
  test("reacts with every karma emoji in sort order", async () => {
    const message = { react: jest.fn() };
    await addKarmaReactions(message);
    expect(message.react.mock.calls.map(([emoji]) => emoji)).toEqual(["up", "🔥", "down"]);
  });
});
