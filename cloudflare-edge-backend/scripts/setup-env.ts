import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const devVarsPath = join(projectRoot, '.dev.vars');
const envPath = join(projectRoot, '.env');

const hint = `\nIf wrangler can't find your secrets, run this script directly in cloudflare-edge-backend folder:\n  cd cloudflare-edge-backend\n  npm run env:sync\n`;

if (!existsSync(devVarsPath)) {
  console.error('.dev.vars not found. Please create it before running this script.');
  process.exit(1);
}

const devVars = readFileSync(devVarsPath, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

const pairs = devVars.map((line) => line.split('='));

const secrets = ['ENCRYPTION_KEY', 'JWT_SECRET', 'FIRECRAWL_API_KEY', 'GEMINI_API_KEY'];

for (const secret of secrets) {
  const entry = pairs.find(([key]) => key === secret);
  if (!entry || !entry[1]) {
    console.warn(`Skipping ${secret} – not found in .dev.vars`);
    continue;
  }

  const value = entry[1].replace(/^"|"$/g, '');
  try {
    console.log(`Setting wrangler secret ${secret}...`);
    execSync(`npx wrangler secret put ${secret}`, {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: `${value}\n`,
    });
  } catch (err) {
    console.error(`Failed to set ${secret}. ${hint}`);
    process.exit(1);
  }
}

console.log('All secrets synced to wrangler.');
