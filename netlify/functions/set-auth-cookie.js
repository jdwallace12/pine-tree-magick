exports.handler = async (event) => {
  try {
    let token = "";
    let returnTo = "/";

    // Support both POST (fetch) and GET (302 redirect)
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      token = data.token;
      returnTo = data.returnTo || "/";
    } else {
      token = event.queryStringParameters.token;
      returnTo = event.queryStringParameters.returnTo || "/";
    }

    if (!token) {
      return { statusCode: 400, body: "Missing token" };
    }

    // FIX: Using backticks for extraction of variable. 
    // PREVIOUS: "nf_jwt=${token}" was literal text.
    const cookie = `nf_jwt=${token}; Path=/; Max-Age=3600; SameSite=Lax`;

    return {
      statusCode: 302,
      headers: {
        "Set-Cookie": cookie,
        "Location": returnTo,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: `Redirecting to ${returnTo}...`,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};
