// Lists public/vids/*.{mp4,webm,ogv,mov,m4v} into public/vids/index.json (browsers cannot list a directory).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'vids');
fs.mkdirSync(dir, { recursive: true });
const files = fs.readdirSync(dir).filter((f) => /\.(mp4|webm|ogv|mov|m4v)$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(files, null, 1));
console.log(`[vids] ${files.length} vidéo(s) : ${files.join(', ') || '(aucune)'}`);
