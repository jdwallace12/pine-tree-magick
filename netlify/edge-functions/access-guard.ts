import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Helper: Manually decode JWT from cookie as fallback
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
  const lessonSlug = lessonMatch[2];

  // FREE LESSON BYPASS (v24:30)
  // These lessons are accessible to anyone regardless of role or login
  const FREE_LESSONS = [
    '/courses/magickal-foundations/intro-to-ritual',
    '/courses/chakra-mastery/m1-l1'
  ];

  if (FREE_LESSONS.includes(path.replace(/\/$/, ""))) {
    console.log(`[Edge Guard v24:30] FREE ACCESS GRANTED: ${path}`);
    return;
  }

  const user = context.user;
  
  // Deterministic Role Check
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
    return Response.redirect(`${url.origin}/access-denied?returnTo=${returnTo}&auth=v24_30`, 302);
  }

  return;
};

export const config = {
  path: "/courses/*"
};
