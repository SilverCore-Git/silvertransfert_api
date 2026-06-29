# SilverTransfert API - Guide pour les Agents Vibe

> **Objectif** : Maintenir un code **propre, sécurisé et typé** à 100%. Aucun `any` n'est toléré.

---

## 📋 Contexte du Projet

**SilverTransfert API** est une API de transfert de fichiers **chiffrés de bout en bout**.

- **Fonctionnalité principale** : Permettre aux utilisateurs d'uploader des fichiers qui sont automatiquement chiffrés, puis de les télécharger après authentification via un ID et un mot de passe unique.
- **Architecture** : Backend Express.js en TypeScript, exécuté avec Bun.
- **Stockage** : Fichiers chiffrés sur disque, métadonnées dans un fichier JSON (`database.json`).
- **Sécurité** : Chiffrement AES-256 + RSA, gestion des clés sécurisée, rate limiting, Helmet, CORS strict.

---

## 🎯 Règles Absolues (Non Négociables)

### ✅ **TypeScript Strict**
- **`noImplicitAny: true`** est activé dans `tsconfig.json`
- **Interdit** : Utiliser le type `any` sous quelle que forme que ce soit
- **Autorisé** : `unknown` (avec validation runtime), types explicites, génériques
- **Pattern à suivre** :
  ```typescript
  // ❌ INTERDIT
  const data: any = getData();
  
  // ✅ AUTORISÉ - Type explicite
  interface UserData { id: string; name: string; }
  const data: UserData = getData();
  
  // ✅ AUTORISÉ - unknown avec validation
  const data: unknown = getData();
  if (isUserData(data)) { /* ... */ }
  ```

### ✅ **Sécurité**
- **Toujours** valider et sanitzer les entrées utilisateur
- **Toujours** utiliser `crypto.randomBytes()` pour la génération aléatoire (pas `Math.random()`)
- **Toujours** gérer les erreurs de manière sécurisée (ne pas exposer les stacks traces en prod)
- **Toujours** utiliser des chemins absolus résolus via `path.join()` ou `path.resolve()`
- **Jamais** concaténer des chemins avec des strings bruts

### ✅ **Code Propre**
- **Noms explicites** : `getUserById` > `getUser`, `fileEncryptionKey` > `key`
- **Fonctions courtes** : Max 50 lignes, idéalement < 20
- **Commentaires** : Pourquoi, pas comment. Si le code a besoin d'une explication de "comment", il doit être refactoré
- **Imports** : Regroupés par source (external, internal, local), séparés par lignes vides

---

## 📁 Structure du Projet

```
silvertransfert_api/
├── src/
│   ├── app.ts                 # Point d'entrée Express
│   ├── config/
│   │   ├── config.ts          # Configuration centralisée (env vars)
│   │   └── config.json        # Defaults
│   ├── assets/
│   │   ├── Crypter/           # Chiffrement (AES, RSA, gestion des clés)
│   │   │   ├── CrypterTypes.ts
│   │   │   ├── EncryptFile.ts
│   │   │   ├── DecryptFile.ts
│   │   │   ├── Text_crypter.ts
│   │   │   ├── key_manager.ts
│   │   │   └── VerifyPasswd.ts
│   │   ├── database/
│   │   │   ├── db.ts           # Opérations CRUD sur la DB JSON
│   │   │   └── dbTypes.ts      # Types TypeScript de la base
│   │   ├── utils/             # Utilitaires
│   │   │   ├── filesize.ts
│   │   │   ├── getClientIp.ts
│   │   │   └── getDate.ts
│   │   └── Logger.ts           # Logging centralisé
│   ├── routes/
│   │   ├── upload/
│   │   │   ├── upload.ts       # Upload + préparation chiffrement
│   │   │   └── afterUpload.ts  # Traitement post-upload
│   │   ├── download/
│   │   │   ├── download.ts
│   │   │   ├── downloadFile.ts
│   │   │   └── decrypteFile.ts
│   │   └── api.ts              # Routes API (à développer)
│   └── Jobs/
│       ├── index.ts           # Tâches cron
│       ├── run.ts
│       ├── nodeRun.ts
│       ├── transferBackup/
│       │   └── transferBackup.ts
│       └── transferChecker/
│           ├── transferChecker.ts
│           └── assets/
│               ├── DiskReporter.ts
│               └── ExpireManager.ts
├── db/
│   └── database.json          # Base de données (JSON)
├── data/                      # Fichiers chiffrés
├── temp/                      # Uploads temporaires
├── log/                       # Logs
├── mirror/                    # Backups (optionnel)
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🔧 Configuration & Environnement

### Variables d'Environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `HOSTNAME` | localhost | Nom d'hôte du serveur |
| `PORT` | 8080 | Port du serveur |
| `DATA_DIR` | data | Dossier de stockage des fichiers chiffrés |
| `TEMP_DIR` | temp | Dossier temporaire pour les uploads |
| `LOG_DIR` | log | Dossier des logs |
| `DB_FILE` | db/database.json | Chemin du fichier de base de données |
| `BACKUP_DATA_DIR` | mirror | Dossier de backup |
| `BACKUP` | false | Activer/désactiver le backup |
| `MAX_BYTE_FOR_KEY` | 256 | Taille max pour la génération de clés |
| `EXPIRE_TIME` | 30 | Temps d'expiration des transferts (jours) |

### Configuration Centralisée

**Toujours** utiliser `config.ts` pour accéder aux variables :
```typescript
import config from './config/config';

