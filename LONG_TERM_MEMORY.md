# SilverTransfert API - Mémoire Collective du Projet

> **Mémoire technique et historique du projet** - À maintenir à jour par tous les contributeurs

---

## 📜 Historique du Projet

### Origines
- **Création** : Projet initié par SilverCore, SilverTransfert, MisterPapaye
- **Objectif initial** : Créer un service de transfert de fichiers sécurisé avec chiffrement de bout en bout
- **Technologies choisies** : Node.js → Express → TypeScript → Bun pour les performances

### Évolution

| Version | Date | Changements Majeurs | Auteurs |
|---------|------|---------------------|---------|
| 1.0.0 | 2024-xx-xx | Version initiale - Upload/Download basique | SilverCore |
| 2.0.0 | 2024-xx-xx | Ajout du chiffrement AES-256 + RSA | SilverTransfert |
| 2.5.0 | 2024-xx-xx | Migration TypeScript, structure modulaire | MisterPapaye |
| 3.0.0 | 2026-06-29 | Refactorisation sécurité, rate limiting, Helmet | Équipe |

### Derniers Commits Importants

```
200c362 (HEAD -> main) Update .env.example
3d69d8c feat: encrypt originalFileName in database for security
3c4296f Update download.ts
086d68d Update VerifyPasswd.ts
df4e02c Fix: Support absolute paths in .env for all directory configurations
```

---

## 🎯 Vision & Roadmap

### Mission
Fournir un service de transfert de fichiers **simple, sécurisé et privé** qui permet aux utilisateurs d'échanger des fichiers de grande taille sans compromettre la confidentialité.

### Valeurs
1. **Sécurité avant tout** - Le chiffrement de bout en bout est non négociable
2. **Simplicité** - Interface minimaliste, pas de fonctionnalités superflues
3. **Performance** - Traitement efficace des gros fichiers (chunking)
4. **Fiabilité** - Zéro perte de données, gestion robuste des erreurs

### Roadmap 2026

#### Q3 2026 (Priorité Haute)
- [ ] **Corriger tous les `any`** dans le codebase
- [ ] Implémenter des **tests unitaires** complets
- [ ] Ajouter la **documentation Swagger/OpenAPI**
- [ ] Mettre en place un **système de monitoring**
- [ ] **Optimiser** le traitement des très gros fichiers (>10GB)

#### Q4 2026 (Priorité Moyenne)
- [ ] Implémenter l'**authentification 2FA** pour les transferts sensibles
- [ ] Ajouter le **support des dossiers** (zip automatique)
- [ ] **Notifications email** pour les téléchargements
- [ ] **Interface admin** pour la gestion des transferts

#### 2027 (Priorité Basse)
- [ ] **Version SaaS** - Hébergement multi-tenant
- [ ] **Application mobile** companion
- [ ] **Intégration cloud storage** (S3, etc.)
- [ ] **Chiffrement quantique résistant** (post-quantum crypto)

---

## 🔧 Architecture Technique

### Stack Technique

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| Runtime | Bun | 1.x | Exécution TypeScript/Javascript |
| Framework | Express.js | 4.21.x | Serveur HTTP |
| Langage | TypeScript | 5.9.x | Typage statique |
| Base de données | JSON File | - | Stockage des métadonnées |
| Chiffrement | Node.js Crypto | - | AES-256, RSA |
| Upload | Multer | 1.4.5-lts.1 | Gestion des uploads |
| Logging | Custom | - | Journaux centralisés |
| Jobs | node-cron | 4.2.1 | Tâches planifiées |
| Sécurité | Helmet, express-rate-limit | - | Protection HTTP |

### Schéma d'Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                              CLIENT                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER (NGINX)                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         EXPRESS SERVER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │   Helmet    │  │   CORS      │  │    Rate Limiting             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                         ROUTES                                │ │
│  │  /upload    - POST /file (upload + chiffrement)             │ │
│  │  /data      - GET /:id/:passwd (téléchargement)               │ │
│  │  /api       - Endpoints supplémentaires                      │ │
│  │  /key       - Génération de clés                             │ │
│  │  /passwd    - Génération de mots de passe                     │ │
│  │  /version   - Version de l'API                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      MIDDLEWARES                             │ │
│  │  - Validation des paramètres                                  │ │
│  │  - Gestion des erreurs                                       │ │
│  │  - Logging                                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVICES INTERNES                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   Database   │  │   Crypter     │  │        Jobs              │  │
│  │  (JSON File) │  │  (AES/RSA)    │  │  (node-cron)             │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
    ┌─────────────────────┴─────────────────────┐
    ▼                                             ▼
