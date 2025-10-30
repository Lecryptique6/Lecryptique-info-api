import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/*', cors());

// Configuration
const CONFIG = {
  API_KEY: '5c0ffc3340f32627c3426568593120002232dffe1502040ecd52da0c70220584',
  UPDATE_INTERVAL: 2 * 60 * 60 * 1000, // 2 heures en millisecondes
};

// Cache des actualités
let newsCache = {
  crypto: { data: null, lastUpdate: null, country: 'us' },
  gold: { data: null, lastUpdate: null, country: 'us' },
};

// Requêtes de recherche par type
const SEARCH_QUERIES = {
  crypto: 'cryptocurrency bitcoin ethereum market',
  gold: 'gold market price trading',
};

/**
 * Récupère les actualités depuis SerpAPI
 */
async function fetchNews(type, country = 'us') {
  const query = SEARCH_QUERIES[type];
  if (!query) {
    throw new Error('Type invalide');
  }

  const url = `https://serpapi.com/search.json?engine=google_news&q=${encodeURIComponent(query)}&gl=${country}&hl=fr&api_key=${CONFIG.API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`);
  }

  const data = await response.json();
  return data.news_results || [];
}

/**
 * Met à jour le cache pour un type donné
 */
async function updateCache(type, country = 'us') {
  try {
    console.log(`Mise à jour du cache ${type} pour ${country}...`);
    const news = await fetchNews(type, country);
    newsCache[type] = {
      data: news,
      lastUpdate: new Date().toISOString(),
      country: country,
    };
    console.log(`Cache ${type} mis à jour avec ${news.length} articles`);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du cache ${type}:`, error);
  }
}

/**
 * Vérifie si le cache doit être rafraîchi
 */
function shouldRefreshCache(type) {
  const cache = newsCache[type];
  if (!cache.data || !cache.lastUpdate) return true;
  
  const lastUpdate = new Date(cache.lastUpdate).getTime();
  const now = Date.now();
  return (now - lastUpdate) >= CONFIG.UPDATE_INTERVAL;
}

// Initialisation du cache au démarrage
(async () => {
  await Promise.all([
    updateCache('crypto'),
    updateCache('gold'),
  ]);
  console.log('Cache initialisé');
})();

// Mise à jour automatique toutes les 2 heures
setInterval(async () => {
  await Promise.all([
    updateCache('crypto', newsCache.crypto.country),
    updateCache('gold', newsCache.gold.country),
  ]);
}, CONFIG.UPDATE_INTERVAL);

// ROUTES

// Page d'accueil
app.get('/', (c) => {
  return c.json({
    message: 'Lecryptique info',
    status: 'online',
    endpoints: {
      '/': 'Page d\'accueil',
      '/health': 'Vérifier l\'état du service',
      '/news/:type': 'Obtenir les actualités (crypto ou gold)',
      '/config/type/:type': 'Changer le type d\'info (crypto ou gold)',
      '/config/country/:type/:country': 'Changer le pays pour un type',
    },
  });
});

// Health check
app.get('/health', (c) => {
  const cryptoHealth = newsCache.crypto.data ? 'OK' : 'NO_DATA';
  const goldHealth = newsCache.gold.data ? 'OK' : 'NO_DATA';
  
  return c.json({
    status: 'online',
    service: 'Lecryptique info',
    timestamp: new Date().toISOString(),
    cache: {
      crypto: {
        status: cryptoHealth,
        lastUpdate: newsCache.crypto.lastUpdate,
        country: newsCache.crypto.country,
        articlesCount: newsCache.crypto.data?.length || 0,
      },
      gold: {
        status: goldHealth,
        lastUpdate: newsCache.gold.lastUpdate,
        country: newsCache.gold.country,
        articlesCount: newsCache.gold.data?.length || 0,
      },
    },
  });
});

// Obtenir les actualités
app.get('/news/:type', async (c) => {
  const type = c.req.param('type');
  
  if (!SEARCH_QUERIES[type]) {
    return c.json({ error: 'Type invalide. Utilisez "crypto" ou "gold"' }, 400);
  }

  // Rafraîchir si nécessaire
  if (shouldRefreshCache(type)) {
    await updateCache(type, newsCache[type].country);
  }

  const cache = newsCache[type];
  
  return c.json({
    type: type,
    country: cache.country,
    lastUpdate: cache.lastUpdate,
    count: cache.data?.length || 0,
    news: cache.data || [],
  });
});

// Changer le type d'info (force la mise à jour)
app.post('/config/type/:type', async (c) => {
  const type = c.req.param('type');
  
  if (!SEARCH_QUERIES[type]) {
    return c.json({ error: 'Type invalide. Utilisez "crypto" ou "gold"' }, 400);
  }

  await updateCache(type, newsCache[type].country);
  
  return c.json({
    message: `Cache ${type} mis à jour`,
    type: type,
    country: newsCache[type].country,
    lastUpdate: newsCache[type].lastUpdate,
    articlesCount: newsCache[type].data?.length || 0,
  });
});

// Changer le pays pour un type
app.post('/config/country/:type/:country', async (c) => {
  const type = c.req.param('type');
  const country = c.req.param('country');
  
  if (!SEARCH_QUERIES[type]) {
    return c.json({ error: 'Type invalide. Utilisez "crypto" ou "gold"' }, 400);
  }

  // Codes pays valides (liste non exhaustive)
  const validCountries = ['us', 'fr', 'uk', 'de', 'ca', 'jp', 'cn', 'in', 'br', 'au'];
  if (!validCountries.includes(country.toLowerCase())) {
    return c.json({ 
      error: 'Code pays invalide',
      validCountries: validCountries,
    }, 400);
  }

  await updateCache(type, country.toLowerCase());
  
  return c.json({
    message: `Pays changé pour ${type}`,
    type: type,
    country: country.toLowerCase(),
    lastUpdate: newsCache[type].lastUpdate,
    articlesCount: newsCache[type].data?.length || 0,
  });
});

// Pour Cloudflare Workers
export default {
  fetch: app.fetch,
  // Scheduled handler pour les mises à jour automatiques
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      Promise.all([
        updateCache('crypto', newsCache.crypto.country),
        updateCache('gold', newsCache.gold.country),
      ])
    );
  },
};

// Pour les environnements Node.js/Bun
// export default app;