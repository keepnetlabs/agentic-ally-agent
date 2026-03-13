#!/usr/bin/env node
/**
 * Post-build script to fix Cloudflare Workers compatibility issues
 * 
 * This script fixes:
 * 1. The import.meta.url issue in generated files by adding null checks
 * 2. The process.versions read-only property assignment issue
 * 3. Reorders AutonomousWorkflow class to appear after executeAutonomousGeneration function
 * 4. Injects BatchOrchestratorWorkflow class into compiled output
 * 5. Exports both workflow classes from index.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const MASTRA_OUTPUT_DIR = '.mastra/output';
const FILES_TO_FIX = ['index.mjs', 'mastra.mjs'];
const WRANGLER_CONFIG_PATH = join(MASTRA_OUTPUT_DIR, 'wrangler.json');

// TypeScript stub - returns empty object for dynamic imports
const TYPESCRIPT_STUB = `// TypeScript stub for Cloudflare Workers (not needed at runtime)
export default {};
export const transpileModule = () => ({ outputText: '' });
export const createSourceFile = () => ({});
export const ScriptTarget = { Latest: 99 };
export const ModuleKind = { ESNext: 99 };
`;

/**
 * Create typescript-stub.mjs file for wrangler alias
 */
function createTypescriptStub() {
  const stubPath = join(MASTRA_OUTPUT_DIR, 'typescript-stub.mjs');
  try {
    writeFileSync(stubPath, TYPESCRIPT_STUB, 'utf8');
    console.log(`  ✅ Created typescript-stub.mjs`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating typescript-stub.mjs:`, error.message);
    return false;
  }
}

/**
 * Fix dist-*.mjs files that contain typescript imports
 * Wrangler tries to bundle these and fails because typescript-stub.mjs doesn't exist
 */
function fixTypescriptImports() {
  try {
    if (!existsSync(MASTRA_OUTPUT_DIR)) {
      return false;
    }

    const files = readdirSync(MASTRA_OUTPUT_DIR);
    const distFiles = files.filter(f => f.startsWith('dist-') && f.endsWith('.mjs'));
    
    let fixed = false;
    
    for (const distFile of distFiles) {
      const filePath = join(MASTRA_OUTPUT_DIR, distFile);
      let content = readFileSync(filePath, 'utf8');
      
      // Replace dynamic typescript imports with inline stub
      if (content.includes("import('typescript')") || content.includes('import("typescript")')) {
        // Replace the dynamic import with a resolved promise returning stub
        content = content.replace(
          /await\s+import\s*\(\s*['"]typescript['"]\s*\)/g,
          'Promise.resolve({ default: {}, transpileModule: () => ({ outputText: "" }), createSourceFile: () => ({}), ScriptTarget: { Latest: 99 }, ModuleKind: { ESNext: 99 } })'
        );
        
        // Also handle non-awaited imports
        content = content.replace(
          /import\s*\(\s*['"]typescript['"]\s*\)/g,
          'Promise.resolve({ default: {}, transpileModule: () => ({ outputText: "" }), createSourceFile: () => ({}), ScriptTarget: { Latest: 99 }, ModuleKind: { ESNext: 99 } })'
        );
        
        writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Fixed typescript imports in ${distFile}`);
        fixed = true;
      }
    }
    
    // Also fix mastra.mjs if it has typescript imports
    const mastraPath = join(MASTRA_OUTPUT_DIR, 'mastra.mjs');
    if (existsSync(mastraPath)) {
      let content = readFileSync(mastraPath, 'utf8');
      if (content.includes("import('typescript')") || content.includes('import("typescript")')) {
        content = content.replace(
          /await\s+import\s*\(\s*['"]typescript['"]\s*\)/g,
          'Promise.resolve({ default: {}, transpileModule: () => ({ outputText: "" }), createSourceFile: () => ({}), ScriptTarget: { Latest: 99 }, ModuleKind: { ESNext: 99 } })'
        );
        content = content.replace(
          /import\s*\(\s*['"]typescript['"]\s*\)/g,
          'Promise.resolve({ default: {}, transpileModule: () => ({ outputText: "" }), createSourceFile: () => ({}), ScriptTarget: { Latest: 99 }, ModuleKind: { ESNext: 99 } })'
        );
        writeFileSync(mastraPath, content, 'utf8');
        console.log(`  ✅ Fixed typescript imports in mastra.mjs`);
        fixed = true;
      }
    }
    
    return fixed;
  } catch (error) {
    console.error(`❌ Error fixing typescript imports:`, error.message);
    return false;
  }
}

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

// Source file paths for workflow classes
const AUTONOMOUS_WORKFLOW_SOURCE = join(PROJECT_ROOT, 'src/mastra/workflows/autonomous-workflow.ts');
const BATCH_ORCHESTRATOR_WORKFLOW_SOURCE = join(PROJECT_ROOT, 'src/mastra/workflows/batch-orchestrator-workflow.ts');

/**
 * Extract a class from a TS source file using brace matching.
 * Returns the raw class string (still has TS annotations).
 */
function extractClassFromSource(sourcePath, className) {
  try {
    if (!existsSync(sourcePath)) {
      console.log(`  ⚠️  Source file not found: ${sourcePath}`);
      return null;
    }

    const sourceContent = readFileSync(sourcePath, 'utf8');
    const classPattern = new RegExp(`export\\s+class\\s+${className}`);
    const classStartMatch = sourceContent.match(classPattern);
    if (!classStartMatch) {
      console.log(`  ⚠️  Could not find ${className} class in source file`);
      return null;
    }

    const classEndIndex = findFunctionEnd(sourceContent, classStartMatch.index);
    if (classEndIndex === -1) {
      console.log(`  ⚠️  Could not find end of ${className} class`);
      return null;
    }

    return sourceContent.substring(classStartMatch.index, classEndIndex);
  } catch (error) {
    console.error(`  ❌ Error reading source file for ${className}:`, error.message);
    return null;
  }
}

/**
 * Strip TS annotations from AutonomousWorkflow (simple class, few annotations).
 */
function stripAutonomousWorkflowTypes(code) {
  return code
    .replace(/import\s+type\s+.*?from\s+['"].*?['"];?\n?/g, '')
    .replace(/import\s+.*?from\s+['"].*?['"];?\n?/g, '')
    // run(event: { payload: AutonomousRequestBody }, step: WorkflowStep)
    .replace(/:\s*\{[^}]*payload:\s*AutonomousRequestBody[^}]*\}/g, '')
    .replace(/:\s*WorkflowStep/g, '')
    .replace(/:\s*CloudflareEnv/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strip TS annotations from BatchOrchestratorWorkflow.
 * Uses PRECISE patterns to avoid destroying object literals like retries: {...} and params: {...}.
 */
function stripBatchOrchestratorTypes(code) {
  return code
    .replace(/import\s+type\s+.*?from\s+['"].*?['"];?\n?/g, '')
    .replace(/import\s+.*?from\s+['"].*?['"];?\n?/g, '')
    // run(event: { payload: BatchOrchestratorPayload }, step: WorkflowStep)
    .replace(
      /async\s+run\(event:\s*\{\s*payload:\s*\w+\s*\},\s*step:\s*WorkflowStep\)/,
      'async run(event, step)'
    )
    // const failedPages: Array<{ page: number; error: string }> = []
    .replace(/:\s*Array<[^>]*>/g, '')
    // const errors: string[] = []
    .replace(/:\s*string\[\]/g, '')
    // .filter((r: { id?: string }) => ...)  →  .filter((r) => ...)
    .replace(/\(r:\s*\{[^}]*\}\)/g, '(r)')
    // .map((e: string) => ...)  →  .map((e) => ...)
    .replace(/\(e:\s*string\)/g, '(e)')
    // .map((a: unknown) => ...)  →  .map((a) => ...)
    .replace(/\(a:\s*unknown\)/g, '(a)')
    // as AutonomousAction (type assertion)
    .replace(/\s+as\s+AutonomousAction/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getAutonomousWorkflowFromSource() {
  const raw = extractClassFromSource(AUTONOMOUS_WORKFLOW_SOURCE, 'AutonomousWorkflow');
  return raw ? stripAutonomousWorkflowTypes(raw) : null;
}

function getBatchOrchestratorWorkflowFromSource() {
  const raw = extractClassFromSource(BATCH_ORCHESTRATOR_WORKFLOW_SOURCE, 'BatchOrchestratorWorkflow');
  return raw ? stripBatchOrchestratorTypes(raw) : null;
}

function ensureWorkflowEntrypointImport(content) {
  // NOTE: Only import WorkflowEntrypoint — WorkflowStep is a TypeScript-only type,
  // it does NOT exist as a runtime export in cloudflare:workers module.
  const NEEDED_IMPORT = "import { WorkflowEntrypoint } from 'cloudflare:workers';";

  // Check if WorkflowEntrypoint import already exists
  if (content.includes('WorkflowEntrypoint')) {
    // Remove WorkflowStep from import if present (it's TS-only, not a runtime export)
    const stepImportPattern = /import\s*\{\s*WorkflowEntrypoint\s*,\s*WorkflowStep\s*\}\s*from\s*['"]cloudflare:workers['"];?/g;
    if (stepImportPattern.test(content)) {
      content = content.replace(stepImportPattern, "import { WorkflowEntrypoint } from 'cloudflare:workers';");
      console.log(`  ✅ Removed WorkflowStep from cloudflare:workers import (TS-only type)`);
      return { content, fixed: true };
    }
    console.log(`  ✅ WorkflowEntrypoint import already exists`);
    return { content, fixed: false };
  }

  // Find a good place to add the import - near other cloudflare:workers imports or at the top
  const cloudflareImportPattern = /import\s+.*?\s+from\s+['"]cloudflare:workers['"];?\n/;
  const cloudflareMatch = content.match(cloudflareImportPattern);

  if (cloudflareMatch) {
    const insertIndex = cloudflareMatch.index + cloudflareMatch[0].length;
    const beforeInsert = content.substring(0, insertIndex);
    const afterInsert = content.substring(insertIndex);
    return { content: beforeInsert + NEEDED_IMPORT + '\n' + afterInsert, fixed: true };
  }

  // Find the first function or class declaration
  const firstDeclaration = content.match(/(?:^|\n)(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+/);
  if (firstDeclaration) {
    const insertIndex = firstDeclaration.index + 1;
    const beforeInsert = content.substring(0, insertIndex);
    const afterInsert = content.substring(insertIndex);
    return { content: beforeInsert + NEEDED_IMPORT + '\n' + afterInsert, fixed: true };
  }

  // Fallback: add at the very beginning
  return { content: NEEDED_IMPORT + '\n' + content, fixed: true };
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

/**
 * Inject dependencies that BatchOrchestratorWorkflow needs but Mastra build doesn't include.
 * These are injected right before the workflow class.
 */
function getBatchOrchestratorDependencies(content) {
  const deps = [];

  // fetchGroupMembersPage — hardcoded JS version (not in Mastra bundle, regex extraction too fragile)
  if (!content.includes('function fetchGroupMembersPage')) {
    deps.push(`async function fetchGroupMembersPage(token, groupResourceId, baseApiUrl, pageNumber, pageSize = 1000) {
  const logger = getLogger('FetchGroupMembersPage');
  const payload = {
    pageNumber,
    pageSize,
    orderBy: 'CreateTime',
    ascending: false,
    filter: {
      Condition: 'AND',
      SearchInputTextValue: '',
      FilterGroups: [
        { Condition: 'AND', FilterItems: [], FilterGroups: [] },
        { Condition: 'OR', FilterItems: [], FilterGroups: [] },
      ],
    },
    excludeGroupUsers: false,
  };
  const response = await fetch(\`\${baseApiUrl}/api/target-groups/\${groupResourceId}/users\`, {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${token}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    logger.error('group_members_page_fetch_failed', {
      groupResourceId,
      pageNumber,
      status: response.status,
      errorBody: errorBody.slice(0, 500),
    });
    throw new Error(\`Failed to fetch group members page \${pageNumber}: \${response.status} \${response.statusText}\`);
  }
  const result = await response.json();
  const rawUsers = result.data?.results || [];
  const users = [];
  for (const user of rawUsers) {
    if (user.status !== 'Active' && user.status !== undefined) continue;
    users.push({
      resourceId: user.resourceId,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department || undefined,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      phoneNumber: user.phoneNumber,
    });
  }
  return {
    users,
    totalPages: result.data?.totalNumberOfPages || 1,
    totalRecords: result.data?.totalNumberOfRecords || 0,
  };
}`);
    console.log(`  ✅ Injected fetchGroupMembersPage function (hardcoded JS)`);
  }

  // CHUNK_SIZE — used by BatchOrchestratorWorkflow, defined outside class in source file
  // Other CHUNK_SIZE in bundle are function-scoped (translation), won't conflict at top level
  deps.push(`const CHUNK_SIZE = 100;`);
  console.log(`  ✅ Injected CHUNK_SIZE constant`);

  // CF_WORKFLOW_LIMITS — not in Mastra bundle
  if (!content.includes('CF_WORKFLOW_LIMITS')) {
    deps.push(`const CF_WORKFLOW_LIMITS = {
  INSTANCE_CREATION_RATE_PER_SEC: 100,
  MAX_INSTANCE_ID_LENGTH: 100,
  MAX_EVENT_PAYLOAD_BYTES: 1048576,
  MAX_CONCURRENT_INSTANCES: 10000,
  CHUNK_THROTTLE_MS: 1100,
  CREATE_FALLBACK_CONCURRENCY: 25,
};`);
    console.log(`  ✅ Injected CF_WORKFLOW_LIMITS constant`);
  }

  return deps.join('\n\n');
}

function addBatchOrchestratorWorkflowToCompiled(content) {
  let fixed = false;

  // Always inject missing dependencies first (even if class already exists)
  const deps = getBatchOrchestratorDependencies(content);
  if (deps) {
    // Insert dependencies BEFORE the class if it exists, otherwise at the end
    const classMatch = content.match(/export\s+class\s+BatchOrchestratorWorkflow/);
    if (classMatch) {
      const beforeClass = content.substring(0, classMatch.index);
      const afterClass = content.substring(classMatch.index);
      content = beforeClass.trimEnd() + '\n\n' + deps + '\n\n' + afterClass;
    } else {
      content = content.trimEnd() + '\n\n' + deps + '\n';
    }
    fixed = true;
  }

  // Add class if not already present
  if (!content.includes('class BatchOrchestratorWorkflow')) {
    const workflowClass = getBatchOrchestratorWorkflowFromSource();
    if (!workflowClass) {
      return { content, fixed };
    }
    content = content.trimEnd() + '\n\n' + workflowClass + '\n';
    fixed = true;
  } else {
    console.log(`  ✅ BatchOrchestratorWorkflow class already exists`);
  }

  return { content, fixed };
}

function fixIndexMjsExport(filePath, content) {
  // Only process index.mjs
  if (!filePath.includes('index.mjs')) {
    return { content, fixed: false };
  }

  // Check if mastra.mjs import exists
  if (!content.includes("import './mastra.mjs'")) {
    console.log(`  ⚠️  Could not find mastra.mjs import in index.mjs`);
    return { content, fixed: false };
  }

  const mastraImportPattern = /import\s+['"]\.\/mastra\.mjs['"];?\n/;
  const match = content.match(mastraImportPattern);
  if (!match) {
    console.log(`  ⚠️  Could not find mastra.mjs import pattern`);
    return { content, fixed: false };
  }

  let fixed = false;
  const insertIndex = match.index + match[0].length;

  // Workflow classes to export from index.mjs
  const workflowExports = [
    { className: 'AutonomousWorkflow' },
    { className: 'BatchOrchestratorWorkflow' },
  ];

  let exportLines = '';
  for (const { className } of workflowExports) {
    if (content.includes(`export { ${className} }`)) {
      console.log(`  ✅ ${className} export already exists in index.mjs`);
    } else {
      exportLines += `export { ${className} } from './mastra.mjs';\n`;
      console.log(`  ✅ Added ${className} export to index.mjs`);
      fixed = true;
    }
  }

  if (!fixed) {
    return { content, fixed: false };
  }

  const beforeInsert = content.substring(0, insertIndex);
  const afterInsert = content.substring(insertIndex);
  return { content: beforeInsert + exportLines + afterInsert, fixed: true };
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
    
    // Add workflow classes (only for mastra.mjs)
    if (filePath.includes('mastra.mjs')) {
      // AutonomousWorkflow — positioned after executeAutonomousGeneration
      const addResult = addAutonomousWorkflowToCompiled(content);
      if (addResult.fixed) {
        content = addResult.content;
        console.log(`  ✅ Added AutonomousWorkflow class after executeAutonomousGeneration`);
        fixed = true;
      }

      // BatchOrchestratorWorkflow — append at end of file
      const batchResult = addBatchOrchestratorWorkflowToCompiled(content);
      if (batchResult.fixed) {
        content = batchResult.content;
        console.log(`  ✅ Added BatchOrchestratorWorkflow class to mastra.mjs`);
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

    // const smishingCrudWorkerBinding = {
    //   binding: "SMISHING_CRUD_WORKER",
    //   service: "crud-smishing-worker"
    // };

    const autonomousWorkflowBinding = {
      binding: "AUTONOMOUS_WORKFLOW",
      name: "AUTONOMOUS_WORKFLOW",
      class_name: "AutonomousWorkflow"
    };

    const batchOrchestratorWorkflowBinding = {
      binding: "BATCH_ORCHESTRATOR_WORKFLOW",
      name: "BATCH_ORCHESTRATOR_WORKFLOW",
      class_name: "BatchOrchestratorWorkflow"
    };

    const batchWorkflowKvBinding = {
      binding: "BATCH_WORKFLOW_KV",
      id: "a235dbdc79a34c25ba3fd8fc38673d1f",
      preview_id: "a235dbdc79a34c25ba3fd8fc38673d1f"
    };

    // Add kv_namespaces if not already present
    if (!config.kv_namespaces) {
      config.kv_namespaces = [];
    }

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

    // // Check if SMISHING_CRUD_WORKER already exists
    // const existingSmishingBinding = config.services.find(s => s.binding === "SMISHING_CRUD_WORKER");
    // if (!existingSmishingBinding) {
    //   config.services.push(smishingCrudWorkerBinding);
    //   console.log(`  ✅ Added SMISHING_CRUD_WORKER service binding`);
    //   added = true;
    // } else {
    //   console.log(`  ✅ SMISHING_CRUD_WORKER service binding already exists`);
    // }

    // Check if AUTONOMOUS_WORKFLOW already exists
    const existingAutonomousWorkflow = config.workflows.find(w => w.binding === "AUTONOMOUS_WORKFLOW");
    if (!existingAutonomousWorkflow) {
      config.workflows.push(autonomousWorkflowBinding);
      console.log(`  ✅ Added AUTONOMOUS_WORKFLOW workflow binding`);
      added = true;
    } else {
      console.log(`  ✅ AUTONOMOUS_WORKFLOW workflow binding already exists`);
    }

    // Check if BATCH_ORCHESTRATOR_WORKFLOW already exists
    const existingBatchWorkflow = config.workflows.find(w => w.binding === "BATCH_ORCHESTRATOR_WORKFLOW");
    if (!existingBatchWorkflow) {
      config.workflows.push(batchOrchestratorWorkflowBinding);
      console.log(`  ✅ Added BATCH_ORCHESTRATOR_WORKFLOW workflow binding`);
      added = true;
    } else {
      console.log(`  ✅ BATCH_ORCHESTRATOR_WORKFLOW workflow binding already exists`);
    }

    // Check if BATCH_WORKFLOW_KV already exists
    const existingBatchKv = config.kv_namespaces.find(k => k.binding === "BATCH_WORKFLOW_KV");
    if (!existingBatchKv) {
      config.kv_namespaces.push(batchWorkflowKvBinding);
      console.log(`  ✅ Added BATCH_WORKFLOW_KV KV namespace binding`);
      added = true;
    } else {
      console.log(`  ✅ BATCH_WORKFLOW_KV KV namespace binding already exists`);
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

  // Create typescript stub file
  console.log('\n🔧 Creating typescript stub...');
  if (createTypescriptStub()) {
    fixedCount++;
  }

  // Fix typescript imports in dist-*.mjs files
  console.log('\n🔧 Fixing typescript imports in dist files...');
  if (fixTypescriptImports()) {
    fixedCount++;
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
