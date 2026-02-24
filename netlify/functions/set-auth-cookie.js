exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { token } = JSON.parse(event.body || "{}");
    if (!token) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing token" }) };
    }

    // Set the cookie via header - this bypasses JS-level blocking
    // Using the standardized format that worked in v21:40 diagnostics
    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `nf_jwt=${token}; Path=/; Max-Age=3600; SameSite=Lax`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
