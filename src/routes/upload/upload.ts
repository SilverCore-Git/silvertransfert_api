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

const uploadDir = path.join(__dirname, '../', config.TEMPdir);

// Whitelist des types MIME autorisés
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'audio/mpeg',
    'audio/mp3',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/json',
    'application/x-rar-compressed',
    'application/octet-stream'
];

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
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 4 * 1024 * 1024 * 1024, // 4 Go (réduit de 16 Go)
        files: 1 // Un seul fichier par requête
    }
});

// Middleware de gestion d'erreur pour multer
const handleMulterError = (err: any, _req: Request, res: Response, next: () => void) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: true, message: 'Fichier trop volumineux. Taille maximale: 4 Go.' });
        }
        return res.status(400).json({ error: true, message: `Erreur upload: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ error: true, message: err.message });
    }
    next();
};

router.post('/file', upload.single("file"), handleMulterError, async (req: Request, res: Response) => {

    // Récupération et validation des paramètres
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    let passwd = typeof req.query.passwd === 'string' ? req.query.passwd : '';
    
    const validation = validateTransferParams(id, passwd);
    if (!validation.valid) {
        return res.status(400).json({ error: true, message: validation.error });
    }
    
    const ip: string = getClientIp(req);

    if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier reçu" });
    }

    console.log('New transfer : ', id);

    await key.generate(id, passwd);
    const tempFilePath: string = req.file.path;
    const encryptedFileName: string = `${id}.${req.file.filename}.enc`;
    const encryptedFilePath: string = path.join(__dirname, `../${config.DATAdir}`, encryptedFileName);
    const downloadPath: string = `https://t.silvertransfert.fr/${id}-${passwd}`;

    // Supprimer le mot de passe de la mémoire
    passwd = '';

    const transfer: Transfert = {
        UUID: id,
        cryptedFileName: encryptedFileName,
        tempFileName: path.basename(tempFilePath),
        size: req.file.size as number,
        senderIp: ip,
        date: `${getCurrentDate()} - ${getCurrentTime()}`,
        status: 'await_crypting'
    }

    await db.push(transfer);

    res.json({
        status: transfer.status,
        message: "Fichier reçu !",
        id,
        downloadPath
    });

    await afterUpload({
        transferID: id,
        encryptedFilePath,
        tempFilePath
    });

});


export default router;
