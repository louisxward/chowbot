jest.mock("logger", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("config", () => ({ APPLICATION_CONFIG_PATH: "/fake/applicationConfig.json" }));
jest.mock("services/storageHelper", () => ({
  readFile: jest.fn().mockResolvedValue({
    emojiUpvoteId: "upvote123",
    emojiDownvoteId: "downvote456",
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

const { contentDetector, checkMessageAge } = require("services/contentDetector");

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
