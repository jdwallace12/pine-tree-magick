import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Helper: Manually decode JWT from cookie as fallback
  // Essential because Netlify context can be inconsistent at the network edge
  const getRolesFromCookie = () => {
    try {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/nf_jwt=([^;]+)/);
      if (!match) return [];
      
      const token = match[1];
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return [];
      
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")));
      return (payload.app_metadata && payload.app_metadata.roles) || [];
    } catch (e) {
      return [];
    }
  };

  // Protect lesson paths: /courses/[slug]/[lesson]
  const lessonMatch = path.match(/^\/courses\/([^\/]+)\/([^\/]+)\/?$/);
  if (!lessonMatch) return;

  const courseSlug = lessonMatch[1];
  const user = context.user;
  
  // Deterministic Role Check: Try context, fallback to raw cookie parse
  let roles = user?.app_metadata?.roles || [];
  if (roles.length === 0) {
    roles = getRolesFromCookie();
  }
  
  const requiredRoleColon = `course:${courseSlug}`;
  const requiredRoleDash = `course-${courseSlug}`;

  const hasAccess = roles.some((role: string) => 
    role === requiredRoleColon || role === requiredRoleDash
  );

  if (!hasAccess) {
    const returnTo = encodeURIComponent(path);
    // Stable v24:00 Access Control
    return Response.redirect(`${url.origin}/access-denied?returnTo=${returnTo}&auth=v24`, 302);
  }

  return;
};

export const config = {
  path: "/courses/*"
};
