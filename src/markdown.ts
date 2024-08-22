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
  > ${'-'.repeat(120)} <br/>
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
export function generateMarkdown(
    contributions: string
): string {
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

# 💻 My Tech Stack:
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) ![R](https://img.shields.io/badge/r-%23276DC3.svg?style=for-the-badge&logo=r&logoColor=white) ![C](https://img.shields.io/badge/c-%2300599C.svg?style=for-the-badge&logo=c&logoColor=white) ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![Keras](https://img.shields.io/badge/Keras-%23D00000.svg?style=for-the-badge&logo=Keras&logoColor=white) ![Matplotlib](https://img.shields.io/badge/Matplotlib-%23ffffff.svg?style=for-the-badge&logo=Matplotlib&logoColor=black) ![mlflow](https://img.shields.io/badge/mlflow-%23d9ead3.svg?style=for-the-badge&logo=numpy&logoColor=blue) ![NumPy](https://img.shields.io/badge/numpy-%23013243.svg?style=for-the-badge&logo=numpy&logoColor=white) ![Pandas](https://img.shields.io/badge/pandas-%23150458.svg?style=for-the-badge&logo=pandas&logoColor=white) ![Plotly](https://img.shields.io/badge/Plotly-%233F4F75.svg?style=for-the-badge&logo=plotly&logoColor=white) ![PyTorch](https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white) ![scikit-learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white) ![Scipy](https://img.shields.io/badge/SciPy-%230C55A5.svg?style=for-the-badge&logo=scipy&logoColor=%white) ![TensorFlow](https://img.shields.io/badge/TensorFlow-%23FF6F00.svg?style=for-the-badge&logo=TensorFlow&logoColor=white) ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white) ![MySQL](https://img.shields.io/badge/mysql-%2300000f.svg?style=for-the-badge&logo=mysql&logoColor=white)

<br>
`;
}
