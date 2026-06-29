import crypto from 'crypto';
import { Layout } from './CrypterTypes';
import fs from 'fs';
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
    if (this.count > 0) {
      this.count--;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.count--;
  }

  release(): void {
    this.count++;
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve();
    }
  }
}

export default async function({
    inputFile,
    outputFolder = 'data/undefined', 
    publicKey, 
    dev_env = false
}: {
    inputFile: string, 
    outputFolder: string, 
    publicKey: string, 
    dev_env?: boolean
}) {
    let hashStream: fs.ReadStream | null = null;
    let inputStream: fs.ReadStream | null = null;
    let output: fs.WriteStream | null = null;

    try {
        const fileStats = await fs.promises.stat(inputFile);
        const totalSize = fileStats.size;

        await fs.promises.mkdir(outputFolder, { recursive: true });

        const aesKey = crypto.randomBytes(32);
        const encryptedAesKey = crypto.publicEncrypt(
            { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
            aesKey
        );

        const hash = crypto.createHash('sha256');
        hashStream = fs.createReadStream(inputFile, { highWaterMark: CHUNK_SIZE });

        await new Promise<void>((resolve, reject) => {
            hashStream!.on('data', (chunk: Buffer) => hash.update(chunk));
            hashStream!.on('end', resolve);
            hashStream!.on('error', (err) => { hashStream!.destroy(); reject(err); });
        });
        hashStream = null;

        const originalFileHash = hash.digest('hex');
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

        const witnessData = {
            fileName: inputFile,
            fileSize: totalSize,
            fileHash: originalFileHash,
            encryptionKeyLength: aesKey.length,
            chunks: totalChunks,
            justadddata: "fds123ERZ!?#{[|`"
        };
        await fs.promises.writeFile(path.join(outputFolder, 'witness.txt'), JSON.stringify(witnessData, null, 2), 'utf8');
        await fs.promises.writeFile(
            path.join(outputFolder, 'witness_layout.json'),
            JSON.stringify({ fileName: 'witness.txt', aesKey: encryptedAesKey.toString('hex') }, null, 2)
        );

        const filePlan: Layout = {
            chunks: Array.from({ length: totalChunks }, (_, i) => ({
                index: i,
                start: i * CHUNK_SIZE,
                iv: ''
            })),
            originalFileHash,
            aesKey: encryptedAesKey.toString('hex')
        };

        const semaphore = new Semaphore(CONCURRENCY);

        await Promise.all(
            Array.from({ length: totalChunks }, (_, chunkIndex) => (
                (async () => {
                    await semaphore.acquire();
                    try {
                        const startPosition = chunkIndex * CHUNK_SIZE;
                        output = fs.createWriteStream(path.join(outputFolder, `part${chunkIndex}.enc`));
                        const iv = crypto.randomBytes(16);
                        filePlan.chunks[chunkIndex].iv = iv.toString('hex');
                        const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
                        const endPosition = Math.min(startPosition + CHUNK_SIZE - 1, totalSize - 1);
                        inputStream = fs.createReadStream(inputFile, { start: startPosition, end: endPosition, highWaterMark: CHUNK_SIZE });

                        await new Promise<void>((resolve, reject) => {
                            inputStream!.on('data', (chunk: Buffer) => output!.write(cipher.update(chunk)));
                            inputStream!.on('end', () => { output!.write(cipher.final()); output!.end(); resolve(); });
                            inputStream!.on('error', reject);
                            output!.on('error', reject);
                        });
                    } finally {
                        inputStream?.destroy();
                        output?.destroy();
                        inputStream = null;
                        output = null;
                        semaphore.release();
                    }
                })()
            ))
        );

        await fs.promises.writeFile(path.join(outputFolder, 'layout.json'), JSON.stringify(filePlan, null, 2));
        if (!dev_env) await fs.promises.unlink(inputFile);
        console.log('✅ Chiffrement terminé avec succès !');

    } catch (error: unknown) {
        hashStream?.destroy();
        inputStream?.destroy();
        output?.destroy();
        console.error('❌ Erreur lors du chiffrement :', error);
        throw error;
    }
}
