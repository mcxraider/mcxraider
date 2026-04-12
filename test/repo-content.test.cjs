require("ts-node/register");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  decodeReadmeContent,
  getRepoSummaryContent,
  hasFetchedReadme,
  NO_README_FOUND,
  normalizeReadmeSummary,
} = require("../src/repo-content");

test("uses README content when base64 decoding succeeds", async () => {
  const result = await getRepoSummaryContent(
    async () => ({
      data: {
        content: Buffer.from("# Demo\nA real README").toString("base64"),
        encoding: "base64",
      },
    }),
    "fallback description"
  );

  assert.deepEqual(result, {
    content: "# Demo\nA real README",
    source: "readme",
  });
});

test("falls back to description when README is missing", async () => {
  const result = await getRepoSummaryContent(
    async () => {
      const error = new Error("Not Found");
      error.status = 404;
      throw error;
    },
    "fallback description"
  );

  assert.deepEqual(result, {
    content: "fallback description",
    source: "description",
  });
});

test("falls back to description on non-fatal fetch errors", async () => {
  const result = await getRepoSummaryContent(
    async () => {
      throw new Error("GitHub temporary failure");
    },
    "fallback description"
  );

  assert.deepEqual(result, {
    content: "fallback description",
    source: "description",
  });
});

test("returns empty string when both README and description are unavailable", async () => {
  const result = await getRepoSummaryContent(
    async () => ({
      data: {
        content: undefined,
        encoding: "base64",
      },
    }),
    ""
  );

  assert.deepEqual(result, {
    content: "",
    source: "description",
  });
});

test("ignores unsupported encodings", () => {
  assert.equal(decodeReadmeContent("plain-text", "utf8"), null);
});

test("detects when actual README content was fetched", () => {
  assert.equal(
    hasFetchedReadme({
      content: "# Demo\nA real README",
      source: "readme",
    }),
    true
  );

  assert.equal(
    hasFetchedReadme({
      content: "fallback description",
      source: "description",
    }),
    false
  );
});

test("normalizes valid README summaries", () => {
  assert.equal(
    normalizeReadmeSummary(
      "  This repository contains a TypeScript CLI that summarizes GitHub activity for profile README generation.  "
    ),
    "This repository contains a TypeScript CLI that summarizes GitHub activity for profile README generation."
  );
});

test("rejects assistant-style filler in README summaries", () => {
  assert.equal(
    normalizeReadmeSummary(
      "Please provide the markdown readme file so I can summarize the repository."
    ),
    null
  );
});

test("preserves explicit missing README output", () => {
  assert.equal(NO_README_FOUND, "No README found.");
});