┌──────────────────┐                 ┌─────────────────────┐
│   STORAGE         │                 │    BACKUP            │
│   /data/          │                 │    /mirror/          │
│   (fichiers       │                 │    (optionnel)       │
│   chiffrés .enc)  │                 │                     │
└──────────────────┘                 └─────────────────────┘
```

### Flux Principal : Upload & Chiffrement

```
1. Client → POST /upload/file
   ├── Multipart form avec fichier(s)
   ├── Paramètres: id, passwd
   └── Headers: Content-Type

2. Serveur → Validation
   ├── Vérification de l'id (regex: /^[a-zA-Z0-9_-]{8,64}$/)
   ├── Vérification du passwd (8-128 caractères)
   ├── Vérification de la taille (max 16GB par fichier)
   └── Limite: 20 fichiers par requête

3. Serveur → Stockage Temporaire (Multer)
   ├── Fichiers stockés dans /temp/
   ├── Noms de fichiers chiffrés (Text_crypter)
   └── Si multi-fichiers → ZIP automatique

4. Serveur → Génération des Clés
   ├── key_manager.generate(id, passwd)
   ├── Clé RSA publique générée
   └── Stockage temporaire en mémoire

5. Serveur → Base de Données
   ├── Création de l'entrée Transfert
   ├── UUID: id
   ├── cryptedFileName: nom du fichier chiffré
   ├── originalFileName: chiffré (Text_crypter)
   ├── size: taille totale
   ├── senderIp: IP du client
   ├── date: timestamp
   └── status: 'await_crypting'

6. Serveur → Traitement Asynchrone (afterUpload)
   ├── EncryptFile() - Chiffrement AES-256
   │   ├── Découpage en chunks de 100MB
   │   ├── Chaque chunk a son propre IV
   │   ├── Clé AES chiffrée avec RSA
   │   └── Layout.json généré (métadonnées)
   ├── Déplacement vers /data/
   └── Mise à jour status: 'ready_to_download'

7. Serveur → Réponse au Client
   ├── status: 'await_crypting' (ou 'ready_to_download')
   ├── id: identifiant du transfert
   └── downloadPath: URL de téléchargement

8. Client → Accès au Fichier
   ├── GET /data/{id}-{passwd}
   ├── Vérification des credentials
   ├── Déchiffrement côté serveur
   └── Téléchargement du fichier
