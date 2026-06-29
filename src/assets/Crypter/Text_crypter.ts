import crypto from 'crypto';


class text_crypter
{

    private algo: string;
    private cryptKey: Buffer;
    private ivLength: number;

    constructor()
    {
        this.algo = 'aes-256-cbc';
        this.ivLength = 16;

        const envKey = process.env.TEXT_SECRET_KEY;
        if (!envKey) {
            throw new Error('CRITICAL: TEXT_SECRET_KEY environment variable is not defined. Never use ephemeral keys for persistent data.');
        }

        if (envKey.length < 32) {
            throw new Error('CRITICAL: TEXT_SECRET_KEY must be at least 32 bytes long.');
        }

        const uniqueChars = new Set(envKey).size;
        if (uniqueChars < 10) {
            throw new Error('CRITICAL: TEXT_SECRET_KEY has insufficient entropy. Must contain at least 10 unique characters.');
        }

        const salt = Buffer.from('silvertransfer-key-derivation-salt', 'utf8');
        this.cryptKey = crypto.scryptSync(envKey, salt, 32) as Buffer;
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
