import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

function validateId(id: string): void {
    if (!ID_REGEX.test(id)) {
        throw new Error(`Invalid ID format: ${id}`);
    }
}

class Key {

    async generate(id: string, passwd: string, opt: 'all' | 'public' | 'private' = 'all') 
    {
        validateId(id);
        const dirPath = path.join('key', 'live', id);
        try {
            await fs.promises.mkdir(dirPath, { recursive: true });

            if (opt === 'all') {
                const { publicKey, privateKey }: { publicKey: string, privateKey: string } = await new Promise(
                    (resolve, reject) => {
                    crypto.generateKeyPair('rsa', {
                        modulusLength: 4096,
                        publicKeyEncoding: {
                            type: 'pkcs1',
                            format: 'pem',
                        },
                        privateKeyEncoding: {
                            type: 'pkcs8',
                            format: 'pem',
                            cipher: 'aes-256-cbc',
                            passphrase: passwd,
                        },
                    }, (err, publicKey, privateKey) => {
                        if (err) return reject(err);
                        resolve({ publicKey, privateKey });
                    });
                });

                await fs.promises.writeFile(path.join(dirPath, 'public_key.pem'), publicKey, 'utf8');
                await fs.promises.writeFile(path.join(dirPath, 'private_key.pem'), privateKey, 'utf8');
            } else if (opt === 'public') {
                const { publicKey }: { publicKey: string } = await new Promise(
                    (resolve, reject) => {
                    crypto.generateKeyPair('rsa', {
                        modulusLength: 4096,
                        publicKeyEncoding: {
                            type: 'pkcs1',
                            format: 'pem',
                        },
                        privateKeyEncoding: {
                            type: 'pkcs8',
                            format: 'pem',
                        },
                    }, (err, publicKey) => {
                        if (err) return reject(err);
                        resolve({ publicKey });
                    });
                });
                await fs.promises.writeFile(path.join(dirPath, 'public_key.pem'), publicKey, 'utf8');
            } else if (opt === 'private') {
                const { privateKey }: { privateKey: string } = await new Promise(
                    (resolve, reject) => {
                    crypto.generateKeyPair('rsa', {
                        modulusLength: 4096,
                        publicKeyEncoding: {
                            type: 'pkcs1',
                            format: 'pem',
                        },
                        privateKeyEncoding: {
                            type: 'pkcs8',
                            format: 'pem',
                            cipher: 'aes-256-cbc',
                            passphrase: passwd,
                        },
                    }, (err, _publicKey, privateKey) => {
                        if (err) return reject(err);
                        resolve({ privateKey });
                    });
                });
                await fs.promises.writeFile(path.join(dirPath, 'private_key.pem'), privateKey, 'utf8');
            }

            console.log(`✅ ${opt} clé générée pour l'id = ${id}`);
        } catch (err: unknown) {
            console.error(`❌ Erreur lors de la génération de la clé (${opt}) pour l'id = ${id} :\n${err}`);
        }
    }

    async remove(id: string, opt: 'all' | 'public' | 'private' = 'all') {
        validateId(id);
        try {
            if (opt === 'all') {
                await fs.promises.rm(path.join('key', 'live', id, 'public_key.pem'), { force: true });
                await fs.promises.rm(path.join('key', 'live', id, 'private_key.pem'), { force: true });
                await fs.promises.rmdir(path.join('key', 'live', id));
            } else if (opt === 'private') {
                await fs.promises.rm(path.join('key', 'live', id, 'private_key.pem'), { force: true });
            } else if (opt === 'public') {
                await fs.promises.rm(path.join('key', 'live', id, 'public_key.pem'), { force: true });
            }

            console.log(`✅ Clé ${opt} bien supprimée ! id = ${id}`);
        } catch (err: unknown) {
            console.error(`❌ Une erreur est survenue lors de la suppression de la clé ${opt} pour l'id = ${id} :\n${err}`);
        }
    }

    async read(id: string, opt: 'all' | 'public' | 'private' = 'all'): Promise<string | { publicKey: string; privateKey: string } | undefined> {
        validateId(id);
        try {
            if (opt === 'all') {
                const publicKey = await fs.promises.readFile(path.join('key', 'live', id, 'public_key.pem'), 'utf8');
                const privateKey = await fs.promises.readFile(path.join('key', 'live', id, 'private_key.pem'), 'utf8');
                return { publicKey, privateKey };
            } else if (opt === 'private') {
                const key = await fs.promises.readFile(path.join('key', 'live', id, 'private_key.pem'), 'utf8');
                return key;
            } else if (opt === 'public') {
                const key = await fs.promises.readFile(path.join('key', 'live', id, 'public_key.pem'), 'utf8');
                return key;
            } else {
                console.error('Argument mal défini (key.read => key_manager l74)');
                return undefined;
            }
        } catch (err: unknown) {
            console.error(`❌ Erreur lors de la lecture de la clé ${opt} pour l'id = ${id} :\n${err}`);
            return undefined; // ⭐ FIX: Retourne undefined explicitement
        }
    }
}

export default new Key();
