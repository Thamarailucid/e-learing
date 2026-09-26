export interface Course {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  thumbnail_url?: string;
  level: string;
  category: string;
  status: string;
  is_published: boolean;
  min_video_watch_percentage: number;
  pass_quiz_percentage: number;
  total_lessons_count?: number;
  total_enrolled_students?: number;
  author_first_name?: string;
  author_last_name?: string;
  sections?: CourseSection[];
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  content_type: 'VIDEO' | 'DOCUMENT' | 'ARTICLE';
  video_url?: string;
  video_duration_seconds?: number;
  article_content?: string;
  document_url?: string;
  order_index: number;
  is_free_preview: boolean;
}

export interface InteractiveQuestion {
  id: string;
  lesson_id: string;
  timestamp_seconds: number;
  question_text: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  display_mode: string;
}
