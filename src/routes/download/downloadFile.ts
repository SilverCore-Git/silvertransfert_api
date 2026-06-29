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

        stream.on('error', (err: Error) => {
            console.error('❌ Error on file stream :', err.message);
            if (!res.headersSent) {
                res.status(500).json({
                    error: true,
                    message: 'Internal server error'
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
            } catch (err: unknown) {
                console.warn("❌ Erreur lors de la suppression/réinitialisation :", (err as Error).message);
            }
        });

    } catch (err: unknown) {
        console.error("An error occured :", err);
        if (!res.headersSent) {
            return res.status(500).json({
                error: true,
                message: 'Internal server error'
            });
        }
    }

}