import { getCurrentDate, getCurrentTime } from './utils/getDate';
import path from 'path';
import fs from 'fs';

import config from '../config/config';
const LOGDir = config.LOGDir;

const a = async () => {
    if (!fs.existsSync(LOGDir)) await fs.promises.mkdir(LOGDir, { recursive: true });
}
a();

const logToFile = (message: string) => {
    const date = getCurrentDate();
    const time = getCurrentTime();
    const logFilePath = path.join(config.LOGDir, `${date}.log`);

    const logMessage = `[${date} - ${time}] > ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage, "utf8");
};


// Redirection des logs
const originalConsoleLog = console.log;
console.log = (...args) => {
    originalConsoleLog(...args);
    logToFile(args.join(" "));
};

const originalConsoleError = console.error;
console.error = (...args) => {
    originalConsoleError(...args);
    logToFile(args.join(" "));
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
    originalConsoleWarn(...args);
    logToFile(args.join(" "));
};


export {
    logToFile,
    originalConsoleError, 
    originalConsoleLog,
    originalConsoleWarn
}