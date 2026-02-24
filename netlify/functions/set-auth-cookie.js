exports.handler = async (event) => {
  try {
    let token = "";
    let returnTo = "/";

    // Support both POST (fetch) and GET (Manual Link)
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      token = data.token;
      returnTo = data.returnTo || "/";
    } else {
      token = event.queryStringParameters.token;
      returnTo = event.queryStringParameters.returnTo || "/";
    }

    if (!token) {
      return { 
        statusCode: 400, 
        headers: { "Content-Type": "text/html" },
        body: "<h1>Missing Token</h1><p>Please go back to the course and sign in again.</p>" 
      };
    }

    // Manual Entry Bridge v23:05
    // We set the cookie with explicit Secure; Path=/; SameSite=Lax
    const cookieHeader = `nf_jwt=${token}; Path=/; SameSite=Lax; Secure`;
    const debugCookie = `bridge_ready=v23_05; Path=/; Max-Age=300; SameSite=Lax; Secure`;

    return {
      statusCode: 200,
      // Fix: Use multiValueHeaders for multiple Set-Cookie headers on Netlify/Lambda
      multiValueHeaders: {
        "Set-Cookie": [cookieHeader, debugCookie]
      },
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Bridge</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; text-align: center; }
            .card { background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); max-width: 400px; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #10b981; }
            p { color: #64748b; line-height: 1.5; margin-bottom: 2rem; }
            .btn { display: inline-block; background: #10b981; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; transition: opacity 0.2s; }
            .btn:hover { opacity: 0.9; }
            .debug { margin-top: 2rem; font-size: 10px; color: #cbd5e1; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Ready to Enter!</h1>
            <p>Access Token has been pushed to your browser via a secure server header.</p>
            <a href="${returnTo}" class="btn">Click Here to Enter Course</a>
            <div class="debug">v23:05 | Bridge: ACTIVE | Token: ${token.substring(0, 10)}...</div>
          </div>
        </body>
        </html>
      `,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: `<h1>Internal Error</h1><p>${err.message}</p>`,
    };
  }
};
