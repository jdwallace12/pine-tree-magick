// netlify/functions/workshop-spots.js
// Returns the number of remaining spots for a workshop by counting Netlify form submissions.

const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;

// Workshop configuration: maps slug → { title (must match form "Product" field), maxParticipants, reservedSpots }
// reservedSpots: number of spots already sold outside the form system (e.g. in person, email, etc.)
const WORKSHOP_CONFIG = {
  'candle-magick': { title: 'Candle Magick Workshop', maxParticipants: 12, reservedSpots: 10 },
};

/**
 * Count form submissions for a specific workshop by querying the Netlify Forms API.
 * Looks for submissions to the "workshops" form where the "Product" field matches the workshop title.
 */
async function countSubmissions(workshopTitle) {
  if (!NETLIFY_ACCESS_TOKEN || !NETLIFY_SITE_ID) {
    console.error('❌ Missing NETLIFY_ACCESS_TOKEN or NETLIFY_SITE_ID');
    return 0;
  }

  try {
    // 1. Get all forms for the site to find the "workshops" form ID
    const formsRes = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/forms`, {
      headers: { Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}` },
    });

    if (!formsRes.ok) {
      console.error('❌ Failed to fetch forms:', await formsRes.text());
      return 0;
    }

    const forms = await formsRes.json();
    const workshopForm = forms.find((f) => f.name === 'workshops');

    if (!workshopForm) {
      console.warn('⚠️ No "workshops" form found. Returning 0 submissions.');
      return 0;
    }

    // 2. Get all submissions for the workshops form
    // Netlify API paginates at 100 per page by default. For workshops with ≤12 spots, one page is enough.
    const subsRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${workshopForm.id}/submissions?per_page=100`,
      {
        headers: { Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}` },
      }
    );

    if (!subsRes.ok) {
      console.error('❌ Failed to fetch submissions:', await subsRes.text());
      return 0;
    }

    const submissions = await subsRes.json();

    // 3. Count submissions where the "Product" field matches the workshop title
    const count = submissions.filter((sub) => {
      const product = sub.data?.Product || sub.data?.product || '';
      return product === workshopTitle;
    }).length;

    console.log(`📊 Workshop "${workshopTitle}": ${count} submissions found`);
    return count;
  } catch (err) {
    console.error('❌ Error counting submissions:', err);
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

  const formSubmissions = await countSubmissions(config.title);
  const signupCount = formSubmissions + (config.reservedSpots || 0);
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
