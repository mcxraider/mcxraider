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

/**
 * Generates a complete markdown string, including GitHub stats, a summary of contributions, and a tech stack section.
 *
 * @param {string} contributions - The AI-generated summary of the user's contributions.
 * @returns {string} - A string containing the markdown content for a GitHub profile README.
 */
export function generateMarkdown(contributions: string): string {
  return `

# Hi! I'm Jerry!

# GitHub Stats
<p>
  <img align="center" src="https://github-readme-stats.vercel.app/api?username=mcxraider&count_private=true&show_icons=true&theme=github_dark&bg_color=00000099&rank_icon=percentile" />
  <img align="center" src="https://github-readme-stats.vercel.app/api/top-langs/?username=mcxraider&theme=github_dark&bg_color=00000099&exclude_repo=mcxraider.github.io&langs_count=8&size_weight=0.3&count_weight=0.7&hide=css,html&layout=compact" />
</p>
<br>

## 🔨 AI-generated summary of what I've been working on:
${contributions}
<br>

`;
}
