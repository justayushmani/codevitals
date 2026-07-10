import { GoogleGenAI } from '@google/genai';

export async function getAIPatches(apiKey, issues) {
  const ai = new GoogleGenAI({ apiKey });
  
  const patchedIssues = [];
  
  // Batch issues into chunks of 10 to reduce API calls and avoid rate limits
  const CHUNK_SIZE = 10;
  for (let i = 0; i < issues.length; i += CHUNK_SIZE) {
    const chunk = issues.slice(i, i + CHUNK_SIZE);
    
    const prompt = `
You are an expert security and code-quality analyzer.
I found the following issues in a JavaScript/React codebase.

${chunk.map((issue, index) => `
Issue #${index + 1}:
Type: ${issue.type}
File: ${issue.file}

Snippet:
\`\`\`javascript
${issue.snippet}
\`\`\`
`).join('\n')}

For each issue:
- If this is a "SecretLeak", explain why it is insecure and provide a safe alternative using process.env.
- If this is "DeadCode", explain why it can be safely removed or if it's dead boilerplate.
- If this is "MissingAuth", provide the code with added authentication middleware logic.

Return a strictly formatted JSON response which is an array of objects, containing exactly these fields in the exact order of the issues provided:
[
  {
    "issueSummary": "A short summary of the issue",
    "originalCode": "The original code snippet provided",
    "patchedCode": "The suggested fixed code",
    "explanation": "Explanation of why this was an issue and how it was fixed"
  }
]
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
          const results = JSON.parse(responseText);
          if (Array.isArray(results)) {
            chunk.forEach((issue, index) => {
              patchedIssues.push({
                ...issue,
                ai: results[index] || null
              });
            });
          } else {
            // Fallback if it didn't return an array for some reason
            chunk.forEach(issue => patchedIssues.push(issue));
          }
      } catch (e) {
          // Fallback if parsing fails (strip markdown blocks if accidentally included despite mime type)
          const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            const results = JSON.parse(cleaned);
            if (Array.isArray(results)) {
              chunk.forEach((issue, index) => {
                patchedIssues.push({
                  ...issue,
                  ai: results[index] || null
                });
              });
            } else {
               chunk.forEach(issue => patchedIssues.push(issue));
            }
          } catch(err2) {
             chunk.forEach(issue => patchedIssues.push(issue));
          }
      }
      
    } catch (err) {
      console.error('\n[AI Error]: Failed to generate patch for issue chunk.', err.message || err);
      // If AI fails, just push the original issues without a patch
      chunk.forEach(issue => patchedIssues.push(issue));
    }
    
    // Add a small delay between chunks to further prevent rate limiting
    if (i + CHUNK_SIZE < issues.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return patchedIssues;
}
