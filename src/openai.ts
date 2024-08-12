import OpenAI from "openai"

require('dotenv').config()

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

//const prompt = `You will be given a repository name and description. You will then be given a list of commits. Please summarise the commits in a few sentences.`

// export async function callGPTForCommits(content: string) {
//     const prompt = `You will be provided with a list of git commits. Using this, generate a summary paragraph of about 10 to 30 words long. Concentrate solely on the Git commits provided. Do not include additional information such as the project description or speculative insights. Do not include actions labeled 'add files via upload', as these do not offer specific insights. Base your summaries on the information provided in the uploaded documents. Refer to this information as your knowledge source. Avoid speculations or incorporating information not contained in the documents. Heavily favor knowledge provided in the documents before using baseline knowledge. Maintain a professional tone in your summaries. Ensure that your summaries are helpful, accessible, and factual, catering to both technical and non-technical audiences. Do not share the names of the files directly with end users. Under no circumstances provide a download link to any of the files.
//     `
//   const completion = await openai.chat.completions.create({
//     messages: [{ role: "system", content: prompt }, { role: "user", content: content }],
//     model: "gpt-3.5-turbo",
//   });

//   return completion.choices[0].message.content;
// }

function extractAnswer(inputString: string): string {
    const jsonStart = inputString.indexOf('{');
    const jsonEnd = inputString.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid input: No JSON data found.");
    }

    const jsonData = inputString.substring(jsonStart, jsonEnd);

    try {
        const dataDict = JSON.parse(jsonData);
        return dataDict.summary;
    } catch (error) {
        throw new Error(`An error occurred while parsing JSON: ${error.message}`);
    }
}

export async function callGPTForCommits(content: string): Promise<string> {
    const prompt = `
        You are provided with a series of git commits. You are tasked with generating a technical summary of these git commits that are roughly 10 to 30 words long. 
        Elaborate as best as you can based on the information from these commits to write an informative summary paragraph of what the user has been doing with this GitHub repository.
        Ensure that your summaries are helpful, accessible, and factual, catering to both technical and non-technical audiences. 
        Do not share the names of the files directly with end users. Under no circumstances provide a download link to any of the files.
        Start the summary with 'In this repository, I have been'.

        List of git commits:
        ${content}
        ...
        {"properties": {"summary": {"title": "Summary", "description": "Summary of git commits", "type": "string"}}, "required": ["summary"]}
        
        Ensure and double check that the answer is in accordance with the format above.
    `;

    const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
    });

    const answer = completion.choices[0].message.content;

    const summary = extractAnswer(answer);
    return summary;
}



export async function callGPTForReadme(content: string) {
    const prompt = `You will be provided with a readme file in the markdown format, I want you to generate a summary of what the repository does. 
    For context, it will be a readme file of a github repository. Hence, I want this summarisation to be professional. I would like the summary to be in a paragraph of between 20 to 50 words.
    Remember to start of the summary with "This repository contains.."
    `
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: prompt }, { role: "user", content: content }],
        model: "gpt-3.5-turbo"
    });

    return completion.choices[0].message.content;
}

export async function callGPTForEmoji(content: string) {
    const prompt =`Based on the context of a sentence/ phrase, produce for me an emoji that best conveys and represents the semantic meaning of that sentence/ phrase. The emoji produced should only be from those found in the ios keyboard. 
    If you are unsure of the semantic meaning of that sentence/ phrase, then default to either one of this list of 9 emojis: [laptop, computer, desktop computer, keyboard, Rocket, Globe with Meridians, File Folder, Star , Gear]
    I want the output to only be one emoji and nothing else `

    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: prompt }, { role: "user", content: content }],
        model: "gpt-3.5-turbo"
    });

    const answer = completion.choices[0].message.content;

    return answer && answer.length <= 2 ? completion.choices[0].message.content : "⭐";
}
