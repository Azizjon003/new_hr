import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { env } from '../config/env.js';

export const FILES = {
  base: path.resolve(env.FILES_DIR),
  photos: path.resolve(env.FILES_DIR, 'photos'),
  cvs: path.resolve(env.FILES_DIR, 'cvs'),
  files: path.resolve(env.FILES_DIR, 'files'),
  logos: path.resolve(env.FILES_DIR, 'logos'),
  pdfs: path.resolve(env.FILES_DIR, 'pdfs'),
};

export function ensureDirs(): void {
  for (const dir of Object.values(FILES)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function downloadToFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          file.close();
          fs.unlink(dest, () => undefined);
          return reject(new Error(`Download failed: ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', (err) => {
        file.close();
        fs.unlink(dest, () => undefined);
        reject(err);
      });
  });
}

export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
