import { promises as fs } from "fs";
import path from "path";

const MAX_CONCURRENT = 4;

async function processEntry(srcPath: string, destPath: string): Promise<void> {
    const stats = await fs.stat(srcPath);
    if (stats.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        const entries = await fs.readdir(srcPath, { withFileTypes: true });
        const tasks = [];

        for (let i = 0; i < entries.length; i += MAX_CONCURRENT) {
            const chunk = entries.slice(i, i + MAX_CONCURRENT);
            const chunkTasks = chunk.map(async (entry) => {
                const newSrcPath = path.join(srcPath, entry.name);
                const newDestPath = path.join(destPath, entry.name);
                await processEntry(newSrcPath, newDestPath);
            });
            tasks.push(...chunkTasks);
        }

        await Promise.all(tasks);
    } else {
        await fs.copyFile(srcPath, destPath);
    }
}

export default async function copyFolder(src: string, dest: string): Promise<void> {
    await processEntry(src, dest);
}