// ✅ Bon
const port = config.Port;
const dataDir = config.DATAdir;

// ❌ Mauvais - ne pas accéder directement à process.env
const port = process.env.PORT; // Évite cela
```

---

## 🔐 Bonnes Pratiques de Sécurité

### 1. Validation des Entrées

**Toujours** valider les paramètres utilisateur :

```typescript
// ✅ Pattern recommandé
function validateTransferParams(id: string, passwd: string): { valid: boolean; error?: string } {
    const idRegex = /^[a-zA-Z0-9_-]{8,64}$/;
    if (!id || typeof id !== 'string') {
        return { valid: false, error: 'ID invalide' };
    }
    if (!idRegex.test(id)) {
        return { valid: false, error: 'Caractères non autorisés' };
    }
    // ... autres validations
    return { valid: true };
}

// Utilisation
const validation = validateTransferParams(id, passwd);
if (!validation.valid) {
    return res.status(400).json({ error: true, message: validation.error });
}
```

### 2. Chiffrement

- **AES-256-CBC** pour le chiffrement des fichiers
- **RSA** pour le chiffrement des clés AES
- **Toujours** générer un IV unique par chunk
- **Toujours** utiliser `crypto.randomBytes()` pour les clés et IVs

```typescript
// ✅ Génération sécurisée
const aesKey = crypto.randomBytes(32); // AES-256
const iv = crypto.randomBytes(16); // IV pour AES

// ✅ Chiffrement
const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
```

### 3. Gestion des Erreurs

**Ne jamais** exposer les erreurs internes :

```typescript
// ✅ Bon - Message générique
try {
    await processUpload(req, res);
} catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: true, message: 'Erreur lors du traitement' });
}

// ❌ Mauvais - Expose l'erreur interne
catch (error) {
    res.status(500).json({ error: error.message }); // ❌ Fuite d'info
}
```

### 4. Path Traversal Protection

**Toujours** résoudre les chemins de manière sécurisée :

```typescript
import path from 'path';
import config from '../config/config';

// ✅ Bon
const filePath = path.join(config.DATAdir, userInput);

// ❌ Mauvais - Vulnérable à path traversal
const filePath = config.DATAdir + '/' + userInput;
```

### 5. Middleware de Sécurité

Déjà configurés dans `app.ts` :
- **Helmet** : Headers de sécurité HTTP
- **CORS** : Configuration stricte des origines autorisées
- **Rate Limiting** : 100 req/15min (global), 20 req/15min (endpoints sensibles)
- **Trust Proxy** : Configuration sécurisée pour les reverse proxies

---

## 📝 Conventions de Code

### Nommage

| Type | Convention | Exemple |
|------|------------|---------|
| Variables | camelCase | `fileSize`, `maxRetries` |
| Constantes | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT` |
| Fonctions | camelCase | `getUserById()`, `validateInput()` |
| Classes | PascalCase | `DatabaseManager`, `EncryptionService` |
| Interfaces | PascalCase (préfixe I optionnel) | `Transfert`, `UserData` |
| Types | PascalCase | `StatusType`, `EncryptionMode` |
| Fichiers | kebab-case | `file-upload.ts`, `user-model.ts` |

### Typage

```typescript
// ✅ Types explicites
interface TransferParams {
    id: string;
    passwd: string;
    file: Express.Multer.File;
}

// ✅ Types optionnels
interface Transfer {
    UUID: string;
    originalFileName?: string; // Optionnel
    status: 'ready_to_download' | 'ready_to_decrypt' | 'await_crypting' | 'expired';
}

// ✅ Union types pour les status
status: 'ready_to_download' | 'ready_to_decrypt' | 'await_crypting' | 'expired';

// ✅ Tuple types
const [user, error]: [User | null, Error | null] = await getUser();
```

