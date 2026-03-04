/**
 * Utility for tracking lesson progress using localStorage and Netlify Identity.
 */

const STORAGE_PREFIX = 'ptm_progress_';

declare global {
  interface Window {
    netlifyIdentity: {
      currentUser: () => {
        id: string;
        user_metadata: {
          full_name?: string;
          progress?: Record<string, string[]>;
        };
        update: (data: { data: unknown }) => Promise<void>;
      } | null;
      init: (options?: unknown) => void;
      open: (tab?: string) => void;
      close: () => void;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
    };
    __lessonListenersAdded?: boolean;
    initProgress?: () => void;
  }
}

// Define the shape of our progress data
export interface CourseProgress {
  completed: string[]; // Array of lesson slugs
}

/**
 * Gets the completed lessons for a specific course.
 * Merges localStorage with Netlify Identity metadata if available.
 */
export function getCompletedLessons(courseSlug: string): string[] {
  if (typeof window === 'undefined') return [];

  const localKey = `${STORAGE_PREFIX}${courseSlug}`;
  let completed: string[] = [];

  // 1. Try to get from localStorage
  try {
    const stored = localStorage.getItem(localKey);
    if (stored) {
      completed = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse local progress:', e);
  }

  // 2. Try to merge from Netlify Identity if available
  // Note: This is an additive merge to ensure no progress is lost if offline/logged out
  if (window.netlifyIdentity) {
    const user = window.netlifyIdentity.currentUser();
    const remoteProgress = user?.user_metadata?.progress?.[courseSlug] || [];
    
    // Merge and deduplicate
    completed = [...new Set([...completed, ...remoteProgress])];
    
    // Keep localStorage in sync if we got new data from remote
    localStorage.setItem(localKey, JSON.stringify(completed));
  }

  return completed;
}

/**
 * Marks a lesson as complete for a course.
 */
export async function markLessonComplete(courseSlug: string, lessonSlug: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const completed = getCompletedLessons(courseSlug);
  if (!completed.includes(lessonSlug)) {
    completed.push(lessonSlug);
    await saveProgress(courseSlug, completed);
  }
}

/**
 * Marks a lesson as incomplete for a course.
 */
export async function markLessonIncomplete(courseSlug: string, lessonSlug: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const completed = getCompletedLessons(courseSlug);
  const index = completed.indexOf(lessonSlug);
  if (index > -1) {
    completed.splice(index, 1);
    await saveProgress(courseSlug, completed);
  }
}

/**
 * Internal helper to save progress to both local and remote storage.
 */
async function saveProgress(courseSlug: string, completed: string[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const localKey = `${STORAGE_PREFIX}${courseSlug}`;
  
  // 1. Save to localStorage
  localStorage.setItem(localKey, JSON.stringify(completed));

  // 2. Save to Netlify Identity if logged in
  if (window.netlifyIdentity) {
    const user = window.netlifyIdentity.currentUser();
    if (user) {
      const currentProgress = user.user_metadata?.progress || {};
      const updatedMetadata = {
        progress: {
          ...currentProgress,
          [courseSlug]: completed
        }
      };

      try {
        await user.update({ data: updatedMetadata });
        console.log('✅ Progress synced to Netlify Identity');
      } catch (e) {
        console.error('❌ Failed to sync progress to Netlify Identity:', e);
      }
    }
  }
}

/**
 * Calculates the progress percentage for a course.
 */
export function calculateProgress(completedCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
}
