import type { Request } from "express";
import decryptFile from "../../assets/Crypter/DecryptFile";
import key from "../../assets/Crypter/key_manager";
import db from "../../assets/database/db";

export default async function
(
    {
        transferID,
        req,
        encryptedFilePath,
        decryptedFilePath,
        passwd
    }:
    {
        transferID: string,
        req: Request,
        encryptedFilePath: string,
        decryptedFilePath: string,
        passwd: string
    })
{

    try {

        const privateKey = await key.read(transferID, 'private');
        
        // ⭐ FIX: Validate that privateKey exists
        if (!privateKey) {
            throw new Error(`Private key not found or could not be read for transfer ${transferID}`);
        }

        await decryptFile({
            inputFolder: encryptedFilePath,
            outputFile: decryptedFilePath,
            privateKey: privateKey as string,
            passwd
        });

        // Update status in DB
        const transfer = await db.get(transferID);
        if (transfer) {
            transfer.status = 'ready_to_download';
            await db.update(transfer);
        }

    }
    catch(err: unknown) {
        console.error('❌ Error on decrypt file for id=', transferID, ' | : ', err);
        
        // Update transfer status to failed
        try {
            const transfer = await db.get(transferID);
            if (transfer) {
                transfer.status = 'await_crypting';
                await db.update(transfer);
            }
        } catch (dbErr: unknown) {
            console.error('❌ Failed to update transfer status after decryption error:', dbErr);
        }
    }

}
