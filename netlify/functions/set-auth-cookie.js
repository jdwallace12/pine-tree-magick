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

    // Decoding for diagnostics
    const decode = (t) => {
      try {
        const base64Url = t.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(Buffer.from(base64, 'base64').toString());
      } catch (e) { return { error: e.message }; }
    };
    const claims = decode(token);
    let roles = (claims.app_metadata && claims.app_metadata.roles) || [];

    // v23:40 Standardized Dual Roles
    // We provide roles in both dash and colon formats for zero-downtime transition.
    const newRoles = roles.map(r => r.includes(':') ? r.replace(':', '-') : r);
    const combinedRoles = [...new Set([...roles, ...newRoles])];
    
    // Injecting standardized roles into a spoofed JWT for the CDN
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64").replace(/=/g, "");
    const payload = Buffer.from(JSON.stringify({
       ...claims,
       app_metadata: { ...claims.app_metadata, roles: combinedRoles }
    })).toString("base64").replace(/=/g, "");
    
    // We use the original signature since we can't re-sign without the secret, 
    // but Netlify CDN checks roles in the payload. Note: If CDN checks signature, this spoof might fail.
    // However, the best way is to trust the original token IF it already has the roles.
    
    const finalToken = token; // Keeping original token to ensure signature validity

    // v23:40 Nuclear Cookie Clear + Clean Syntax
    const killers = [
      `nf_jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `nf_jwt=; Path=/; Max-Age=0`
    ];

    const theOne = `nf_jwt=${finalToken}; path=/; SameSite=Lax; Secure`;

    // Cache-buster for the return URL
    const sep = returnTo.includes('?') ? '&' : '?';
    const busterReturnTo = `${returnTo}${sep}cb=${Date.now()}`;

    return {
      statusCode: 200,
      multiValueHeaders: {
        "Set-Cookie": [...killers, theOne, `bridge_v=23_40; path=/; Max-Age=300`]
      },
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Bridge v23:40</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0fdf4; color: #166534; padding: 1rem; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); width: 100%; max-width: 500px; text-align: left; }
            h1 { font-size: 1.25rem; margin: 0 0 1rem; color: #16a34a; text-align: center; }
            .section { margin-bottom: 1.5rem; padding: 1rem; background: #f0fdf4; border-radius: 0.5rem; border: 1px solid #bbf7d0; }
            .label { font-size: 11px; font-weight: bold; color: #15803d; text-transform: uppercase; margin-bottom: 0.5rem; }
            .value { font-family: monospace; font-size: 12px; word-break: break-all; white-space: pre-wrap; color: #14532d; }
            .btn { display: block; background: #16a34a; color: white; padding: 1rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; text-align: center; margin-top: 1rem; font-size: 1.1rem; }
            .btn:hover { background: #15803d; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #dcfce7; color: #166534; font-size: 10px; margin-right: 4px; border: 1px solid #86efac; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Diagnostic Bridge v23:40</h1>
            
            <div class="section">
              <div class="label">v23:40 Standardization</div>
              <div class="value">Redirects standardized to use Single Spaces and Dash-Roles (course-slug).</div>
            </div>

            <div class="section">
              <div class="label">Roles in Token</div>
              <div class="value">${roles.map(r => `<span class="badge">${r}</span>`).join('') || 'NONE'}</div>
            </div>

            <a href="${busterReturnTo}" class="btn">FINAL STEP: Enter Course</a>
            <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 1rem;">Cache-Buster Active: <strong>${Date.now()}</strong></p>

            <script>
              setTimeout(() => {
                const hasNf = document.cookie.indexOf('nf_jwt=') !== -1;
                if (!hasNf) alert("Security Cookie could not be set. Please check browser settings.");
              }, 800);
            </script>
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
