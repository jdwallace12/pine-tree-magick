// netlify/functions/workshop-spots.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStore } from '@netlify/blobs';

// Cache for workshop config loaded from build-generated JSON
let WORKSHOP_CONFIG_CACHE = null;

/**
 * Load workshop config from the JSON file generated at build time
 * by scripts/generate-workshop-slugs.js.
 * Returns a map of { slug: { title, maxParticipants } }
 */
function getWorkshopConfig() {
  if (WORKSHOP_CONFIG_CACHE) {
    return WORKSHOP_CONFIG_CACHE;
  }

  const functionDir = path.dirname(fileURLToPath(import.meta.url));
  const jsonPath = path.join(functionDir, 'workshop-slugs.json');

  const altPaths = [
    jsonPath,
    path.join(process.cwd(), 'netlify/functions/workshop-slugs.json'),
    path.join(process.cwd(), 'workshop-slugs.json'),
  ];

  let config = {};
  let found = false;

  for (const altPath of altPaths) {
    try {
      if (fs.existsSync(altPath)) {
        const raw = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
        // raw is { "Workshop Title": { slug, maxParticipants } }
        // Re-key by slug for easy lookup: { "candle-magick": { title, maxParticipants } }
        for (const [title, data] of Object.entries(raw)) {
          config[data.slug] = { title, maxParticipants: data.maxParticipants };
        }
        console.log(`✅ Loaded workshop config from: ${altPath}`);
        console.log(`📊 Workshops: ${Object.keys(config).join(', ')}`);
        found = true;
        break;
      }
    } catch (err) {
      console.warn(`⚠️ Error reading ${altPath}:`, err.message);
    }
  }

  if (!found) {
    console.error(`❌ Workshop slugs file not found. Tried:`, altPaths);
    console.error(`❌ Make sure to run 'npm run generate-workshop-slugs' during build`);
  }

  WORKSHOP_CONFIG_CACHE = config;
  return config;
}

/**
 * Get the current signup count from Netlify Blobs.
 */
async function getSubmissions(workshopSlug) {
  try {
    const store = getStore({
      name: 'workshops',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_ACCESS_TOKEN,
    });
    const count = await store.get(workshopSlug);
    return count ? parseInt(count, 10) : 0;
  } catch (err) {
    console.error(`❌ Error reading blob for ${workshopSlug}:`, err);
    return 0;
  }
}

export default async function handler(req) {
  // CORS headers for client-side fetch
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers });
  }

  const url = new URL(req.url);
  const workshopSlug = url.searchParams.get('workshop');

  if (!workshopSlug) {
    return new Response(
      JSON.stringify({ error: 'Missing "workshop" query parameter' }),
      { status: 400, headers }
    );
  }

  const WORKSHOP_CONFIG = getWorkshopConfig();
  const config = WORKSHOP_CONFIG[workshopSlug];

  if (!config) {
    return new Response(
      JSON.stringify({ error: `Unknown workshop: ${workshopSlug}` }),
      { status: 404, headers }
    );
  }

  const signupCount = await getSubmissions(workshopSlug);
  const spotsRemaining = config.maxParticipants != null
    ? Math.max(0, config.maxParticipants - signupCount)
    : null;
  const soldOut = spotsRemaining != null ? spotsRemaining === 0 : false;

  return new Response(
    JSON.stringify({
      workshop: workshopSlug,
      maxSpots: config.maxParticipants,
      signupCount,
      spotsRemaining,
      soldOut,
    }),
    { status: 200, headers }
  );
}
