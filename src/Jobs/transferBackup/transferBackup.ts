import config from '../../config/config';
import fs from 'fs/promises';
import path from 'path';
import db from '../../assets/database/db';
import copyFile from './assets/copyFolder';

class transferBackup {
    private jobs_run: boolean;
    private BACKUP_DATA_DIR: string;

    constructor() {
        this.jobs_run = false;
        this.BACKUP_DATA_DIR = config.BACKUP_DATA_DIR || '';
    }

    public isRun(): boolean {
        return this.jobs_run;
    }

    public async run(): Promise<void> {
        if (!config.BACKUP) {
            console.log('[JOBS:transferBackup]: backup disabled in config.');
            return;
        }
        if (this.jobs_run) {
            console.error('[JOBS:transferBackup]: jobs already run.');
            return;
        }

        this.jobs_run = true;
        console.log('[JOBS:transferBackup]: starting backup process...');

        if (!this.BACKUP_DATA_DIR) {
            console.error('[JOBS:transferBackup]: config.BACKUP_DATA_DIR not defined.');
            this.jobs_run = false;
            return;
        }

        console.log(`[JOBS:transferBackup]: backup directory: ${this.BACKUP_DATA_DIR}`);

        const transfers = await db.getDB();
        console.log(`[JOBS:transferBackup]: found ${transfers.length} transfers to backup`);

        let successCount = 0;
        let failCount = 0;
        const MAX_CONCURRENT = 4;

        const tasks = [];
        for (let i = 0; i < transfers.length; i += MAX_CONCURRENT) {
            const chunk = transfers.slice(i, i + MAX_CONCURRENT);
            const chunkTasks = chunk.map(async (transfer) => {
                try {
                    const outDir: string = path.join(this.BACKUP_DATA_DIR, transfer.cryptedFileName);
                    const srcDir: string = path.join(config.DATAdir, transfer.cryptedFileName);

                    console.log(`[JOBS:transferBackup]: backing up transfer: ${transfer.cryptedFileName}`);
                    console.log(`[JOBS:transferBackup]: from ${srcDir} to ${outDir}`);

                    await copyFile(srcDir, outDir);

                    console.log(`[JOBS:transferBackup]: successfully backed up: ${transfer.cryptedFileName}`);
                    successCount++;
                } catch (err) {
                    console.error(`[JOBS:transferBackup]: failed to backup transfer ${transfer.cryptedFileName}:`, err);
                    failCount++;
                }
            });
            tasks.push(...chunkTasks);
        }

        await Promise.all(tasks);
        console.log(`[JOBS:transferBackup]: backup complete - Success: ${successCount}, Failed: ${failCount}`);
        this.jobs_run = false;
    }
}

export default new transferBackup();
