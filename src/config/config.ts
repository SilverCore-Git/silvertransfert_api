import 'dotenv/config';

const config = {
    // Server Configuration
    hostname: process.env.HOSTNAME || 'localhost',
    Port: parseInt(process.env.PORT || '8080', 10),
    
    // Directories
    DATAdir: process.env.DATA_DIR || 'data',
    TEMPdir: process.env.TEMP_DIR || 'temp',
    LOGDir: process.env.LOG_DIR || 'log',
    DBFile: process.env.DB_FILE || 'db/database.json',
    BACKUP_DATA_DIR: process.env.BACKUP_DATA_DIR || 'mirror',
    
    // Backup Settings
    BACKUP: process.env.BACKUP === 'true',
    
    // Encryption Settings
    maxbyteforkey: parseInt(process.env.MAX_BYTE_FOR_KEY || '256', 10),
    
    // Transfer Settings
    expiretime: parseInt(process.env.EXPIRE_TIME || '30', 10)
};

export default config;