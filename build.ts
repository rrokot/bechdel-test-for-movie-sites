import { context, type BuildOptions } from 'esbuild';
import { zipSync } from 'fflate';
import { cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createManifest } from './src/manifest.ts';

const OUT_DIR = 'dist';
const watch = process.argv.includes('--watch');
const zip = process.argv.includes('--zip');

// package.json is the only place the version is maintained.
const { version } = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };

const writeStatic = async () => {
  await cp('static', OUT_DIR, { recursive: true });
  await cp('src/popup/popup.html', join(OUT_DIR, 'popup.html'));
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(createManifest(version), null, 2));
};

const zipDist = async () => {
  const entries = await readdir(OUT_DIR, { recursive: true, withFileTypes: true });
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries.filter((item) => item.isFile())) {
    const path = join(entry.parentPath, entry.name);
    files[relative(OUT_DIR, path).replaceAll('\\', '/')] = await readFile(path);
  }
  const name = `bechdel-test-for-movie-sites-${version}.zip`;
  await writeFile(name, zipSync(files, { level: 9 }));
  console.log(`Packed ${Object.keys(files).length} files into ${name}`);
};

const options: BuildOptions = {
  entryPoints: [
    { in: 'src/background/index.ts', out: 'background' },
    { in: 'src/bechdeltest/index.ts', out: 'bechdeltest' },
    { in: 'src/bechdeltest/styles.css', out: 'bechdeltest' },
    { in: 'src/catalog/index.ts', out: 'catalog' },
    { in: 'src/popup/index.ts', out: 'popup' },
  ],
  outdir: OUT_DIR,
  bundle: true,
  loader: { '.svg': 'dataurl', '.png': 'dataurl' },
  format: 'iife',
  target: 'chrome130',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
};

await rm(OUT_DIR, { recursive: true, force: true });
await writeStatic();
const ctx = await context(options);

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
  if (zip) await zipDist();
}
