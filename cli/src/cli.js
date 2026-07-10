#!/usr/bin/env node
import { intro, outro, text, spinner, isCancel, cancel } from '@clack/prompts';
import pc from 'picocolors';
import open from 'open';
import LZString from 'lz-string';
import { analyzeProject } from './analyzer.js';
import { getAIPatches } from './gemini.js';

async function main() {
  console.log();
  intro(pc.bgBlue(pc.white(' CodeVitals Security & Quality Analyzer ')));

  let apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    apiKey = await text({
      message: 'No GEMINI_API_KEY found in environment. Please provide it:',
      placeholder: 'AIzaSy...',
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
    s.start(`Generating AI patches for ${issues.length} issues using Gemini...`);
    
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

  s.start('Preparing dashboard payload...');
  const jsonString = JSON.stringify(reportData);
  const compressed = LZString.compressToEncodedURIComponent(jsonString);
  s.stop(pc.green('Payload compressed successfully.'));

  const dashboardUrl = `https://codevitals.vercel.app/report?data=${compressed}`;
  
  // NOTE: If testing locally, you can change the URL to:
  // const dashboardUrl = `http://localhost:5173/report?data=${compressed}`;
  
  console.log(`\nOpening Dashboard: ${pc.cyan(dashboardUrl)}\n`);
  
  await open(dashboardUrl);
  
  outro(pc.bgGreen(pc.black(' Done! ')));
}

main().catch(console.error);
