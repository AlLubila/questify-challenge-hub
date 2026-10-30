import sharp from 'sharp';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Render the existing vector brand mark; no generated placeholder artwork.
const mark = (await readFile('public/a-challenge-mark.svg', 'utf8')).replace(/<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">');
const drawing = mark.replace(/^.*?<svg[^>]*>/s, '').replace(/<\/svg>\s*$/, '');
const svg = (size, transparent = false, scale = 0.62) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${transparent ? '' : '<rect width="1024" height="1024" fill="#f7f2e8"/>'}<svg x="${512 - 512 * scale}" y="${512 - 512 * scale}" width="${1024 * scale}" height="${1024 * scale}" viewBox="0 0 48 48">${drawing}</svg></svg>`);
const write = async (file, size, transparent = false, scale = 0.62) => {
  await mkdir(path.dirname(file), { recursive: true });
  const image = sharp(svg(size, transparent, scale));
  if (!transparent) image.removeAlpha();
  await image.png().toFile(file);
};
const res = 'android/app/src/main/res';
for (const [density, factor] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  for (const name of ['ic_launcher', 'ic_launcher_round']) await write(`${res}/mipmap-${density}/${name}.png`, Math.round(48 * factor));
  await write(`${res}/mipmap-${density}/ic_launcher_foreground.png`, Math.round(108 * factor), true, 0.5);
}
for (const folder of await readdir(res)) {
  if (!folder.startsWith('drawable')) continue;
  try {
    if ((await readdir(`${res}/${folder}`)).includes('splash.png')) {
      const file = `${res}/${folder}/splash.png`;
      const { width, height } = await sharp(file).metadata();
      await sharp({ create: { width, height, channels: 4, background: '#f7f2e8' } })
        .composite([{ input: await sharp(svg(Math.min(width, height), true, 0.25)).png().toBuffer(), gravity: 'centre' }]).png().toFile(`${file}.tmp.png`);
      const { rename } = await import('node:fs/promises');
      await rename(`${file}.tmp.png`, file);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await write('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024);
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  await write(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`, 2732, false, 0.18);
}
await write('mobile-artifacts/store-icon-1024.png', 1024);
await write('mobile-artifacts/play-store-icon-512.png', 512);
console.log('Android, iOS and store icons rendered from the A Challenge vector mark.');
