type ReadmeResponse = {
  data: {
    content?: string;
    encoding?: string;
  };
};

export type RepoSummarySource = "readme" | "description";

export type RepoSummaryContent = {
  content: string;
  source: RepoSummarySource;
};

export const NO_README_FOUND = "No README found.";
export const README_SUMMARY_UNAVAILABLE = "README summary unavailable.";

type RepoContentError = {
  status?: number;
};

export function decodeReadmeContent(
  content?: string,
  encoding?: string
): string | null {
  if (!content || encoding !== "base64") {
    return null;
  }

  return Buffer.from(content, "base64").toString("utf8");
}

export function hasFetchedReadme(
  repoSummaryContent: RepoSummaryContent | null | undefined
): boolean {
  return (
    repoSummaryContent?.source === "readme" &&
    repoSummaryContent.content.trim().length > 0
  );
}

export function normalizeReadmeSummary(
  summary: string | null | undefined
): string | null {
  const trimmed = summary?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\s+/g, " ");
  const invalidPatterns = [
    /please provide/i,
    /i do not see/i,
    /i don't see/i,
    /missing context/i,
    /repository description/i,
    /^no readme found\.?$/i,
  ];

  return invalidPatterns.some((pattern) => pattern.test(normalized))
    ? null
    : normalized;
}

export function normalizeCommitSummary(
  summary: string | null | undefined
): string | null {
  const trimmed = summary?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\s+/g, " ");
  const withoutLeadIn = normalized
    .replace(
      /^(here(?:'s| is)\s+)?(?:a\s+)?summary(?:\s+(?:of|for|based on)\s+the\s+(?:provided\s+)?commits?)?(?::\s*|\s*-\s*)/i,
      ""
    )
    .replace(
      /^here(?:'s| is)\s+(?:a\s+)?summary(?:\s+(?:of|for|based on)\s+the\s+(?:provided\s+)?commits?)?(?::\s*|\s*-\s*)/i,
      ""
    )
    .trim();

  return withoutLeadIn || null;
}

export async function getRepoSummaryContent(
  fetchReadme: () => Promise<ReadmeResponse>,
  description?: string | null
): Promise<RepoSummaryContent> {
  try {
    const response = await fetchReadme();
    const decodedReadme = decodeReadmeContent(
      response.data.content,
      response.data.encoding
    );

    if (decodedReadme) {
      return {
        content: decodedReadme,
        source: "readme",
      };
    }
  } catch (error) {
    if ((error as RepoContentError).status !== 404) {
      console.warn(
        "Falling back to repository description for summary input.",
        error
      );
    }
  }

  return {
    content: description ?? "",
    source: "description",
  };
}
