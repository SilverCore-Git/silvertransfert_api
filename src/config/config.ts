import 'dotenv/config';
import path from 'path';

// Helper function to resolve paths - supports both absolute and relative paths
function resolvePath(envVar: string | undefined, defaultPath: string): string {
    const value = envVar || defaultPath;
    // If path starts with /, it's absolute - return as is
    if (value.startsWith('/')) {
        return value;
    }
    // Otherwise, resolve relative to process.cwd()
    return path.join(process.cwd(), value);
}

const config = {
    // Server Configuration
    hostname: process.env.HOSTNAME || 'localhost',
    Port: parseInt(process.env.PORT || '8080', 10),
    
    // Directories - all resolved to absolute paths
    DATAdir: resolvePath(process.env.DATA_DIR, 'data'),
    TEMPdir: resolvePath(process.env.TEMP_DIR, 'temp'),
    LOGDir: resolvePath(process.env.LOG_DIR, 'log'),
    DBFile: resolvePath(process.env.DB_FILE, 'db/database.json'),
    BACKUP_DATA_DIR: resolvePath(process.env.BACKUP_DATA_DIR, 'mirror'),
    
    // Backup Settings
    BACKUP: process.env.BACKUP === 'true',
    
    // Encryption Settings
    maxbyteforkey: parseInt(process.env.MAX_BYTE_FOR_KEY || '256', 10),
    
    // Transfer Settings
    expiretime: parseInt(process.env.EXPIRE_TIME || '30', 10)
};

export default config;