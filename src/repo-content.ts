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
