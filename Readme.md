# 🚀 Lecryptique Info API

API proxy pour les actualités des marchés financiers (crypto et or) utilisant Google News via SerpAPI.

## 📁 Structure du projet

```
lecryptique-info-api/
├── src/
│   └── index.js          # Code principal de l'API
├── package.json          # Dépendances
├── wrangler.toml         # Configuration Cloudflare Workers
└── README.md            # Ce fichier
```

## 🛠️ Installation

### 1. Créer le projet

```bash
mkdir lecryptique-info-api
cd lecryptique-info-api
mkdir src
```

### 2. Copier les fichiers

- Copiez le contenu de `index.js` dans `src/index.js`
- Copiez `package.json` à la racine
- Copiez `wrangler.toml` à la racine

### 3. Installer les dépendances

```bash
npm install
```

## 🚀 Déploiement sur Cloudflare Workers

### 1. Se connecter à Cloudflare

```bash
npx wrangler login
```

### 2. Tester en local

```bash
npm run dev
```

L'API sera disponible sur `http://localhost:8787`

### 3. Déployer en production

```bash
npm run deploy
```

Votre API sera accessible sur : `https://lecryptique-info-api.votre-compte.workers.dev`

## 📡 Endpoints

### `GET /`
Page d'accueil avec le statut du service

**Réponse :**
```json
{
  "message": "Lecryptique info",
  "status": "online",
  "endpoints": { ... }
}
```

### `GET /health`
Vérifier l'état du service et du cache

**Réponse :**
```json
{
  "status": "online",
  "service": "Lecryptique info",
  "timestamp": "2025-10-30T12:00:00.000Z",
  "cache": {
    "crypto": {
      "status": "OK",
      "lastUpdate": "2025-10-30T10:00:00.000Z",
      "country": "us",
      "articlesCount": 10
    },
    "gold": { ... }
  }
}
```

### `GET /news/:type`
Obtenir les actualités (crypto ou gold)

**Exemples :**
- `GET /news/crypto`
- `GET /news/gold`

**Réponse :**
```json
{
  "type": "crypto",
  "country": "us",
  "lastUpdate": "2025-10-30T10:00:00.000Z",
  "count": 10,
  "news": [
    {
      "title": "...",
      "link": "...",
      "source": "...",
      "date": "...",
      "snippet": "..."
    }
  ]
}
```

### `POST /config/type/:type`
Forcer la mise à jour immédiate d'un type

**Exemples :**
- `POST /config/type/crypto`
- `POST /config/type/gold`

### `POST /config/country/:type/:country`
Changer le pays pour un type spécifique

**Exemples :**
- `POST /config/country/crypto/fr`
- `POST /config/country/gold/uk`

**Pays supportés :** us, fr, uk, de, ca, jp, cn, in, br, au

## ⚙️ Configuration

### Clé API SerpAPI

La clé API est actuellement en dur dans le code. Pour plus de sécurité, vous pouvez utiliser les secrets Cloudflare :

```bash
npx wrangler secret put API_KEY
# Entrez votre clé : 5c0ffc3340f32627c3426568593120002232dffe1502040ecd52da0c70220584
```

Puis modifiez dans `src/index.js` :
```javascript
const CONFIG = {
  API_KEY: env.API_KEY, // Au lieu de la clé en dur
  UPDATE_INTERVAL: 2 * 60 * 60 * 1000,
};
```

### Cron (Mise à jour automatique)

Le fichier `wrangler.toml` contient :
```toml
[triggers]
crons = ["0 */2 * * *"]
```

Cela déclenche une mise à jour automatique toutes les 2 heures.

## 📊 Fonctionnalités

- ✅ Mise à jour automatique toutes les 2 heures
- ✅ Cache intelligent pour économiser les appels API
- ✅ Support multi-pays
- ✅ Actualités en français
- ✅ Focus sur les marchés financiers (crypto et or)
- ✅ CORS activé pour les appels depuis le frontend

## 🔧 Commandes utiles

```bash
# Développement local
npm run dev

# Déploiement
npm run deploy

# Voir les logs en temps réel
npm run tail

# Tester les crons localement
npx wrangler dev --test-scheduled
```

## 📝 Exemple d'utilisation

```javascript
// Récupérer les actualités crypto
const response = await fetch('https://votre-api.workers.dev/news/crypto');
const data = await response.json();
console.log(data.news);

// Changer le pays pour l'or
await fetch('https://votre-api.workers.dev/config/country/gold/fr', {
  method: 'POST'
});
```

## 🌐 Alternative : Déploiement Node.js

Si vous préférez déployer sur Node.js au lieu de Cloudflare Workers :

1. Modifiez la fin de `src/index.js` :
```javascript
export default app;
```

2. Créez `server.js` :
```javascript
import { serve } from '@hono/node-server';
import app from './src/index.js';

serve({
  fetch: app.fetch,
  port: 3000,
});

console.log('Server running on http://localhost:3000');
```

3. Installez `@hono/node-server` :
```bash
npm install @hono/node-server
```

4. Lancez :
```bash
node server.js
```

## 📄 Licence

MIT