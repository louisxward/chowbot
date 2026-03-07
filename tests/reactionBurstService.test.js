const BURST_THRESHOLD = 5;
const BURST_WINDOW_MS = 3000;
const RECONCILE_DELAY_MS = 15000;

// Helpers

function makeReaction(messageId = "msg1", guildId = "server1", channelId = "ch1") {
  return {
    message: { id: messageId, guildId, channelId },
    client: { channels: { fetch: jest.fn() } }
  };
}

function makeClient({ discordUserIds = [], mocks } = {}) {
  const users = new Map(discordUserIds.map((id) => [id, { id, bot: false }]));
  const mockDiscordReaction = discordUserIds.length ? { users: { fetch: jest.fn().mockResolvedValue(users) } } : null;
  return {
    channels: {
      fetch: jest.fn().mockResolvedValue({
        messages: {
          fetch: jest.fn().mockResolvedValue({
            author: { id: "author1" },
            reactions: { resolve: jest.fn().mockReturnValue(mockDiscordReaction) }
          })
        }
      })
    }
  };
}

// Per-test module setup (required because burstMap is module-level state)

let recordEvent, processPendingReconcile;
let mocks;

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();

  mocks = {
    addPendingReconcile: jest.fn().mockResolvedValue(undefined),
    removePendingReconcile: jest.fn().mockResolvedValue(undefined),
    readServerConfig: jest.fn().mockResolvedValue({}),
    getKarmaByMessageAndEmoji: jest.fn().mockResolvedValue([]),
    updateKarma: jest.fn().mockResolvedValue(0),
    createKarma: jest.fn().mockResolvedValue(undefined),
    deleteKarma: jest.fn().mockResolvedValue(undefined),
    getAppConfig: jest.fn().mockResolvedValue({ emojiUpvoteId: "upvote", emojiDownvoteId: "downvote" })
  };

  jest.doMock("logger", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
  jest.doMock("config", () => ({ BURST_THRESHOLD, BURST_WINDOW_MS, RECONCILE_DELAY_MS }));
  jest.doMock("services/applicationConfigService", () => ({ getAppConfig: mocks.getAppConfig }));
  jest.doMock("repositories/karma", () => ({
    createKarma: mocks.createKarma,
    deleteKarma: mocks.deleteKarma,
    updateKarma: mocks.updateKarma,
    getKarmaByMessageAndEmoji: mocks.getKarmaByMessageAndEmoji
  }));
  jest.doMock("services/serverConfigStorage", () => ({
    readServerConfig: mocks.readServerConfig,
    addPendingReconcile: mocks.addPendingReconcile,
    removePendingReconcile: mocks.removePendingReconcile
  }));

  ({ recordEvent, processPendingReconcile } = require("services/reactionBurstService"));
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── recordEvent: burst detection ────────────────────────────────────────────

describe("recordEvent - burst detection", () => {
  test("events below threshold return false", async () => {
    const reaction = makeReaction();
    for (let i = 0; i < BURST_THRESHOLD - 1; i++) {
      expect(await recordEvent(reaction)).toBe(false);
    }
    expect(mocks.addPendingReconcile).not.toHaveBeenCalled();
  });

  test("event at threshold returns true and queues reconcile", async () => {
    const reaction = makeReaction();
    for (let i = 0; i < BURST_THRESHOLD - 1; i++) {
      await recordEvent(reaction);
    }
    expect(await recordEvent(reaction)).toBe(true);
    expect(mocks.addPendingReconcile).toHaveBeenCalledWith("server1", "msg1", "ch1");
  });

  test("events beyond threshold stay in burst mode", async () => {
    const reaction = makeReaction();
    for (let i = 0; i < BURST_THRESHOLD; i++) {
      await recordEvent(reaction);
    }
    expect(await recordEvent(reaction)).toBe(true);
    expect(await recordEvent(reaction)).toBe(true);
  });

  test("event after burst window still returns true when bursting", async () => {
    const reaction = makeReaction();
    for (let i = 0; i < BURST_THRESHOLD; i++) {
      await recordEvent(reaction);
    }
    jest.advanceTimersByTime(BURST_WINDOW_MS + 500);
    expect(await recordEvent(reaction)).toBe(true);
  });

  test("addPendingReconcile called only once across a burst", async () => {
    const reaction = makeReaction();
    for (let i = 0; i < BURST_THRESHOLD + 5; i++) {
      await recordEvent(reaction);
    }
    expect(mocks.addPendingReconcile).toHaveBeenCalledTimes(1);
  });

  test("different messageIds are tracked independently", async () => {
    const r1 = makeReaction("msg1");
    const r2 = makeReaction("msg2");
    for (let i = 0; i < BURST_THRESHOLD; i++) {
      await recordEvent(r1);
    }
    expect(await recordEvent(r2)).toBe(false);
  });
});

// ─── Debounce timer ───────────────────────────────────────────────────────────

describe("debounce timer", () => {
  test("reconcile does not fire before delay elapses", async () => {
    const reaction = makeReaction();
    reaction.client = makeClient({ mocks });
    for (let i = 0; i < BURST_THRESHOLD; i++) {
      await recordEvent(reaction);
    }
    jest.advanceTimersByTime(RECONCILE_DELAY_MS - 1);
    expect(mocks.removePendingReconcile).not.toHaveBeenCalled();
  });

  test("reconcile fires after delay elapses", async () => {
    const reaction = makeReaction();
    reaction.client = makeClient({ mocks });
    for (let i = 0; i < BURST_THRESHOLD; i++) {
      await recordEvent(reaction);
    }
    await jest.advanceTimersByTimeAsync(RECONCILE_DELAY_MS);
    expect(mocks.removePendingReconcile).toHaveBeenCalledWith("server1", "msg1");
  });

  test("burst event before timer fires resets the debounce", async () => {
    const reaction = makeReaction();
    reaction.client = makeClient({ mocks });
    for (let i = 0; i < BURST_THRESHOLD; i++) {
      await recordEvent(reaction);
    }
    jest.advanceTimersByTime(RECONCILE_DELAY_MS - 1000);
    await recordEvent(reaction); // resets timer
    jest.advanceTimersByTime(RECONCILE_DELAY_MS - 1000);
    expect(mocks.removePendingReconcile).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1000);
    expect(mocks.removePendingReconcile).toHaveBeenCalled();
  });
});

