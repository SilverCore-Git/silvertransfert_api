import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import config from '../../config/config';

export default async function (inputFolder: string, privateKey: string, passwd: string): Promise<boolean>
{  

    try {
        // Validate that privateKey is a non-empty string
        if (!privateKey || typeof privateKey !== 'string' || privateKey.trim() === '') {
            console.error('❌ Private key is empty or invalid');
            return false;
        }

        // Validation du chemin pour prévenir les attaques par injection
        const resolvedPath = path.resolve(inputFolder);
        const layoutPath = path.join(resolvedPath, 'witness_layout.json');
        
        // Vérifier que le chemin est dans le répertoire DATAdir attendu
        // Normaliser les chemins pour comparaison (enlever les slashes finaux)
        const normalizedDataDir = config.DATAdir.replace(/[\/]$/, '');
        const normalizedResolvedPath = resolvedPath.replace(/[\/]$/, '');
        
        if (!normalizedResolvedPath.startsWith(normalizedDataDir)) {
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
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
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