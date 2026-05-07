const fs = require('fs');
const path = require('path');

const files = [
  'tsconfig.build.tsbuildinfo',
  'tsconfig.tsbuildinfo',
  'tsconfig.build.json.tsbuildinfo',
].map((f) => path.resolve(__dirname, '..', f));

for (const f of files) {
  try {
    if (fs.existsSync(f)) {
      fs.rmSync(f, { force: true });
      // eslint-disable-next-line no-console
      console.log(`Removed ${path.basename(f)}`);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`Could not remove ${f}: ${String(e)}`);
  }
}

