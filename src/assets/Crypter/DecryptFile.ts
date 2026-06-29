import crypto from 'crypto';
import { Layout } from './CrypterTypes';
import fs from "fs";
import path from 'path';

const CHUNK_SIZE = 16 * 1024 * 1024;
const CONCURRENCY = 4;

class Semaphore {
  private count: number;
  private waiting: Array<() => void> = [];

  constructor(count: number) {
    this.count = count;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) { this.count--; return; }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.count--;
  }

  release(): void {
    this.count++;
    if (this.waiting.length > 0) { const resolve = this.waiting.shift()!; resolve(); }
  }
}

export default async function({
    inputFolder,
    outputFile = 'temp/undefined', 
    privateKey, 
    passwd
}:
{
    inputFolder: string, 
    outputFile: string, 
    privateKey: string, 
    passwd: string
})
{
    let outputStream: fs.WriteStream | null = null;
    let inputStream: fs.ReadStream | null = null;

    try {

        const filePlanPath = path.join(inputFolder, 'layout.json');
        const filePlan: Layout = JSON.parse(await fs.promises.readFile(filePlanPath, 'utf-8'));

        const sortedFiles = (await fs.promises.readdir(inputFolder))
            .filter((file: string) => file.endsWith('.enc'))
            .sort((a: string, b: string) => {
                const aNum = parseInt(a.match(/\d+/)?.[0] || '0', 10);
                const bNum = parseInt(b.match(/\d+/)?.[0] || '0', 10);
                return aNum - bNum;
            });

        if (sortedFiles.length !== filePlan.chunks.length) {
            throw new Error(`Nombre de chunks incohérent: attendu ${filePlan.chunks.length}, trouvé ${sortedFiles.length}`);
        }

        const encryptedAesKey = Buffer.from(filePlan.aesKey, 'hex');
        const aesKey = crypto.privateDecrypt({ key: privateKey, passphrase: passwd }, encryptedAesKey);

        const semaphore = new Semaphore(CONCURRENCY);
        const decryptedChunks: Buffer[] = Array(sortedFiles.length);

        await Promise.all(
            sortedFiles.map(async (file, index) => {
                await semaphore.acquire();
                try {
                    const inputFile = path.join(inputFolder, file);
                    const iv = Buffer.from(filePlan.chunks[index].iv, 'hex');
                    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
                    inputStream = fs.createReadStream(inputFile, { highWaterMark: CHUNK_SIZE });
                    const chunks: Buffer[] = [];

                    await new Promise<void>((resolve, reject) => {
                        inputStream!.on('data', (chunk: Buffer) => chunks.push(decipher.update(chunk)));
                        inputStream!.on('end', () => {
                            try { chunks.push(decipher.final()); decryptedChunks[index] = Buffer.concat(chunks); resolve(); }
                            catch (error) { reject(error); }
                        });
                        inputStream!.on('error', reject);
                    });
                } finally {
                    inputStream?.destroy();
                    inputStream = null;
                    semaphore.release();
                }
            })
        );

        outputStream = fs.createWriteStream(outputFile);
        const hash = crypto.createHash('sha256');

        for (const chunk of decryptedChunks) {
            hash.update(chunk);
            outputStream.write(chunk);
        }
        outputStream.end();

        const decryptedFileHash = hash.digest('hex');
        if (decryptedFileHash !== filePlan.originalFileHash) {
            await fs.promises.unlink(outputFile).catch(() => {});
            throw new Error('Erreur : L\'intégrité du fichier est compromise (hash invalide)');
        }

        console.log(`✅ Déchiffrement terminé avec succès : ${outputFile}`);

    } catch (error: unknown) {
        inputStream?.destroy();
        outputStream?.destroy();
        console.error('❌ Erreur lors du déchiffrement du fichier :', error);
        throw error;
    }
}
