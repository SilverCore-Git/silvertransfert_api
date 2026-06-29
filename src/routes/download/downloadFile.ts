import type { Response } from "express";
import mime from "mime-types";
import fs from 'fs';
import path from 'path';
import db from "../../assets/database/db";

export default async function
(
    {
        res,
        decryptedFilePath,
        originalFileName,
        transferID
    }:
    {
        res: Response,
        decryptedFilePath: string,
        originalFileName?: string,
        transferID?: string
    }
)
{

    const filename = originalFileName || path.basename(decryptedFilePath);
    const stat = await fs.promises.stat(decryptedFilePath);

    const mimeType = mime.lookup(filename) || 'application/octet-stream';

    // res headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
        

    try {
        const stream = fs.createReadStream(decryptedFilePath);

        stream.pipe(res);

        stream.on('error', (err: any) => {
            console.error('❌ Error on file stream :', err);
            if (!res.headersSent) {
                res.status(500).json({
                    error: true,
                    message: { silver: 'Error on send a file' }
                });
            }
        });

        res.on('close', async () => {
            if (!res.writableEnded) {
                console.warn("⚠️ Download interrupted (client closed connection)");
                stream.destroy();
            }

            try {
                await fs.promises.unlink(decryptedFilePath);
                console.log("🗑️ Temp file deleted !");

                // ✅ Réinitialise le statut après téléchargement
                if (transferID) {
                    const transfer = await db.get(transferID);
                    if (transfer) {
                        transfer.status = 'await_crypting';
                        await db.update(transfer);
                        console.log(`🔄 Statut réinitialisé pour ${transferID}`);
                    }
                }
            } catch (err: any) {
                console.warn("❌ Erreur lors de la suppression/réinitialisation :", err.message);
            }
        });

    } catch (err: any) {
        console.error("An error occured : ", err);
        if (!res.headersSent) {
            return res.status(500).json({
                error: true,
                message: { silver: 'An error occured.', server: err.message }
            });
        }
    }

}