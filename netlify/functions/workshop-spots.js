// netlify/functions/workshop-spots.js
import { getStore } from '@netlify/blobs';

// Workshop configuration: maps slug → { title, maxParticipants }
const WORKSHOP_CONFIG = {
  'candle-magick': { title: 'Candle Magick Workshop', maxParticipants: 12 },
};

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

  const config = WORKSHOP_CONFIG[workshopSlug];

  if (!config) {
    return new Response(
      JSON.stringify({ error: `Unknown workshop: ${workshopSlug}` }),
      { status: 404, headers }
    );
  }

  const signupCount = await getSubmissions(workshopSlug);
  const spotsRemaining = Math.max(0, config.maxParticipants - signupCount);
  const soldOut = spotsRemaining === 0;

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
