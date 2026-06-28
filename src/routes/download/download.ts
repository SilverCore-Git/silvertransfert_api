// packages
import { Router, Request, Response } from "express";
const router = Router();
import path from 'path';
import fs from 'fs';
import db from "../../assets/database/db";
import { Transfert } from "../../assets/database/dbTypes";
import decrypteFile from "./decrypteFile";
import VerifyPasswd from "../../assets/Crypter/VerifyPasswd";
import key from "../../assets/Crypter/key_manager";
import downloadFile from "./downloadFile";
import config from "../../config/config";

// Validation des paramètres
function validateDownloadParams(id: string, passwd: string): { valid: boolean; error?: string } {
    if (!id || typeof id !== 'string' || id.length < 8 || id.length > 64) {
        return { valid: false, error: 'ID invalide.' };
    }
    if (!passwd || typeof passwd !== 'string' || passwd.length < 8 || passwd.length > 128) {
        return { valid: false, error: 'Mot de passe invalide.' };
    }
    return { valid: true };
}

// Route POST pour download (correction de l'incohérence GET/req.body)
router.post('/download', async (req: Request, res: Response) => {
    const { id, passwd }: { id: string, passwd: string } = req.body;

    const validation = validateDownloadParams(id, passwd);
    if (!validation.valid) {
        return res.status(400).json({ error: true, message: validation.error });
    }

    const transfer = await db.get(id);
    if (!transfer) return res.status(404).json({ error: true, message: 'Transfer not found' });

    const encryptedFilePath = path.join(config.DATAdir, transfer.cryptedFileName);
    const decryptedFilePath = path.join(config.TEMPdir, transfer.tempFileName);
    const privateKey: string = await key.read(id, 'private') as string;

    const verifyPasswd: boolean = await VerifyPasswd(
        encryptedFilePath,
        privateKey,
        passwd
    );

    if (!verifyPasswd) {
        return res.status(400).json({ message: 'Invalid password' });
    }

    try {
        await fs.promises.access(decryptedFilePath);   // verify exist file
    } catch (e) {
        return res.status(404).json({ error: true, message: 'File not found' });
    }
    
    return await downloadFile({
        decryptedFilePath,
        originalFileName: transfer.originalFileName,
        res
    });
});

// Route POST pour decrypt (correction de l'incohérence GET/req.body)
router.post('/decrypt', async (req: Request, res: Response) => {
    const { id, passwd }: { id: string, passwd: string } = req.body;

    const validation = validateDownloadParams(id, passwd);
    if (!validation.valid) {
        return res.status(400).json({ error: true, message: validation.error });
    }

    const transfer = await db.get(id);
    if (!transfer) return res.status(404).json({ error: true, message: 'transfer not found' });

    if (transfer.status === 'ready_to_download') {
        return res.json({ ready_to_download: true });
    }

    const encryptedFilePath = path.join(config.DATAdir, transfer.cryptedFileName);
    const decryptedFilePath = path.join(config.TEMPdir, transfer.tempFileName);
    const privateKey: string = await key.read(id, 'private') as string;

    const verifyPasswd: boolean = await VerifyPasswd(
        encryptedFilePath,
        privateKey,
        passwd
    );

    if (!verifyPasswd) {
        return res.status(400).json({ message: 'Invalid password' });
    }

    res.json({ status: 'processing' });

    await decrypteFile({
        transferID: id,
        req,
        encryptedFilePath,
        decryptedFilePath,
        passwd
    });
});

// Route GET pour status (utilisation de req.query au lieu de req.body)
router.get('/status', async (req: Request, res: Response) => {
    const id: string = typeof req.query.id === 'string' ? req.query.id : '';

    if (!id || id.length < 8 || id.length > 64) {
        return res.status(400).json({ error: true, message: 'ID invalide.' });
    }

    const transfer: Transfert | undefined = await db.get(id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found', canBeDownload: false });
    
    res.json({
        id: transfer.UUID,
        canBeDownload: transfer.status === 'ready_to_download',
        canBeEncrypt: transfer.status === 'ready_to_decrypt',
        isZip: transfer.originalFileName?.endsWith('.zip') && transfer.originalFileName?.startsWith('SilverTransfer_')
    });
});


export default router;
