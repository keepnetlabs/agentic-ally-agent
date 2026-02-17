#!/usr/bin/env node
/**
 * Post-build script to fix Cloudflare Workers compatibility issues
 * 
 * This script fixes:
 * 1. The import.meta.url issue in generated files by adding null checks
 * 2. The process.versions read-only property assignment issue
 * 3. Reorders AutonomousWorkflow class to appear after executeAutonomousGeneration function
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const MASTRA_OUTPUT_DIR = '.mastra/output';
const FILES_TO_FIX = ['index.mjs', 'mastra.mjs'];
const WRANGLER_CONFIG_PATH = join(MASTRA_OUTPUT_DIR, 'wrangler.json');

const ORIGINAL_SHIM = `// -- Shims --
import cjsUrl from 'node:url';
import cjsPath from 'node:path';
import cjsModule from 'node:module';
const __filename = cjsUrl.fileURLToPath(import.meta.url);
const __dirname = cjsPath.dirname(__filename);
const require = cjsModule.createRequire(import.meta.url);`;

const FIXED_SHIM = `// -- Shims --
import cjsUrl from 'node:url';
import cjsPath from 'node:path';
import cjsModule from 'node:module';
const __filename = import.meta.url ? cjsUrl.fileURLToPath(import.meta.url) : '/index.mjs';
const __dirname = cjsPath.dirname(__filename);
const require = import.meta.url ? cjsModule.createRequire(import.meta.url) : (id) => { throw new Error(\`Cannot require module: \${id}\`); };`;

// Pattern to match process.versions assignments
const PROCESS_VERSIONS_PATTERN = /process\.versions = process\.versions \|\| {};\nprocess\.versions\.node = '[^']+';/g;

// Replacement that safely handles process.versions
const PROCESS_VERSIONS_REPLACEMENT = `// process.versions fix for Node.js compatibility
if (!process.versions) {
  process.versions = { node: '22.16.0' };
}`;

// Pattern to match executeAutonomousGeneration function start
const EXECUTE_AUTONOMOUS_GENERATION_START_PATTERN = /async\s+function\s+executeAutonomousGeneration\([^)]*\)\s*\{/;

// Function to find the end of a function by matching braces
function findFunctionEnd(content, startIndex) {
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let i = startIndex;
  
  // Find the opening brace
  while (i < content.length && content[i] !== '{') {
    i++;
  }
  
  if (i >= content.length) return -1;
  
  braceCount = 1;
  i++; // Skip the opening brace
  
  while (i < content.length && braceCount > 0) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    // Handle string literals
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = null;
    }
    
    // Count braces only when not in a string
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      }
    }
    
    i++;
  }
  
  return braceCount === 0 ? i : -1;
}

// Source file path for AutonomousWorkflow
const AUTONOMOUS_WORKFLOW_SOURCE = join(PROJECT_ROOT, 'src/mastra/workflows/autonomous-workflow.ts');

function getAutonomousWorkflowFromSource() {
  try {
    if (!existsSync(AUTONOMOUS_WORKFLOW_SOURCE)) {
      console.log(`  ⚠️  Source file not found: ${AUTONOMOUS_WORKFLOW_SOURCE}`);
      return null;
    }

    const sourceContent = readFileSync(AUTONOMOUS_WORKFLOW_SOURCE, 'utf8');
    
    // Extract the class definition - find export class AutonomousWorkflow ... }
    const classMatch = sourceContent.match(/export\s+class\s+AutonomousWorkflow[\s\S]*?\n\}/);
    if (!classMatch) {
      console.log(`  ⚠️  Could not find AutonomousWorkflow class in source file`);
      return null;
    }

    // Convert TypeScript to JavaScript-compatible format
    let workflowClass = classMatch[0];
    
    // Remove type annotations and imports - keep only the class body
    workflowClass = workflowClass
      // Remove type imports
      .replace(/import\s+type\s+.*?from\s+['"].*?['"];?\n?/g, '')
      // Remove regular imports (they should already be in compiled file)
      .replace(/import\s+.*?from\s+['"].*?['"];?\n/g, '')
      // Remove type annotations from function parameters
      .replace(/:\s*\{[^}]*payload:\s*AutonomousRequestBody[^}]*\}/g, '')
      .replace(/:\s*CloudflareEnv/g, '')
      // Clean up extra newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return workflowClass;
  } catch (error) {
    console.error(`  ❌ Error reading source file:`, error.message);
    return null;
  }
}

function ensureWorkflowEntrypointImport(content) {
  // Check if WorkflowEntrypoint import already exists
  if (content.includes("import { WorkflowEntrypoint }") || content.includes("import {WorkflowEntrypoint}")) {
    console.log(`  ✅ WorkflowEntrypoint import already exists`);
    return { content, fixed: false };
  }

  // Find a good place to add the import - usually near other cloudflare:workers imports or at the top
  // Look for other imports from cloudflare:workers
  const cloudflareImportPattern = /import\s+.*?\s+from\s+['"]cloudflare:workers['"];?\n/;
  const cloudflareMatch = content.match(cloudflareImportPattern);
  
  if (cloudflareMatch) {
    // Add after existing cloudflare:workers import
    const insertIndex = cloudflareMatch.index + cloudflareMatch[0].length;
    const beforeInsert = content.substring(0, insertIndex);
    const afterInsert = content.substring(insertIndex);
    const newContent = beforeInsert + "import { WorkflowEntrypoint } from 'cloudflare:workers';\n" + afterInsert;
    return { content: newContent, fixed: true };
  }

  // If no cloudflare:workers import exists, add at the top after other imports
  // Find the first function or class declaration
  const firstDeclaration = content.match(/(?:^|\n)(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+/);
  if (firstDeclaration) {
    const insertIndex = firstDeclaration.index + 1; // After the newline
    const beforeInsert = content.substring(0, insertIndex);
    const afterInsert = content.substring(insertIndex);
    const newContent = beforeInsert + "import { WorkflowEntrypoint } from 'cloudflare:workers';\n" + afterInsert;
    return { content: newContent, fixed: true };
  }

  // Fallback: add at the very beginning
  return { content: "import { WorkflowEntrypoint } from 'cloudflare:workers';\n" + content, fixed: true };
}

function addAutonomousWorkflowToCompiled(content) {
  // First ensure WorkflowEntrypoint import exists
  const importResult = ensureWorkflowEntrypointImport(content);
  if (importResult.fixed) {
    content = importResult.content;
    console.log(`  ✅ Added WorkflowEntrypoint import`);
  }

  // Check if executeAutonomousGeneration exists
  if (!content.includes('executeAutonomousGeneration')) {
    console.log(`  ⚠️  Could not find executeAutonomousGeneration function`);
    return { content, fixed: false };
  }

  // Check if AutonomousWorkflow already exists (and is not inside executeAutonomousGeneration)
  // We need to check if it's properly placed after the function
  const workflowMatch = content.match(/export\s+class\s+AutonomousWorkflow/);
  if (workflowMatch) {
    // Check if it's inside executeAutonomousGeneration by finding the function end
    const executeStartMatch = content.match(EXECUTE_AUTONOMOUS_GENERATION_START_PATTERN);
    if (executeStartMatch) {
      const executeEndIndex = findFunctionEnd(content, executeStartMatch.index);
      if (executeEndIndex > 0 && workflowMatch.index < executeEndIndex) {
        // Workflow is inside the function, we need to move it
        console.log(`  ⚠️  AutonomousWorkflow is incorrectly placed inside executeAutonomousGeneration, will fix`);
      } else {
        console.log(`  ✅ AutonomousWorkflow already exists in correct position`);
        return { content, fixed: true }; // Return true because we may have added the import
      }
    }
  }

  // Find executeAutonomousGeneration function start
  const executeStartMatch = content.match(EXECUTE_AUTONOMOUS_GENERATION_START_PATTERN);
  if (!executeStartMatch) {
    console.log(`  ⚠️  Could not find executeAutonomousGeneration function`);
    return { content, fixed: false };
  }

  // Find the actual end of the function using brace matching
  const executeEndIndex = findFunctionEnd(content, executeStartMatch.index);
  if (executeEndIndex === -1) {
    console.log(`  ⚠️  Could not find end of executeAutonomousGeneration function`);
    return { content, fixed: false };
  }

  // If workflow already exists inside the function, remove it first
  if (workflowMatch && workflowMatch.index < executeEndIndex) {
    const workflowEndMatch = content.substring(workflowMatch.index).match(/^export\s+class\s+AutonomousWorkflow[\s\S]*?\n\}/);
    if (workflowEndMatch) {
      const workflowEndIndex = workflowMatch.index + workflowEndMatch[0].length;
      // Remove the incorrectly placed workflow
      content = content.substring(0, workflowMatch.index) + content.substring(workflowEndIndex);
      // Recalculate executeEndIndex after removal
      const newExecuteStartMatch = content.match(EXECUTE_AUTONOMOUS_GENERATION_START_PATTERN);
      if (newExecuteStartMatch) {
        const newExecuteEndIndex = findFunctionEnd(content, newExecuteStartMatch.index);
        if (newExecuteEndIndex > 0) {
          const executeEndIndex = newExecuteEndIndex;
        }
      }
    }
  }

  // Get AutonomousWorkflow from source file
  const workflowClass = getAutonomousWorkflowFromSource();
  if (!workflowClass) {
    return { content, fixed: false };
  }

  // Insert workflow right after executeAutonomousGeneration function ends
  const beforeInsert = content.substring(0, executeEndIndex);
  const afterInsert = content.substring(executeEndIndex);
  
  // Ensure proper spacing
  const newContent = beforeInsert + '\n\n' + workflowClass + '\n' + afterInsert;

  return { content: newContent, fixed: true };
}

function fixIndexMjsExport(filePath, content) {
  // Only process index.mjs
  if (!filePath.includes('index.mjs')) {
    return { content, fixed: false };
  }

  // Check if export already exists
  if (content.includes("export { AutonomousWorkflow }")) {
    console.log(`  ✅ AutonomousWorkflow export already exists in index.mjs`);
    return { content, fixed: false };
  }

  // Check if mastra.mjs import exists
  if (!content.includes("import './mastra.mjs'")) {
    console.log(`  ⚠️  Could not find mastra.mjs import in index.mjs`);
    return { content, fixed: false };
  }

  // Find the line after mastra.mjs import
  const mastraImportPattern = /import\s+['"]\.\/mastra\.mjs['"];?\n/;
  const match = content.match(mastraImportPattern);
  
  if (!match) {
    console.log(`  ⚠️  Could not find mastra.mjs import pattern`);
    return { content, fixed: false };
  }

  const insertIndex = match.index + match[0].length;
  
  // Insert export right after mastra.mjs import
  const beforeInsert = content.substring(0, insertIndex);
  const afterInsert = content.substring(insertIndex);
  
  const newContent = beforeInsert + "export { AutonomousWorkflow } from './mastra.mjs';\n" + afterInsert;

  return { content: newContent, fixed: true };
}

function fixFile(filePath) {
  try {
    if (!existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = readFileSync(filePath, 'utf8');
    let fixed = false;
    
    // Fix import.meta.url shims
    if (content.includes(ORIGINAL_SHIM)) {
      content = content.replace(ORIGINAL_SHIM, FIXED_SHIM);
      console.log(`  ✅ Fixed import.meta.url shims`);
      fixed = true;
    }
    
    // Fix process.versions assignment
    if (PROCESS_VERSIONS_PATTERN.test(content)) {
      content = content.replace(PROCESS_VERSIONS_PATTERN, PROCESS_VERSIONS_REPLACEMENT);
      console.log(`  ✅ Fixed process.versions assignment`);
      fixed = true;
    }
    
    // Add AutonomousWorkflow to appear after executeAutonomousGeneration (only for mastra.mjs)
    if (filePath.includes('mastra.mjs')) {
      const addResult = addAutonomousWorkflowToCompiled(content);
      if (addResult.fixed) {
        content = addResult.content;
        console.log(`  ✅ Added AutonomousWorkflow class after executeAutonomousGeneration`);
        fixed = true;
      }
    }
    
    // Add export statement to index.mjs
    const exportResult = fixIndexMjsExport(filePath, content);
    if (exportResult.fixed) {
      content = exportResult.content;
      console.log(`  ✅ Added AutonomousWorkflow export to index.mjs`);
      fixed = true;
    }
    
    if (fixed) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${filePath}`);
      return true;
    } else {
      console.log(`✅ File already fixed or no issues found: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function patchWranglerConfig() {
  try {
    if (!existsSync(WRANGLER_CONFIG_PATH)) {
      console.log(`⚠️  wrangler.json not found: ${WRANGLER_CONFIG_PATH}`);
      return false;
    }

    const config = JSON.parse(readFileSync(WRANGLER_CONFIG_PATH, 'utf8'));

    // Add service bindings if not already present
    if (!config.services) {
      config.services = [];
    }

    // Add workflows if not already present
    if (!config.workflows) {
      config.workflows = [];
    }

    const crudWorkerBinding = {
      binding: "CRUD_WORKER",
      service: "crud-training-worker"
    };

    const phishingCrudWorkerBinding = {
      binding: "PHISHING_CRUD_WORKER",
      service: "crud-phishing-worker"
    };

    const smishingCrudWorkerBinding = {
      binding: "SMISHING_CRUD_WORKER",
      service: "crud-smishing-worker"
    };

    const autonomousWorkflowBinding = {
      binding: "AUTONOMOUS_WORKFLOW",
      name: "AUTONOMOUS_WORKFLOW",
      class_name: "AutonomousWorkflow"
    };

    let added = false;

    // Check if CRUD_WORKER already exists
    const existingCrudBinding = config.services.find(s => s.binding === "CRUD_WORKER");
    if (!existingCrudBinding) {
      config.services.push(crudWorkerBinding);
      console.log(`  ✅ Added CRUD_WORKER service binding`);
      added = true;
    } else {
      console.log(`  ✅ CRUD_WORKER service binding already exists`);
    }

    // Check if PHISHING_CRUD_WORKER already exists
    const existingPhishingBinding = config.services.find(s => s.binding === "PHISHING_CRUD_WORKER");
    if (!existingPhishingBinding) {
      config.services.push(phishingCrudWorkerBinding);
      console.log(`  ✅ Added PHISHING_CRUD_WORKER service binding`);
      added = true;
    } else {
      console.log(`  ✅ PHISHING_CRUD_WORKER service binding already exists`);
    }

    // Check if SMISHING_CRUD_WORKER already exists
    const existingSmishingBinding = config.services.find(s => s.binding === "SMISHING_CRUD_WORKER");
    if (!existingSmishingBinding) {
      config.services.push(smishingCrudWorkerBinding);
      console.log(`  ✅ Added SMISHING_CRUD_WORKER service binding`);
      added = true;
    } else {
      console.log(`  ✅ SMISHING_CRUD_WORKER service binding already exists`);
    }

    // Check if AUTONOMOUS_WORKFLOW already exists
    const existingAutonomousWorkflow = config.workflows.find(w => w.binding === "AUTONOMOUS_WORKFLOW");
    if (!existingAutonomousWorkflow) {
      config.workflows.push(autonomousWorkflowBinding);
      console.log(`  ✅ Added AUTONOMOUS_WORKFLOW workflow binding`);
      added = true;
    } else {
      console.log(`  ✅ AUTONOMOUS_WORKFLOW workflow binding already exists`);
    }

    if (added) {
      writeFileSync(WRANGLER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(`❌ Error patching wrangler.json:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing Cloudflare Workers compatibility issues...\n');

  let fixedCount = 0;

  for (const fileName of FILES_TO_FIX) {
    const filePath = join(MASTRA_OUTPUT_DIR, fileName);
    if (fixFile(filePath)) {
      fixedCount++;
    }
  }

  // Patch wrangler.json to add service bindings
  console.log('\n🔧 Patching wrangler.json for service bindings...');
  if (patchWranglerConfig()) {
    fixedCount++;
  }

  if (fixedCount > 0) {
    console.log(`\n🎉 Successfully fixed ${fixedCount} file(s) for Cloudflare Workers deployment!`);
    console.log('You can now deploy using: npx wrangler deploy .mastra/output/index.mjs --config .mastra/output/wrangler.json');
  } else {
    console.log('\n📝 No files needed fixing - either already fixed or no Mastra output found.');
    console.log('Make sure to run "npm run build" first.');
  }
}

main();
