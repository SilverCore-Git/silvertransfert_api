import crypto from 'crypto';


class text_crypter
{

    private algo: string;
    private cryptKey: Buffer;
    private ivLength: number;

    constructor()
    {
        this.algo = 'aes-256-cbc'; // Mode CBC plus sécurisé que ECB
        this.ivLength = 16; // IV de 16 octets pour AES
        
        // Générer une clé de 32 octets (256 bits) pour AES-256
        const envKey = process.env.TEXT_SECRET_KEY;
        if (envKey && envKey.length >= 32) {
            // Utiliser les 32 premiers octets de la clé environnement
            this.cryptKey = Buffer.from(envKey.substring(0, 32), 'utf8');
        } else {
            // Générer une clé aléatoire si aucune clé valide n'est fournie
            // NOTE: En production, cela devrait être défini dans .env
            console.warn('⚠️ TEXT_SECRET_KEY non définie ou trop courte. Génération d\'une clé temporaire.');
            this.cryptKey = crypto.randomBytes(32);
        }
    }

    public encrypt(text: string): string
    {
        // Générer un IV aléatoire pour chaque chiffrement
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algo, this.cryptKey, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Retourner IV + texte chiffré (l'IV est nécessaire pour le déchiffrement)
        return iv.toString('hex') + encrypted;
    }

    public decrypt(encryptedText: string): string
    {
        // Extraire l'IV des 32 premiers caractères hex (16 octets)
        const iv = Buffer.from(encryptedText.substring(0, 32), 'hex');
        const encrypted = encryptedText.substring(32);
        
        const decipher = crypto.createDecipheriv(this.algo, this.cryptKey, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    
    // Méthode pour vérifier si la clé est correctement configurée
    public isKeySecure(): boolean {
        return this.cryptKey.length === 32;
    }

}



export default new text_crypter();
