import { supabase } from './supabase';
import type { CoursePurchase, UserProgress } from './supabase';

export async function getUserCourses(userId: string) {
  const { data, error } = await supabase
    .from('course_purchases')
    .select(`
      *,
      courses (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active');
    
  if (error) throw error;
  return data as (CoursePurchase & { courses: any })[];
}

export async function checkCourseAccess(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from('course_purchases')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .single();
    
  if (error) return false;
  return !!data;
}

export async function getCourseProgress(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId);
    
  if (error) throw error;
  return data as UserProgress[];
}

export async function markLessonComplete(userId: string, courseId: string, lessonId: string) {
  const { data, error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    });
    
  if (error) throw error;
  return data;
}

export async function getCourseProgressPercentage(userId: string, courseId: string, totalLessons: number) {
  const progress = await getCourseProgress(userId, courseId);
  const completedLessons = progress.filter(p => p.completed).length;
  return Math.round((completedLessons / totalLessons) * 100);
} 