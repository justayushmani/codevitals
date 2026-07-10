import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
const traverse = traverseModule.default || traverseModule;

// Basic regex for potential secrets
const SECRET_REGEX = /(?:api_key|secret|password|token|aws_access_key_id)["']?\s*[:=]\s*["']([^"']{10,})["']/i;
const SENSITIVE_ROUTES_REGEX = /\/(?:admin|api\/protected)/;
const AUTH_MIDDLEWARE_REGEX = /(?:verifyJWT|requireAuth|passport|authMiddleware|isAuthenticated)/;

export async function analyzeProject(cwd) {
  const issues = [];
  const metrics = {
    baseScore: 100,
    exposedSecrets: 0,
    missingAuth: 0,
    deadCode: 0,
    consoleLogs: 0
  };

  const files = await fg('**/*.{js,jsx}', {
    cwd,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
    absolute: true
  });

  for (const file of files) {
    const code = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(cwd, file);

    // 1. Secret & API Key Leakage
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      if (SECRET_REGEX.test(line)) {
        metrics.exposedSecrets++;
        issues.push({
          type: 'SecretLeak',
          file: relativePath,
          line: index + 1,
          snippet: line.trim(),
          originalCode: line.trim()
        });
      }
      
      // Console.log tracker
      if (line.includes('console.log(')) {
        metrics.consoleLogs++;
      }
    });

    // 2. Missing Authentication Checker
    // A rudimentary check if a sensitive route is defined but no auth middleware is present in the file
    if (SENSITIVE_ROUTES_REGEX.test(code) && !AUTH_MIDDLEWARE_REGEX.test(code)) {
      metrics.missingAuth++;
      issues.push({
        type: 'MissingAuth',
        file: relativePath,
        line: 1, // File level issue
        snippet: code.substring(0, 200) + '...', // First 200 chars for context
        originalCode: code
      });
    }

    // 3. Dead Code / Unused Functions
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx']
      });

      // Keep track of function declarations and their references
      const declaredFunctions = new Map();
      const references = new Set();
      const exports = new Set();

      traverse(ast, {
        FunctionDeclaration(path) {
          if (path.node.id) {
            declaredFunctions.set(path.node.id.name, path);
          }
        },
        VariableDeclarator(path) {
          // Arrow functions assigned to variables
          if (
            path.node.id.type === 'Identifier' &&
            (path.node.init?.type === 'ArrowFunctionExpression' || path.node.init?.type === 'FunctionExpression')
          ) {
            declaredFunctions.set(path.node.id.name, path);
          }
        },
        Identifier(path) {
          if (
            path.parent.type !== 'FunctionDeclaration' && 
            path.parent.type !== 'VariableDeclarator' &&
            path.parent.type !== 'ExportSpecifier'
          ) {
            references.add(path.node.name);
          }
        },
        ExportNamedDeclaration(path) {
          if (path.node.declaration) {
            if (path.node.declaration.type === 'FunctionDeclaration' && path.node.declaration.id) {
              exports.add(path.node.declaration.id.name);
            } else if (path.node.declaration.type === 'VariableDeclaration') {
              path.node.declaration.declarations.forEach(d => {
                if (d.id.type === 'Identifier') exports.add(d.id.name);
              });
            }
          }
        },
        ExportDefaultDeclaration(path) {
           if (path.node.declaration.type === 'FunctionDeclaration' && path.node.declaration.id) {
             exports.add(path.node.declaration.id.name);
           }
        }
      });

      for (const [name, pathObj] of declaredFunctions.entries()) {
        if (!references.has(name) && !exports.has(name)) {
          metrics.deadCode++;
          const loc = pathObj.node.loc;
          const snippet = code.split('\n').slice(loc.start.line - 1, loc.end.line).join('\n');
          issues.push({
            type: 'DeadCode',
            file: relativePath,
            line: loc.start.line,
            snippet,
            originalCode: snippet
          });
        }
      }
    } catch (e) {
      // Ignore parse errors (might be some experimental syntax)
    }
  }

  // Calculate Score
  let score = metrics.baseScore 
              - (metrics.exposedSecrets * 30) 
              - (metrics.missingAuth * 25) 
              - (metrics.deadCode * 15) 
              - (metrics.consoleLogs > 0 ? 10 : 0);
  
  if (score < 0) score = 0;

  return { metrics: { ...metrics, finalScore: score }, issues };
}
