require("ts-node/register");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getPaginatedCommitMessages,
  rankRepoActivities,
  shortlistRepos,
} = require("../src/repo-activity");

test("shortlists the most recently pushed repos before commit inspection", () => {
  const repos = Array.from({ length: 25 }, (_, index) => ({
    name: `repo-${index + 1}`,
  }));

  assert.deepEqual(
    shortlistRepos(repos, 3).map((repo) => repo.name),
    ["repo-1", "repo-2", "repo-3"]
  );
});

test("fetches all commit pages instead of stopping at the first page", async () => {
  const requestedPages = [];
  const result = await getPaginatedCommitMessages(async (page, perPage) => {
    requestedPages.push({ page, perPage });

    if (page === 1) {
      return Array.from({ length: perPage }, (_, index) => ({
        commit: { message: `page-1 commit ${index + 1}` },
      }));
    }

    if (page === 2) {
      return [{ commit: { message: "page-2 commit 1" } }];
    }

    return [];
  });

  assert.equal(result.length, 101);
  assert.equal(result.at(-1), "page-2 commit 1");
  assert.deepEqual(requestedPages, [
    { page: 1, perPage: 100 },
    { page: 2, perPage: 100 },
  ]);
});

test("ranks repos by full commit volume with pushed_at tie-breaking", () => {
  const ranked = rankRepoActivities([
    {
      name: "older-busy-repo",
      description: "",
      url: "https://example.com/older-busy-repo",
      commitMessages: ["1", "2", "3"],
      lastPushedAt: "2026-04-10T00:00:00.000Z",
    },
    {
      name: "newer-tie-repo",
      description: "",
      url: "https://example.com/newer-tie-repo",
      commitMessages: ["1", "2"],
      lastPushedAt: "2026-04-11T00:00:00.000Z",
    },
    {
      name: "older-tie-repo",
      description: "",
      url: "https://example.com/older-tie-repo",
      commitMessages: ["1", "2"],
      lastPushedAt: "2026-04-09T00:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    ranked.map((repo) => repo.name),
    ["older-busy-repo", "newer-tie-repo", "older-tie-repo"]
  );
});
