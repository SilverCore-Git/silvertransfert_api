import archiver = require('archiver');
import fs from 'fs';

console.log('Type of archiver:', typeof archiver);
console.log('Keys of archiver:', Object.keys(archiver));
console.log('Is archiver a function?', typeof archiver === 'function');
if (typeof archiver === 'object') {
    console.log('archiver.default type:', typeof (archiver as any).default);
    console.log('archiver.create type:', typeof (archiver as any).create);
}

try {
    const archive = (archiver as any)('zip');
    console.log('Success calling archiver("zip")');
} catch (e: any) {
    console.log('Failed calling archiver("zip"):', e.message);
}

try {
    const archive = (archiver as any).default('zip');
    console.log('Success calling archiver.default("zip")');
} catch (e: any) {
    console.log('Failed calling archiver.default("zip"):', e.message);
}
