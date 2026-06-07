# Backend Dockerfile - Bun + Express
FROM oven/bun:1.1

WORKDIR /app

# Copier tous les fichiers (sauf node_modules)
COPY . .

# Installer les dépendances avec Bun
RUN bun install --production

# Créer les répertoires persistants
RUN mkdir -p src/data src/temp src/db src/log key/live

# Exposer le port (par défaut 8080)
EXPOSE 8080

# Lancer l'application
CMD ["bun", "run", "src/app.ts"]
