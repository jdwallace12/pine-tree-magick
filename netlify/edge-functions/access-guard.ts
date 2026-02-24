import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Helper: Manually decode JWT from cookie as fallback
  // This is needed because Netlify Identity context can be unreliable in edge functions
  const getRolesFromCookie = () => {
    try {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/nf_jwt=([^;]+)/);
      if (!match) return [];
      
      const token = match[1];
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return [];
      
      // Edge functions support atob
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")));
      return (payload.app_metadata && payload.app_metadata.roles) || [];
    } catch (e) {
      console.error("[Edge Guard] Manual decode failed:", e.message);
      return [];
    }
  };

  // v23:70 Deep Diagnostic Route
  if (path === "/courses/debug-access") {
    const user = context.user;
    const cookieHeader = request.headers.get("cookie") || "";
    const hasNfJwt = cookieHeader.includes("nf_jwt=");
    const cookieRoles = getRolesFromCookie();
    
    const headersObj: Record<string, string> = {};
    request.headers.forEach((v, k) => {
      headersObj[k] = v;
    });

    return new Response(JSON.stringify({
      status: "OK",
      version: "v23:70",
      path: path,
      user: user ? {
        email: user.email,
        roles: user.app_metadata?.roles || [],
      } : "ANONYMOUS",
      manual_cookie_roles: cookieRoles,
      cookies: {
        present: !!cookieHeader,
        hasNfJwt: hasNfJwt,
        count: cookieHeader.split(";").length
      },
      headers: headersObj
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // Protect lesson paths: /courses/[slug]/[lesson]
  const lessonMatch = path.match(/^\/courses\/([^\/]+)\/([^\/]+)\/?$/);
  
  if (!lessonMatch) {
    return;
  }

  const courseSlug = lessonMatch[1];
  
  // Try context first, then fallback to manual cookie decode
  const user = context.user;
  let roles = user?.app_metadata?.roles || [];
  
  let source = "context";
  if (roles.length === 0) {
    roles = getRolesFromCookie();
    source = "cookie_fallback";
  }
  
  const requiredRoleColon = `course:${courseSlug}`;
  const requiredRoleDash = `course-${courseSlug}`;

  const hasAccess = roles.some((role: string) => 
    role === requiredRoleColon || role === requiredRoleDash
  );

  console.log(`[Edge Guard v23:70] Path: ${path} | User: ${user?.email || "Anonymous"} | Roles Source: ${source} | Access: ${hasAccess ? "GRANTED" : "DENIED"}`);

  if (!hasAccess) {
    const returnTo = encodeURIComponent(path);
    return Response.redirect(`${url.origin}/access-denied?returnTo=${returnTo}&edge_guard=v23_70&source=${source}`, 302);
  }

  // Authorized
  return;
};

export const config = {
  path: "/courses/*"
};
