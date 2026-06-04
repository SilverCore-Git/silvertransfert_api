import crypto from 'crypto';
import fs from 'fs';

export default async function (inputFolder: string, privateKey: string, passwd: string): Promise<boolean>
{  

    try {
        // Validation du chemin pour prévenir les attaques par injection
        const path = require('path');
        const resolvedPath = path.resolve(inputFolder);
        const layoutPath = path.join(resolvedPath, 'witness_layout.json');
        
        // Vérifier que le chemin est dans un répertoire attendu
        if (!resolvedPath.includes('/data/') && !resolvedPath.includes('\\data\\')) {
            console.error('❌ Chemin invalide pour witness_layout.json:', inputFolder);
            return false;
        }

        // Lire le fichier de layout pour obtenir la clé AES chiffrée de manière sécurisée
        const layoutContent = await fs.promises.readFile(layoutPath, 'utf8');
        const layout = JSON.parse(layoutContent);
        
        if (!layout.aesKey || typeof layout.aesKey !== 'string') {
            console.error('❌ aesKey invalide dans le layout');
            return false;
        }
        
        const encryptedAesKey = Buffer.from(layout.aesKey, 'hex');

        // 🔥 Essayer de décrypter la clé AES avec la clé privée et le mot de passe
        crypto.privateDecrypt(
            {
                key: privateKey,
                passphrase: passwd,
            },
            encryptedAesKey
        );

        // Si le décryptage est réussi, cela signifie que le mot de passe est valide
        return true;

    } catch (err) {
        // Si erreur → mot de passe invalide
        return false;
    };

}