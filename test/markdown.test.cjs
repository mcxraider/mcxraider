require("ts-node/register");

const test = require("node:test");
const assert = require("node:assert/strict");

const { generateMarkdown } = require("../src/markdown");

test("renders configured display name, bio, and GitHub stats username", () => {
  const markdown = generateMarkdown(
    {
      username: "octocat",
      displayName: "The Octocat",
      bio: "Ship code and keep the README generic.",
    },
    "Recent work summary"
  );

  assert.match(markdown, /# Hi! I'm The Octocat!/);
  assert.match(markdown, /> Ship code and keep the README generic\./);
  assert.match(markdown, /api\?username=octocat&count_private=true/);
  assert.match(markdown, /top-langs\/\?username=octocat/);
  assert.match(markdown, /exclude_repo=octocat\.github\.io/);
});

test("omits the bio section when no bio is provided", () => {
  const markdown = generateMarkdown(
    {
      username: "octocat",
      displayName: "octocat",
      bio: "",
    },
    "Recent work summary"
  );

  assert.doesNotMatch(markdown, />\s*Data Science and Analytics @NUS/);
  assert.doesNotMatch(markdown, /\n<p>\n  > /);
  assert.match(markdown, /# Hi! I'm octocat!/);
});
