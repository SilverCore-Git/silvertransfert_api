// packages
import { Router, Request, Response } from "express";
const router = Router();
import multer from "multer";
import path from 'path';
import text_crypter from "../../assets/Crypter/Text_crypter";
import db from "../../assets/database/db";
import key from "../../assets/Crypter/key_manager";
import getClientIp from "../../assets/utils/getClientIp";
import { getCurrentDate, getCurrentTime } from "../../assets/utils/getDate";
import { Transfert } from "../../assets/database/dbTypes";
import afterUpload from "./afterUpload";
import config from '../../config/config';
import archiver from 'archiver';
import fs from 'fs';

const uploadDir = config.TEMPdir;

// Validation des paramètres de transfert
function validateTransferParams(id: string, passwd: string): { valid: boolean; error?: string } {
    // Validation de l'ID (alphanumérique, tirets, underscores, 8-64 caractères)
    const idRegex = /^[a-zA-Z0-9_-]{8,64}$/;
    if (!id || typeof id !== 'string') {
        return { valid: false, error: 'ID invalide. Doit être une chaîne de 8 à 64 caractères alphanumériques.' };
    }
    if (!idRegex.test(id)) {
        return { valid: false, error: 'ID contient des caractères non autorisés.' };
    }
    
    // Validation du mot de passe (8-128 caractères)
    if (!passwd || typeof passwd !== 'string') {
        return { valid: false, error: 'Mot de passe invalide. Doit être une chaîne de 8 à 128 caractères.' };
    }
    if (passwd.length < 8 || passwd.length > 128) {
        return { valid: false, error: 'Mot de passe doit faire entre 8 et 128 caractères.' };
    }
    
    return { valid: true };
}

// Configuration de Multer pour stocker les fichiers sur disque
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const encryptedText = text_crypter.encrypt(file.originalname);
        const fileExt = path.extname(file.originalname);
        const newFileName = `${encryptedText}${fileExt}`;
        cb(null, newFileName);
    }
});

// Filtre pour valider les types de fichiers
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (true) {
        cb(null, true);
    } else {
        cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 16 * 1024 * 1024 * 1024, // 16 Go
        files: 20 // Autoriser jusqu'à 20 fichiers
    }
});

// Middleware de gestion d'erreur pour multer
const handleMulterError = (err: any, _req: Request, res: Response, next: () => void) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: true, message: 'Fichier trop volumineux. Taille maximale: 16 Go.' });
        }
        return res.status(400).json({ error: true, message: `Erreur upload: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ error: true, message: err.message });
    }
    next();
};

router.post('/file', upload.array("file", 20), handleMulterError, async (req: Request, res: Response) => {

    // Récupération et validation des paramètres
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    let passwd = typeof req.query.passwd === 'string' ? req.query.passwd : '';
    
    const validation = validateTransferParams(id, passwd);
    if (!validation.valid) {
        return res.status(400).json({ error: true, message: validation.error });
    }
    
    const ip: string = getClientIp(req);
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        return res.status(400).json({ message: "Aucun fichier reçu" });
    }

    console.log('New transfer : ', id, 'with', files.length, 'files');

    let finalTempPath = '';
    let originalName = '';
    let totalSize = 0;

    if (files.length > 1) {
        // ZIP multiple files
        originalName = `SilverTransfer_${id}.zip`;
        const zipPath = path.join(uploadDir, `${id}_archive.zip`);
        const output = fs.createWriteStream(zipPath);
        
        // Final robust check for Bun/CJS/ESM interop
        let archive;
        if (typeof archiver === 'function') {
            archive = archiver('zip', { zlib: { level: 9 } });
        } else if ((archiver as any).create) {
            archive = (archiver as any).create('zip', { zlib: { level: 9 } });
        } else if ((archiver as any).default) {
            archive = (archiver as any).default('zip', { zlib: { level: 9 } });
        } else {
            throw new Error('Archiver module not found or incompatible');
        }

        const zipPromise = new Promise<void>((resolve, reject) => {
            output.on('close', () => resolve());
            archive.on('error', (err) => reject(err));
        });

        archive.pipe(output);
        for (const file of files) {
            archive.file(file.path, { name: file.originalname });
        }
        await archive.finalize();
        await zipPromise;

        // Delete individual temp files
        for (const file of files) {
            try { await fs.promises.unlink(file.path); } catch {}
        }

        finalTempPath = zipPath;
        const stats = await fs.promises.stat(zipPath);
        totalSize = stats.size;
    } else {
        // Single file
        finalTempPath = files[0].path;
        originalName = files[0].originalname;
        totalSize = files[0].size;
    }

    await key.generate(id, passwd);
    const encryptedFileName: string = `${id}.${path.basename(finalTempPath)}.enc`;
    const encryptedFilePath: string = path.join(config.DATAdir, encryptedFileName);
    const downloadPath: string = `https://t.silvertransfert.fr/${id}-${passwd}`;

    // Supprimer le mot de passe de la mémoire
    passwd = '';

    const transfer: Transfert = {
        UUID: id,
        cryptedFileName: encryptedFileName,
        tempFileName: path.basename(finalTempPath),
        originalFileName: text_crypter.encrypt(originalName),
        size: totalSize,
        senderIp: ip,
        date: `${getCurrentDate()} - ${getCurrentTime()}`,
        status: 'await_crypting'
    }

    await db.push(transfer);

    res.json({
        status: transfer.status,
        message: "Fichiers reçus et préparés !",
        id,
        downloadPath
    });

    await afterUpload({
        transferID: id,
        encryptedFilePath,
        tempFilePath: finalTempPath
    });

});


export default router;
