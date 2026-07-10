import { GoogleGenAI } from '@google/genai';

export async function getAIPatches(apiKey, issues) {
  const ai = new GoogleGenAI({ apiKey });
  
  // We'll batch issues if there are too many, but for Phase 1 we can do a single prompt if there are a few, 
  // or iterate over them to get structured JSON for each. Let's iterate for simplicity and reliability.
  const patchedIssues = [];
  
  for (const issue of issues) {
    const prompt = `
You are an expert security and code-quality analyzer.
I found the following issue in a JavaScript/React codebase.
Issue Type: ${issue.type}
File: ${issue.file}

Snippet:
\`\`\`javascript
${issue.snippet}
\`\`\`

If this is a "SecretLeak", explain why it is insecure and provide a safe alternative using process.env.
If this is "DeadCode", explain why it can be safely removed or if it's dead boilerplate.
If this is "MissingAuth", provide the code with added authentication middleware logic.

Return a strictly formatted JSON response containing exactly these fields:
{
  "issueSummary": "A short summary of the issue",
  "originalCode": "The original code snippet provided",
  "patchedCode": "The suggested fixed code",
  "explanation": "Explanation of why this was an issue and how it was fixed"
}
Output ONLY valid JSON.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
      });
      
      const responseText = response.text;
      
      try {
          const result = JSON.parse(responseText);
          patchedIssues.push({
            ...issue,
            ai: result
          });
      } catch (e) {
          // Fallback if parsing fails (strip markdown blocks if accidentally included despite mime type)
          const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const result = JSON.parse(cleaned);
          patchedIssues.push({
            ...issue,
            ai: result
          });
      }
      
    } catch (err) {
      // If AI fails, just push the original issue without a patch
      patchedIssues.push(issue);
    }
  }

  return patchedIssues;
}
