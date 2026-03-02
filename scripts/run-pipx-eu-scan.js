#!/usr/bin/env node
/**
 * Runs eu-ai-act-scanner via pipx (EU AI Act + GDPR). Saves JSON to docs/compliance-reports/eu-scan-report.json
 */
import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { platform } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const isWin = platform() === 'win32';
const pyPath = process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python312\\python.exe`;
const python = isWin && pyPath && existsSync(pyPath) ? `"${pyPath}"` : 'python';
const args = ' scan . --gdpr --json'; // EU AI Act + GDPR
const output = execSync(`${python} -m pipx run eu-ai-act-scanner${args}`, {
  encoding: 'utf8',
  env: process.env,
});
const outPath = join(root, 'docs', 'compliance-reports', 'eu-scan-report.json');
writeFileSync(outPath, output, 'utf8');
console.log(`\nRapor kaydedildi: ${outPath} (EU AI Act + GDPR)`);