```

---

## 📊 Métadonnées du Projet

### Statistiques
- **Nombre de fichiers TypeScript** : 45+
- **Lignes de code** : ~2,500 (à vérifier)
- **Dépendance externes** : 20+
- **Taille du bundle** : ~5MB (avec dépendances)
- **Temps de build** : < 10 secondes

### Complexité
- **Endpoints** : 5 principaux + utilitaires
- **Classes** : 5+ (db, Crypter, Logger, etc.)
- **Fonctions critiques** : Chiffrement, validation, gestion des fichiers

### Performances
- **Upload max** : 16GB par fichier
- **Fichiers simultanés** : 20 par requête
- **Taille des chunks** : 100MB
- **Algorithme** : AES-256-CBC
- **Temps de chiffrement** : ~1-2 secondes par GB (selon hardware)

---

## 🔐 Modèle de Sécurité

### Menaces Identifiées & Mitigations

| Menace | Risque | Mitigation |
|--------|--------|------------|
| Path Traversal | Accès à des fichiers non autorisés | Validation stricte des chemins, `path.join()` |
| Brute Force | Deviner les IDs/mots de passe | Rate limiting (20 req/15min), IDs longs (8-64 chars) |
| XSS | Injection de scripts | Helmet CSP, pas de rendu HTML des inputs |
| CSRF | Requêtes non autorisées | CORS strict, same-site cookies |
| MITM | Interception des données | HTTPS obligatoire, HSTS |
| DoS | Saturation du serveur | Limite de taille (16GB), rate limiting |
| Information Leak | Fuite de données | Pas d'erreurs détaillées en prod, logging sécurisé |

### Bonnes Pratiques Implémentées

✅ **Chiffrement**
- AES-256-CBC pour les fichiers
- RSA pour les clés AES
- IV unique par chunk
- Génération aléatoire sécurisée (`crypto.randomBytes`)

✅ **Authentification**
- ID unique + mot de passe pour chaque transfert
- Pas de stockages des mots de passe (suppression après utilisation)
- Clés temporaires en mémoire uniquement

✅ **Protection HTTP**
- Helmet pour les headers de sécurité
- CORS restreint aux origines autorisées
- Rate limiting global et strict
- Trust proxy configuré
- HSTS activé

✅ **Validation**
- Regex pour les IDs
- Longueur pour les mots de passe
- Types MIME pour les fichiers
- Tailles maximales

### Points à Améliorer

⚠️ **À corriger rapidement**
- [ ] Remplacer tous les `any` par des types explicites
- [ ] Implémenter des tests de sécurité automatisés
- [ ] Ajouter CSRF protection tokens
- [ ] Mettre en place un système de rotation des clés

⚠️ **Améliorations futures**
- [ ] Implémenter OAuth 2.0 pour l'authentification
- [ ] Ajouter audit logging complet
- [ ] Intégrer un WAF (Web Application Firewall)
- [ ] Certifications de sécurité (SOC 2, etc.)

---

## 📂 Structure des Données

### Base de Données (database.json)

```typescript
interface Transfert {
    UUID: string;              // Identifiant unique (8-64 chars)
    cryptedFileName: string;   // Nom du fichier chiffré (ex: "abc123.file.txt.enc")
    tempFileName: string;      // Nom temporaire du fichier
    originalFileName?: string; // Nom original CHIFFRÉ (encryption réversible)
    size: number;              // Taille en octets
    senderIp: string;          // IP du client uploadant
    date: string;              // Format: "YYYY-MM-DD - HH:MM:SS"
    status: 'ready_to_download' | 'ready_to_decrypt' | 'await_crypting' | 'expired';
}

// Exemple de contenu
type Database = Transfert[];
```

### Layout des Fichiers Chiffrés

```typescript
// CrypterTypes.ts
interface Chunk {
    index: number;      // Index du chunk (0, 1, 2, ...)
    start: number;      // Position de départ dans le fichier original
    iv: string;         // Vecteur d'initialisation en hex
}

interface Layout {
    chunks: Chunk[];           // Liste des chunks
    originalFileHash: string;  // Hash SHA-256 du fichier original
    aesKey: string;            // Clé AES chiffrée avec RSA (en hex)
}
```

### Structure des Dossiers

```
silvertransfert_api/
├── data/                          # Fichiers chiffrés persistants
│   ├── abc123.file.txt.enc        # Fichier chiffré
│   ├── abc123/                    # Dossier du transfert (optionnel)
│   │   ├── layout.json           # Métadonnées de chiffrement
│   │   ├── witness.txt           # Informations de vérification
│   │   └── witness_layout.json   # Layout du witness file
│   └── ...
├── temp/                          # Uploads temporaires (nettoyés après traitement)
│   ├── encrypted_name.txt        # Fichier uploadé (avant chiffrement)
│   └── abc123_archive.zip         # Archive temporaire (multi-fichiers)
├── log/                           # Journaux
│   └── 2026-06-29.log            # Logs du jour
├── mirror/                       # Backups (si BACKUP=true)
│   └── [même structure que data/]
└── db/
    └── database.json             # Base de données des transferts
