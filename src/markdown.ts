/**
 * Generates a dropdown section for a markdown file with a title, summaries, and a URL link.
 *
 * @param {string} title - The title of the dropdown section.
 * @param {string} readmeSummary - A summary of the README content.
 * @param {string} commitsSummary - A summary of the commits related to the content.
 * @param {string} url - The URL link that the title points to.
 * @returns {string} - A string containing the markdown dropdown section.
 */
export function generateDropdown(
  title: string,
  readmeSummary: string,
  commitsSummary: string,
  url: string
): string {
  return `
  <details>
  <summary><strong><a href="${url}">${title}</a></strong></summary>
  <br/>
  > ${readmeSummary} <br/>
  ${"-".repeat(126)} <br/>
  > ${commitsSummary}
  </details>
  `;
}

/**
 * Combines multiple dropdown sections into a single markdown string.
 *
 * @param {Object.<string, string>} entries - An object where each key-value pair represents a dropdown title and its corresponding markdown content.
 * @returns {string} - A string containing all the combined dropdowns.
 */
export function generateDropdowns(entries: { [name: string]: string }): string {
  let dropdowns = "";
  for (const [key, value] of Object.entries(entries)) {
    dropdowns += value;
  }
  return dropdowns;
}

export type ProfileIdentity = {
  username: string;
  displayName: string;
  bio: string;
};

/**
 * Generates a complete markdown string with a profile header and contribution summary.
 *
 * @param {ProfileIdentity} profile - Identity data used to render the profile header.
 * @param {string} contributions - The AI-generated summary of the user's contributions.
 * @returns {string} - A string containing the markdown content for a GitHub profile README.
 */
export function generateMarkdown(
  profile: ProfileIdentity,
  contributions: string
): string {
  const bioSection = profile.bio
    ? `<p>
  > ${profile.bio}
</p>
`
    : "";

  return `

# Hi! I'm ${profile.displayName}!
${bioSection}

## 🔨 AI-generated summary of what I've been working on:
${contributions}
<br>

`;
}
