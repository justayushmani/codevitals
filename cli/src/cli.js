#!/usr/bin/env node
import { intro, outro, text, spinner, isCancel, cancel } from '@clack/prompts';
import pc from 'picocolors';
import open from 'open';
import http from 'http';
import { analyzeProject } from './analyzer.js';
import { getAIPatches } from './groq.js';

async function main() {
  console.log();
  intro(pc.bgBlue(pc.white(' CodeVitals Security & Quality Analyzer ')));

  let apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    apiKey = await text({
      message: 'No GROQ_API_KEY found in environment. Please provide it:',
      placeholder: 'gsk_...',
      validate(value) {
        if (value.length === 0) return 'API Key is required!';
      }
    });

    if (isCancel(apiKey)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
  }

  const s = spinner();
  s.start('Scanning local project and parsing AST...');

  const cwd = process.cwd();
  
  // 1. Analyze Project Locally
  const { metrics, issues } = await analyzeProject(cwd);
  
  s.stop(pc.green(`Local scan complete. Base Score: ${metrics.finalScore}/100`));

  let finalIssues = issues;

  if (issues.length > 0) {
    s.start(`Generating AI patches for ${issues.length} issues using Groq...`);
    
    // 2. Fetch AI Patches
    finalIssues = await getAIPatches(apiKey, issues);
    
    s.stop(pc.green('AI patching complete.'));
  } else {
    console.log(pc.green('No issues found! Your code is pristine.'));
  }

  // 3. Compile Data Payload
  const reportData = {
    metrics,
    issues: finalIssues,
    timestamp: new Date().toISOString()
  };

  s.start('Starting local data server...');
  
  // Create a local server to serve the payload, bypassing URL length limits!
  const server = http.createServer((req, res) => {
    // Enable CORS so the web dashboard can fetch this data
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    if (req.url === '/data') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reportData));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(0, async () => {
    const port = server.address().port;
    s.stop(pc.green('Local server running.'));

    // We pass the port number instead of the massive payload
    // If you are testing the dashboard locally, you can use:
    // const dashboardUrl = `http://localhost:5173/report?port=${port}`;
    const dashboardUrl = `https://codevitals.vercel.app/report?port=${port}`;
    
    console.log(`\nOpening Dashboard: ${pc.cyan(dashboardUrl)}\n`);
    console.log(pc.yellow('Please keep this terminal open while viewing the dashboard.'));
    console.log(pc.gray('Press Ctrl+C when you are done to exit.'));
    
    await open(dashboardUrl);
  });
}

main().catch(console.error);