```

---

## 🔄 Processus Opérationnels

### Workflow de Développement

```
1. Fork du dépôt
2. Création d'une branche feature/fix: git checkout -b feature/nouvelle-fonctionnalité
3. Développement avec respect des règles (vibe/AGENTS.md)
4. Vérification:
   - bun run build (pas d'erreurs TypeScript)
   - grep -r "any" src/ (aucun any)
   - Tests manuels des fonctionnalités
5. Commit avec message clair:
   - feat: ajouter fonctionnalité X
   - fix: corriger bug Y
   - refactor: nettoyer code Z
6. Push de la branche
7. Pull Request vers main
8. Revue par un mainteneur
9. Merge après validation
```

### Déploiement

```bash
# Build pour la production
git pull origin main
bun run build

# Démarrer le serveur
git checkout main
git pull
bun run start  # ou: bun dist/app.js

# Avec PM2 (pour la gestion de processus)
pm2 start dist/app.js --name silvertransfert-api
pm2 save
pm2 startup
```

### Maintenance

**Tâches régulières** :
- Nettoyage des fichiers expirés (job cron quotidien à 01:00)
- Backup des données (si BACKUP=true)
- Rotation des logs (à implémenter)

**Commandes utiles** :
```bash
# Nettoyer les dossiers temp
bun run clear

# Exécuter les jobs manuellement
bun run jobs

# Vérifier l'espace disque
bun run datasize

# Tester le chiffrement
bun run testcrypt
```

---

## 💡 Décisions Architecturales

### Pourquoi Bun au lieu de Node.js ?
- **Performances** : Bun est 2-3x plus rapide que Node.js
- **Compatibilité** : Supporte nativement TypeScript et ESM
- **Outils intégrés** : Bundler, test runner, package manager
- **Futur** : Écosystème en croissance rapide

### Pourquoi JSON File au lieu d'une Base de Données ?
- **Simplicité** : Pas besoin de serveur de base de données
- **Portabilité** : Facile à déployer partout
- **Coût** : Zéro coût d'infrastructure
- **Évolutivité** : Suffisant pour le volume actuel (< 10,000 transferts/jour)
- **Migration future** : Possible vers MongoDB ou PostgreSQL si besoin

### Pourquoi AES-256-CBC ?
- **Sécurité** : Standard industriel, largement audité
- **Performance** : Rapide en logiciel et matériel
- **Compatibilité** : Support natif dans Node.js crypto
- **Taille des blocs** : 16 octets (AES standard)

### Pourquoi pas de Base de Données Relationnelle ?
- **Complexité** : Pas besoin de jointures pour ce cas d'usage
- **Schema flexible** : Les transferts ont une structure simple
- **Pas de transactions** : Chaque transfert est indépendant
- **Coût** : Évite les frais de DB cloud

---

## 📚 Connaissances Spécifiques

### Chiffrement Hybride (AES + RSA)

**Pourquoi ?**
- RSA seul est lent pour les gros fichiers
- AES seul nécessite un échange sécurisé de la clé
- **Solution** : Chiffrer le fichier avec AES (rapide), chiffrer la clé AES avec RSA (sécurisé)

**Processus** :
```
1. Générer une clé AES-256 aléatoire
2. Générer un IV aléatoire pour chaque chunk
3. Chiffrer le fichier avec AES-256-CBC + IVs
4. Chiffrer la clé AES avec RSA (clé publique du serveur)
5. Stocker : fichiers chiffrés + layout.json (contient clé AES chiffrée + IVs)
6. Déchiffrement : déchiffrer clé AES avec RSA → déchiffrer fichier avec AES
```

### Gestion des Gros Fichiers

**Stratégie** : Chunking (découpage en morceaux)

**Avantages** :
- Pas besoin de charger tout le fichier en mémoire
- Reprise possible en cas d'échec (chaque chunk indépendant)
- Parallélisation possible (futur)

**Implémentation** :
- Taille des chunks : 100MB
- Chaque chunk a son propre IV
- Layout.json contient la liste de tous les chunks
- Recomposition à la volée lors du téléchargement

### Système de Clés Unique

**Concept** :
- Chaque transfert a un **ID unique** (8-64 caractères alphanumériques)
- L'ID + le **mot de passe** forment une paire de credentials
- Le mot de passe n'est **jamais stocké** (seulement utilisé pour générer la clé)
- La clé de chiffrement est **déduite** de l'ID + mot de passe

**Avantages** :
- Pas de base de données de mots de passe à protéger
- Pas de risque de fuite de mots de passe
- Chaque transfert est indépendant et sécurisé

---

## 🎓 Leçons Apprises

### Ce qui a bien fonctionné

✅ **TypeScript strict dès le début** : Évite beaucoup de bugs
✅ **Modularité** : Séparation claire des responsabilités
✅ **Chiffrement hybride** : Bon équilibre sécurité/performance
✅ **Chunking** : Gestion efficace des gros fichiers
✅ **Configuration centralisée** : Facile à maintenir

### Ce qui a posé problème

⚠️ **Utilisation initiale de `any`** : Difficile à corriger a posteriori
⚠️ **Pas de tests unitaires** : Difficile de refactorer en confiance
⚠️ **Logging sur `console`** : Peut interférer avec d'autres bibliothèques
⚠️ **Pas de documentation API** : Difficile pour les nouveaux développeurs

### Conseils pour les Futurs Développeurs

💡 **Toujours typer** : Même si ça prend plus de temps, ça en vaut la peine
💡 **Valider les entrées** : Ne jamais faire confiance aux données utilisateur
💡 **Gérer les erreurs** : Toujours catch les exceptions, jamais les ignorer
💡 **Logger intelligemment** : Assez pour déboguer, pas assez pour noyer
💡 **Tester** : Même un petit test vaut mieux que rien
💡 **Documenter** : Un commentaire "pourquoi" peut sauver des heures

---

## 📞 Contacts & Ressources

### Équipe
- **SilverCore** - Architecte principal
- **SilverTransfert** - Expert sécurité
- **MisterPapaye** - Développement & maintenance

### Documentation
- **Ce fichier** : LONG_TERM_MEMORY.md - Mémoire technique
- **Guide des agents** : vibe/AGENTS.md - Règles de développement
- **README** : README.md - Informations générales
- **Swagger/OpenAPI** : À créer - Documentation API interactive

### Outils
- **GitHub** : Hébergement du code, issues, PRs
- **Bun** : Runtime et outils de build
- **TypeScript** : Documentation officielle pour les types
- **Node.js Crypto** : Documentation pour le chiffrement

---

## 🔄 Changements Récents Importants

### 2026-06-29 - Update .env.example
- Clarification de la documentation des variables d'environnement
- Support des chemins absolus et relatifs

### 2026-06-28 - feat: encrypt originalFileName in database for security
- **Changement** : `originalFileName` est maintenant chiffré dans la DB
- **Impact** : Meilleure sécurité, impossible de voir les noms de fichiers sans la clé
- **Migration** : Les anciens transferts gardent leur nom en clair (à migrer ?)

### 2026-06-27 - Update download.ts
- Amélioration de la gestion des erreurs
- Meilleure validation des paramètres

### 2026-06-26 - Update VerifyPasswd.ts
- Correction de la vérification des mots de passe
- Meilleure gestion des edge cases

### 2026-06-25 - Fix: Support absolute paths in .env for all directory configurations
- **Problème** : Les chemins relatifs ne fonctionnaient pas correctement
- **Solution** : Fonction `resolvePath()` dans config.ts
- **Impact** : Plus flexible pour les déploiements

---

## 📝 Journal des Décisions

| Date | Décision | Contexte | Impact |
|------|----------|----------|--------|
| 2026-06-29 | Créer vibe/AGENTS.md et LONG_TERM_MEMORY.md | Mise en place pour les agents Vibe | Meilleure onboarding, mémoire du projet |
| 2026-06-28 | Chiffrer originalFileName dans la DB | Amélioration sécurité | Plus de confidentialité |
| 2026-06-25 | Supporter les chemins absolus dans .env | Flexibilité de déploiement | Plus facile à configurer |
| 2024-xx-xx | Choisir Bun comme runtime | Performance et modernité | Meilleure vitesse d'exécution |
| 2024-xx-xx | Implémenter le chunking à 100MB | Gestion des gros fichiers | Mémoire maîtrisée |

---

## 🚀 Comment Contribuer

### Pour les Développeurs Humains
1. Lire ce fichier (LONG_TERM_MEMORY.md)
2. Lire vibe/AGENTS.md pour les conventions
3. Forker le dépôt
4. Créer une branche
5. Développer en respectant les règles
6. Soumettre une PR

### Pour les Agents Vibe
1. Lire vibe/AGENTS.md **impérativement**
2. Respecter **absolument** l'interdiction des `any`
3. Valider toutes les entrées
4. Gérer toutes les erreurs
5. Typage strict obligatoire
6. Documenter le code

---

## 📅 Calendrier & Événements

| Date | Événement | Statut |
|------|-----------|--------|
| 2026-07-15 | Correction de tous les `any` | À faire |
| 2026-07-30 | Tests unitaires complets | À faire |
| 2026-08-15 | Documentation Swagger | À faire |
| 2026-09-01 | Version 3.1.0 | Planifiée |

---

*Dernière mise à jour : 2026-06-29*
*Version : 1.0.0*
*Mainteneur : Équipe SilverTransfert*

---

> **Note** : Ce fichier doit être mis à jour à chaque changement architectural, décision majeure, ou ajout de connaissance importante. C'est la mémoire collective du projet - sans elle, la connaissance se perd.
