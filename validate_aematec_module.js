const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const htmlFile = path.join(process.cwd(), 'aematec_inventario.html');
if (!fs.existsSync(htmlFile)) {
  console.error(`Missing file: ${htmlFile}`);
  process.exit(1);
}

const html = fs.readFileSync(htmlFile, 'utf8');
const scriptMatch = html.match(/<script\s+type=["']module["']\s*>([\s\S]*?)<\/script>/i);
if (!scriptMatch) {
  console.error('No <script type="module"> block found.');
  process.exit(1);
}

let moduleCode = scriptMatch[1];
moduleCode = moduleCode
  .replace(/^\s*import\s+(?:[^;]*?\s+from\s+)?["'][^"']+["'];?\s*$/gm, '')
  .replace(/^\s*import\s+["'][^"']+["'];?\s*$/gm, '');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aematec-'));
const tempFile = path.join(tempDir, 'aematec_module_check.js');
fs.writeFileSync(tempFile, moduleCode, 'utf8');

let syntaxStatus = 'OK';
let syntaxOutput = '';
try {
  execFileSync(process.execPath, ['--check', tempFile], { stdio: 'pipe' });
  syntaxOutput = 'Node syntax check: OK';
} catch (err) {
  syntaxStatus = 'SyntaxError';
  const stderr = err && err.stderr ? err.stderr.toString() : '';
  const stdout = err && err.stdout ? err.stdout.toString() : '';
  syntaxOutput = `${stdout}${stderr}`.trim() || err.message;
} finally {
  fs.rmSync(tempFile, { force: true });
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log(syntaxStatus === 'OK' ? 'Node syntax check: OK' : `Node syntax check: SyntaxError\n${syntaxOutput}`);

const guard = '__aematec_dedupe_guard';
const guardCount = (html.match(new RegExp(guard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
console.log(`Guard count: ${guardCount}`);

const divOpen = (html.match(/<div\b/gi) || []).length;
const divClose = (html.match(/<\/div>/gi) || []).length;
const articleOpen = (html.match(/<article\b/gi) || []).length;
const articleClose = (html.match(/<\/article>/gi) || []).length;
console.log(`div count: open=${divOpen}, close=${divClose}, balanced=${divOpen === divClose}`);
console.log(`article count: open=${articleOpen}, close=${articleClose}, balanced=${articleOpen === articleClose}`);
