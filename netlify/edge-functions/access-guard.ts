import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only protect specific lesson paths: /courses/[slug]/[lesson]
  // We allow /courses and /courses/[slug] (overview) to be public
  const lessonMatch = path.match(/^\/courses\/([^\/]+)\/([^\/]+)\/?$/);
  
  // Skip if not a course lesson or if it is the overview page
  if (!lessonMatch) {
    return;
  }

  const courseSlug = lessonMatch[1];
  const lessonSlug = lessonMatch[2];

  // Logic: Check if user has the required role
  // Netlify Edge Functions provide 'context.user' automatically
  const user = context.user;
  
  // Check for dual role format compatibility (v23:60)
  const requiredRoleColon = `course:${courseSlug}`;
  const requiredRoleDash = `course-${courseSlug}`;

  const hasAccess = user?.app_metadata?.roles?.some((role: string) => 
    role === requiredRoleColon || role === requiredRoleDash
  );

  console.log(`[Edge Guard v23:60] Path: ${path} | User: ${user?.email || "Anonymous"} | Access: ${hasAccess ? "GRANTED" : "DENIED"}`);

  if (!hasAccess) {
    const returnTo = encodeURIComponent(path);
    return Response.redirect(`${url.origin}/access-denied?returnTo=${returnTo}&edge_v=23_60`, 302);
  }

  // If authorized, let the request proceed to the origin (Astro)
  return;
};

export const config = {
  path: "/courses/*",
  excludedPath: [
    "/courses",
    "/courses/",
    "/courses/[^/]+/?$" // Exclude course landing pages
  ],
};
