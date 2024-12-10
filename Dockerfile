FROM node:16-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

COPY wait-for-it.sh /wait-for-it.sh

RUN chmod +x /wait-for-it.sh

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Exposer le port utilisé par l'application
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]
