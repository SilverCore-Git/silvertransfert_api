import key from "../../assets/Crypter/key_manager";
import encryptFile from "../../assets/Crypter/EncryptFile";
import db from "../../assets/database/db";
import { Transfert } from "../../assets/database/dbTypes";

export default async function
(
    { 
        transferID, 
        tempFilePath, 
        encryptedFilePath
    }: 
    { 
        transferID: string, 
        tempFilePath: string, 
        encryptedFilePath: string
    })
{

    try {

        // get public key
        const public_key = await key.read(transferID, 'public');
        if (!public_key) {
            throw new Error(`Public key not found for transfer ${transferID}`);
        }

        // encrypte temp file
        await encryptFile({
            inputFile: tempFilePath,
            outputFolder: encryptedFilePath,
            publicKey: public_key as string
        });

        // update status to ready to download
        const transfer = await db.get(transferID);
        if (!transfer) {
            console.error(`❌ Transfer ${transferID} not found in DB after encryption`);
            return;
        }

        transfer.status = 'ready_to_decrypt';
        await db.update(transfer);

    }
    catch(err: unknown) {
        console.error('❌ Error on afterUpload for id=', transferID, ' | : ', err);
        
        // Update transfer status to failed
        try {
            const transfer = await db.get(transferID);
            if (transfer) {
                transfer.status = 'expired';
                await db.update(transfer);
            }
        } catch (dbErr: unknown) {
            console.error('❌ Failed to update transfer status after encryption error:', dbErr);
        }
    }

}