### Structure des Fonctions

```typescript
/**
 * Description de ce que fait la fonction (POURQUOI)
 * @param param1 - Description du paramètre
 * @param param2 - Description du paramètre
 * @returns Description de la valeur de retour
 * @throws Error si condition d'erreur
 */
async function functionName(param1: Type1, param2: Type2): Promise<ReturnType> {
    // Validation des paramètres
    if (!param1) {
        throw new Error('param1 is required');
    }
    
    // Logique métier
    const result = await someOperation(param1, param2);
    
    // Retour explicite
    return result;
}
```

### Imports

```typescript
// ✅ Regroupés et triés
import express from 'express';
import multer from 'multer';
import path from 'path';

import config from '../../config/config';
import db from '../../assets/database/db';

import getClientIp from '../../assets/utils/getClientIp';
```

### Async/Await

```typescript
// ✅ Toujours utiliser async/await, pas de .then()
async function process() {
    const data = await getData();
    return data;
}

// ❌ Éviter
function process() {
    return getData().then(data => data);
}
```

---

## 🚨 Points d'Attention (À Corriger)

### Problèmes Conchus dans le Code Existants

1. **`src/assets/Crypter/EncryptFile.ts`** - Ligne 12-15
   - Paramètres typés `any` → À typer explicitement
   - **Correction requise** : Définir des interfaces pour les paramètres

2. **`src/assets/Crypter/EncryptFile.ts`** - Ligne 49, 103
   - `chunk: any` → À typer `Buffer`
   - **Correction** : `chunk: Buffer`

3. **`src/routes/upload/upload.ts`** - Ligne 73
   - `err: any` → À typer `Error | multer.MulterError`
   - **Correction** : `err: Error` (déjà partiellement typé)

4. **`src/assets/Logger.ts`** - Ligne 25, 31, 37
   - Redéfinition de `console.log/error/warn` → Peut causer des problèmes
   - **Recommandation** : Utiliser un logger dédié (Winston, Pino)

### Actions Prioritaires

- [ ] **Corriger tous les `any`** dans le codebase
- [ ] **Ajouter des tests unitaires** pour les fonctions critiques (chiffrement, validation)
- [ ] **Documenter les endpoints API** (Swagger/OpenAPI)
- [ ] **Mettre en place des middlewares** de validation centralisés

---

## 🛠 Outils & Commandes

### Scripts Disponibles

```bash
# Développement
bun run dev          # Démarre le serveur avec hot reload

# Production
bun run build        # Build l'application
bun run start        # Démarre le serveur en production

# Utilitaires
bun run testcrypt    # Teste le chiffrement
bun run datasize     # Calcule la taille des données
bun run clear        # Nettoie les dossiers
bun run jobs         # Exécute les jobs cron
```

### Vérification TypeScript

```bash
# Vérifier les erreurs de type
bun run build  # Échouera si des erreurs de type existent

# Vérifier spécifiquement les 'any'
grep -r "any" src/ --include="*.ts" --include="*.js"
```

---

## 📊 Métriques de Qualité

### Critères d'Acceptation pour les PR

- [ ] **Aucun `any`** dans le code ajouté/modifié
- [ ] **100% de couverture** des nouveaux endpoints par des tests
- [ ] **Validation** de toutes les entrées utilisateur
- [ ] **Documentation** des nouvelles fonctions/classes
- [ ] **Logs** appropriés pour le débogage
- [ ] **Gestion des erreurs** avec messages clairs et sécurisés

---

## 📞 Contacts & Ressources

- **Mainteneurs** : SilverCore, SilverTransfert, MisterPapaye
- **Documentation API** : À créer (Swagger/OpenAPI)
- **Issues** : GitHub Issues du dépôt

---

## ✅ Checklist avant Commit

- [ ] Mon code compile sans erreurs (`bun run build`)
- [ ] Aucun `any` n'a été ajouté
- [ ] Toutes les entrées utilisateur sont validées
- [ ] Les erreurs sont gérées proprement (pas de `console.error` brut)
- [ ] Les chemins de fichiers sont résolus de manière sécurisée
- [ ] Les clés et IVs sont générés avec `crypto.randomBytes()`
- [ ] Le code suit les conventions de nommage
- [ ] Les imports sont proprement organisés
- [ ] Les commentaires expliquent le "pourquoi", pas le "comment"
- [ ] Les logs sont utiles pour le débogage sans être trop verbeux

---

*Dernière mise à jour : 2026-06-29*
*Version : 1.0.0*
