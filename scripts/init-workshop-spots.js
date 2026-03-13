import { getStore } from '@netlify/blobs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.development if available
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
dotenv.config(); // fallback to .env

const WORKSHOP_SLUG = process.argv[2];
const INITIAL_COUNT = process.argv[3];

if (!WORKSHOP_SLUG || !INITIAL_COUNT) {
  console.error('Usage: node scripts/init-workshop-spots.js <workshop-slug> <initial-count>');
  console.error('Example: node scripts/init-workshop-spots.js candle-magick 10');
  process.exit(1);
}

if (!process.env.NETLIFY_SITE_ID || !process.env.NETLIFY_ACCESS_TOKEN) {
  console.error('❌ Error: NETLIFY_SITE_ID and NETLIFY_ACCESS_TOKEN must be set in your environment or .env file');
  process.exit(1);
}

async function initSpots() {
  try {
    console.log(`Setting ${WORKSHOP_SLUG} reservations to ${INITIAL_COUNT}...`);
    
    // Create configured store instance
    const store = getStore({
      name: 'workshops',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_ACCESS_TOKEN,
    });
    
    await store.set(WORKSHOP_SLUG, INITIAL_COUNT.toString());
    
    const verify = await store.get(WORKSHOP_SLUG);
    console.log(`✅ Success! Workshop '${WORKSHOP_SLUG}' now has ${verify} reservations registered in Netlify Blobs.`);
  } catch (err) {
    console.error('❌ Failed to set workshop spots. Error details:');
    console.error(err.message || err);
  }
}

initSpots();
