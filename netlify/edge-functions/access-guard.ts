import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // v23:65 Deep Diagnostic Route
  if (path === "/courses/debug-access") {
    const user = context.user;
    const cookieHeader = request.headers.get("cookie") || "";
    const hasNfJwt = cookieHeader.includes("nf_jwt=");
    
    // Most compatible way to build a header object
    const headersObj: Record<string, string> = {};
    request.headers.forEach((v, k) => {
      headersObj[k] = v;
    });

    return new Response(JSON.stringify({
      status: "OK",
      version: "v23:65",
      path: path,
      user: user ? {
        email: user.email,
        roles: user.app_metadata?.roles || [],
      } : "ANONYMOUS",
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
  const user = context.user;
  
  const requiredRoleColon = `course:${courseSlug}`;
  const requiredRoleDash = `course-${courseSlug}`;

  const roles = user?.app_metadata?.roles || [];
  const hasAccess = roles.some((role: string) => 
    role === requiredRoleColon || role === requiredRoleDash
  );

  console.log(`[Edge Guard v23:65] Path: ${path} | User: ${user?.email || "Anonymous"} | Access: ${hasAccess ? "GRANTED" : "DENIED"}`);

  if (!hasAccess) {
    const returnTo = encodeURIComponent(path);
    return Response.redirect(`${url.origin}/access-denied?returnTo=${returnTo}&edge_guard=v23_65`, 302);
  }

  // Authorized
  return;
};

export const config = {
  path: "/courses/*"
};
