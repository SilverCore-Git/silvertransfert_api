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
    }
)
{

    try {

        const privateKey: string = await key.read(transferID, 'private') as string;

        await decryptFile({
            inputFolder: encryptedFilePath,
            outputFile: decryptedFilePath,
            privateKey,
            passwd
        });

        // Update status in DB
        const transfer = await db.get(transferID);
        if (transfer) {
            transfer.status = 'ready_to_download';
            await db.update(transfer);
        }

    }
    catch(err) {
        console.error('Error on decrypt file for id=', transferID, ' | : ', err);
    }

}