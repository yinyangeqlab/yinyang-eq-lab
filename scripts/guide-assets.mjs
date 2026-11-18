import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const guideAssets = JSON.parse(readFileSync(new URL('./iem-guide-assets.json', import.meta.url), 'utf8'));

export function verifyGuideAssets(directory, { allowMissing = false } = {}) {
  for (const asset of guideAssets) {
    const file = join(directory, asset.path);
    if (allowMissing && !existsSync(file)) continue;
    if (!existsSync(file) || !lstatSync(file).isFile() ||
        createHash('sha256').update(readFileSync(file)).digest('hex') !== asset.sha256) {
      throw new Error(`Missing or changed IEM guide asset: ${asset.path}. Restore the exact published guide files before full packaging.`);
    }
  }
}