// ─── Reconcile logic ──────────────────────────────────────────────────────────

describe("reconcile logic", () => {
  async function triggerReconcile(reaction) {
    for (let i = 0; i < BURST_THRESHOLD; i++) {
      await recordEvent(reaction);
    }
    await jest.advanceTimersByTimeAsync(RECONCILE_DELAY_MS);
  }

  test("adds user in Discord but not in DB", async () => {
    const reaction = makeReaction();
    reaction.client = makeClient({ discordUserIds: ["user1"], mocks });
    mocks.getKarmaByMessageAndEmoji.mockResolvedValue([]);

    await triggerReconcile(reaction);

    // updateKarma returns 0 → createKarma called (once per emoji that has a reaction)
    expect(mocks.updateKarma).toHaveBeenCalled();
    expect(mocks.createKarma).toHaveBeenCalled();
  });

  test("removes user in DB but not in Discord", async () => {
    const reaction = makeReaction();
    reaction.client = makeClient({ discordUserIds: [], mocks });
    mocks.getKarmaByMessageAndEmoji.mockResolvedValue([{ fromUserId: "user1" }]);

    await triggerReconcile(reaction);

    expect(mocks.deleteKarma).toHaveBeenCalled();
  });

  test("no changes when Discord and DB match", async () => {
    const reaction = makeReaction();
    reaction.client = makeClient({ discordUserIds: [], mocks });
    mocks.getKarmaByMessageAndEmoji.mockResolvedValue([]);

    await triggerReconcile(reaction);

    expect(mocks.createKarma).not.toHaveBeenCalled();
    expect(mocks.deleteKarma).not.toHaveBeenCalled();
  });

  test("does not createKarma when updateKarma finds existing row", async () => {
    const reaction = makeReaction();
    reaction.client = makeClient({ discordUserIds: ["user1"], mocks });
    mocks.getKarmaByMessageAndEmoji.mockResolvedValue([]);
    mocks.updateKarma.mockResolvedValue(1); // row exists

    await triggerReconcile(reaction);

    expect(mocks.createKarma).not.toHaveBeenCalled();
  });

  test("calls removePendingReconcile on completion", async () => {
    const reaction = makeReaction();
    reaction.client = makeClient({ mocks });

    await triggerReconcile(reaction);

    expect(mocks.removePendingReconcile).toHaveBeenCalledWith("server1", "msg1");
  });
});

// ─── processPendingReconcile ──────────────────────────────────────────────────

describe("processPendingReconcile", () => {
  function makeClientForStartup() {
    return {
      channels: {
        fetch: jest.fn().mockResolvedValue({
          messages: {
            fetch: jest.fn().mockResolvedValue({
              author: { id: "author1" },
              reactions: { resolve: jest.fn().mockReturnValue(null) }
            })
          }
        })
      }
    };
  }

  test("reconciles each pending entry from config", async () => {
    mocks.readServerConfig.mockResolvedValue({
      server1: {
        pendingReconcile: [
          { messageId: "msg1", channelId: "ch1" },
          { messageId: "msg2", channelId: "ch1" }
        ]
      }
    });

    await processPendingReconcile(makeClientForStartup());

    expect(mocks.removePendingReconcile).toHaveBeenCalledWith("server1", "msg1");
    expect(mocks.removePendingReconcile).toHaveBeenCalledWith("server1", "msg2");
  });

  test("handles multiple servers", async () => {
    mocks.readServerConfig.mockResolvedValue({
      server1: { pendingReconcile: [{ messageId: "msg1", channelId: "ch1" }] },
      server2: { pendingReconcile: [{ messageId: "msg2", channelId: "ch2" }] }
    });

    await processPendingReconcile(makeClientForStartup());

    expect(mocks.removePendingReconcile).toHaveBeenCalledTimes(2);
  });

  test("handles empty config gracefully", async () => {
    mocks.readServerConfig.mockResolvedValue({});
    await processPendingReconcile(makeClientForStartup());
    expect(mocks.removePendingReconcile).not.toHaveBeenCalled();
  });

  test("handles server with no pendingReconcile key", async () => {
    mocks.readServerConfig.mockResolvedValue({ server1: { clearChannels: [] } });
    await processPendingReconcile(makeClientForStartup());
    expect(mocks.removePendingReconcile).not.toHaveBeenCalled();
  });
});
