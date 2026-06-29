import fs from "fs";
const fsp = fs.promises;

import config from '../../config/config';
import type { Transfert } from "./dbTypes";

const DB_FILE = config.DBFile;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Simple async mutex for write operations
class AsyncMutex {
    private queue: Array<() => void> = [];
    private locked = false;

    async acquire(): Promise<() => Promise<void>> {
        return new Promise(resolve => {
            const release = () => {
                if (this.queue.length > 0) {
                    this.locked = true;
                    const next = this.queue.shift()!;
                    next();
                } else {
                    this.locked = false;
                }
            };
            this.queue.push(release);
            if (!this.locked) {
                this.locked = true;
                this.queue.shift()!();
            }
            resolve(release);
        });
    }
}

class db
{
    private dbCache: Transfert[] = [];
    private index: Map<string, Transfert> = new Map();
    private getDBCache: { data: Transfert[]; timestamp: number } | null = null;
    private writeMutex = new AsyncMutex();
    private initialized = false;

    private async initialize(): Promise<void> {
        if (this.initialized) return;

        const unlock = await this.writeMutex.acquire();
        try {
            if (this.initialized) return;

            if (!(await fsp.access(DB_FILE).catch(() => false))) {
                this.dbCache = [];
            } else {
                this.dbCache = JSON.parse(await fsp.readFile(DB_FILE, 'utf-8'));
            }
            this.rebuildIndex();
            this.initialized = true;
        } finally {
            await unlock();
        }
    }

    private rebuildIndex(): void {
        this.index.clear();
        for (const transfert of this.dbCache) {
            this.index.set(transfert.UUID, transfert);
        }
    }

    private invalidateCache(): void {
        this.getDBCache = null;
    }

    private async persist(): Promise<void> {
        await fsp.writeFile(DB_FILE, JSON.stringify(this.dbCache), 'utf-8');
    }

    public async getDB(): Promise<Transfert[]> {
        if (!this.initialized) await this.initialize();

        const now = Date.now();
        if (this.getDBCache && (now - this.getDBCache.timestamp) < CACHE_TTL_MS) {
            return this.getDBCache.data;
        }

        this.getDBCache = {
            data: [...this.dbCache],
            timestamp: now
        };
        return this.getDBCache.data;
    }

    public async push(tr: Transfert): Promise<void> {
        if (!this.initialized) await this.initialize();

        const unlock = await this.writeMutex.acquire();
        try {
            this.dbCache.push(tr);
            this.index.set(tr.UUID, tr);
            this.invalidateCache();
            await this.persist();
        } finally {
            await unlock();
        }
    }

    public async get(uuid: string): Promise<Transfert | undefined> {
        if (!this.initialized) await this.initialize();
        return this.index.get(uuid);
    }

    public async update(transfer: Transfert): Promise<void> {
        if (!this.initialized) await this.initialize();

        const unlock = await this.writeMutex.acquire();
        try {
            const existingIndex = this.dbCache.findIndex(t => t.UUID === transfer.UUID);
            if (existingIndex >= 0) {
                this.dbCache[existingIndex] = transfer;
                this.index.set(transfer.UUID, transfer);
                this.invalidateCache();
                await this.persist();
            }
        } finally {
            await unlock();
        }
    }

    public async delete(uuid: string): Promise<void> {
        if (!this.initialized) await this.initialize();

        const unlock = await this.writeMutex.acquire();
        try {
            const existingIndex = this.dbCache.findIndex(t => t.UUID === uuid);
            if (existingIndex >= 0) {
                this.dbCache.splice(existingIndex, 1);
                this.index.delete(uuid);
                this.invalidateCache();
                await this.persist();
            }
        } finally {
            await unlock();
        }
    }

    public async resetDB(): Promise<void> {
        const unlock = await this.writeMutex.acquire();
        try {
            this.dbCache = [];
            this.index.clear();
            this.invalidateCache();
            await this.persist();
        } finally {
            await unlock();
        }
    }
}

export default new db();
