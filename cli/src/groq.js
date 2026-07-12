import { Groq } from 'groq-sdk';

export async function getAIPatches(apiKey, issues) {
  const groq = new Groq({ apiKey });
  
  const patchedIssues = [];
  
  // Batch issues into chunks of 10 to reduce API calls
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

Return a strictly formatted JSON response which is an OBJECT with a "patches" property containing an array of objects, in the exact order of the issues provided:
{
  "patches": [
    {
      "issueSummary": "A short summary of the issue",
      "originalCode": "The original code snippet provided",
      "patchedCode": "The suggested fixed code",
      "explanation": "Explanation of why this was an issue and how it was fixed"
    }
  ]
}
Output ONLY valid JSON.
`;

    try {
      let response;
      let retries = 3;
      let backoff = 5000; // 5 seconds initial backoff

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" }
          });
          break; // Success, break out of retry loop
        } catch (apiErr) {
          const isRateLimit = apiErr.status === 429 || (apiErr.message && (apiErr.message.includes('429') || apiErr.message.includes('Rate limit') || apiErr.message.includes('quota')));
          if (attempt < retries && isRateLimit) {
            console.warn(`\n[AI Warning]: Rate limit exceeded. Retrying in ${backoff / 1000}s... (Attempt ${attempt + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            backoff *= 2; // Exponential backoff
          } else {
            throw apiErr;
          }
        }
      }
      
      const responseText = response.choices[0]?.message?.content || "{}";
      
      try {
          const parsed = JSON.parse(responseText);
          const results = parsed.patches;
          if (Array.isArray(results)) {
            chunk.forEach((issue, index) => {
              patchedIssues.push({
                ...issue,
                ai: results[index] || null
              });
            });
          } else {
            // Fallback if it didn't return an array in 'patches'
            chunk.forEach(issue => patchedIssues.push(issue));
          }
      } catch (e) {
          // Fallback if parsing fails
          chunk.forEach(issue => patchedIssues.push(issue));
      }
      
    } catch (err) {
      console.error('\n[AI Error]: Failed to generate patch for issue chunk.', err.message || err);
      // If AI fails, just push the original issues without a patch
      chunk.forEach(issue => patchedIssues.push(issue));
    }
    
    // Add a small delay between chunks to prevent rate limiting (Groq rate limits can vary, a short delay is polite)
    if (i + CHUNK_SIZE < issues.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return patchedIssues;
}
