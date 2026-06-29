import { getCurrentDate, getCurrentTime } from './utils/getDate';
import path from 'path';
import fs from 'fs/promises';
import config from '../config/config';

const LOGDir = config.LOGDir;
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;
const WRITE_BATCH_INTERVAL = 100; // ms
const WRITE_BATCH_SIZE = 100;

interface LogEntry {
    message: string;
    timestamp: string;
}

let logQueue: LogEntry[] = [];
let isWriting = false;
let writeTimeout: NodeJS.Timeout | null = null;

const ensureLogDir = async (): Promise<void> => {
    try {
        await fs.access(LOGDir);
    } catch {
        await fs.mkdir(LOGDir, { recursive: true });
    }
};

const rotateLogs = async (logFilePath: string): Promise<void> => {
    try {
        const stats = await fs.stat(logFilePath);
        if (stats.size >= MAX_LOG_SIZE) {
            for (let i = MAX_LOG_FILES - 1; i >= 0; i--) {
                const oldPath = i === 0 ? logFilePath : `${logFilePath}.${i}`;
                const newPath = `${logFilePath}.${i + 1}`;
                try {
                    await fs.rename(oldPath, newPath);
                } catch {}
            }
        }
    } catch {}
};

const writeBatch = async (): Promise<void> => {
    if (isWriting) return;
    isWriting = true;

    const batch = [...logQueue];
    logQueue = [];

    if (writeTimeout) {
        clearTimeout(writeTimeout);
        writeTimeout = null;
    }

    if (batch.length === 0) {
        isWriting = false;
        return;
    }

    const date = getCurrentDate();
    const logFilePath = path.join(LOGDir, `${date}.log`);

    await ensureLogDir();
    await rotateLogs(logFilePath);

    const content = batch.map(entry => `[${entry.timestamp}] > ${entry.message}\n`).join('');
    try {
        await fs.appendFile(logFilePath, content, 'utf8');
    } catch (err) {
        console.error('[Logger]: Failed to write logs:', err);
    } finally {
        isWriting = false;
    }
};

const scheduleWrite = (): void => {
    if (writeTimeout) return;
    writeTimeout = setTimeout(writeBatch, WRITE_BATCH_INTERVAL);
    if (logQueue.length >= WRITE_BATCH_SIZE) {
        writeTimeout.refresh();
    }
};

export const log = (message: string, level: 'log' | 'error' | 'warn' = 'log'): void => {
    const date = getCurrentDate();
    const time = getCurrentTime();
    const timestamp = `${date} - ${time}`;

    logQueue.push({ message, timestamp });
    scheduleWrite();

    if (level === 'error') console.error(`[${timestamp}] > ${message}`);
    else if (level === 'warn') console.warn(`[${timestamp}] > ${message}`);
    else console.log(`[${timestamp}] > ${message}`);
};

export const error = (message: string): void => log(message, 'error');
export const warn = (message: string): void => log(message, 'warn');
export const info = (message: string): void => log(message, 'log');

// Graceful shutdown
process.on('beforeExit', async () => {
    if (logQueue.length > 0) {
        await writeBatch();
    }
});
