#!/usr/bin/env node
/**
 * Post-build script to fix Cloudflare Workers compatibility issues
 * 
 * This script fixes:
 * 1. The import.meta.url issue in generated files by adding null checks
 * 2. The process.versions read-only property assignment issue
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

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

    const crudWorkerBinding = {
      binding: "CRUD_WORKER",
      service: "crud-training-worker"
    };

    // Check if CRUD_WORKER already exists
    const existingBinding = config.services.find(s => s.binding === "CRUD_WORKER");
    if (!existingBinding) {
      config.services.push(crudWorkerBinding);
      writeFileSync(WRANGLER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
      console.log(`  ✅ Added CRUD_WORKER service binding`);
      return true;
    } else {
      console.log(`  ✅ CRUD_WORKER service binding already exists`);
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
