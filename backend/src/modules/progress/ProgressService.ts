import { executeQuery } from '../../database/connection';
import { EnvironmentConfig } from '../../config/environment';
import { ApiError } from '../../utils/ApiError';

export class ProgressService {
  private schema = EnvironmentConfig.database.schema;

  async SaveStudentVideoWatchProgress(organizationId: string, userId: string, data: {
    lessonId: string;
    lastPositionSeconds: number;
    watchPercentage: number;
  }) {
    const lessonRes = await executeQuery(
      `SELECT course_id FROM ${this.schema}.lessons WHERE id = $1 AND organization_id = $2`,
      [data.lessonId, organizationId]
    );
    if (lessonRes.rowCount === 0) throw ApiError.notFound('Lesson not found.');
    const { course_id } = lessonRes.rows[0];

    const isCompleted = data.watchPercentage >= 80;

    await executeQuery(
      `INSERT INTO ${this.schema}.student_lesson_progress (
        organization_id, user_id, lesson_id, is_completed, last_position_seconds, watch_percentage, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (organization_id, user_id, lesson_id) DO UPDATE SET
        last_position_seconds = EXCLUDED.last_position_seconds,
        watch_percentage = GREATEST(${this.schema}.student_lesson_progress.watch_percentage, EXCLUDED.watch_percentage),
        is_completed = (${this.schema}.student_lesson_progress.is_completed OR EXCLUDED.is_completed),
        completed_at = CASE WHEN ${this.schema}.student_lesson_progress.is_completed THEN ${this.schema}.student_lesson_progress.completed_at ELSE EXCLUDED.completed_at END`,
      [
        organizationId,
        userId,
        data.lessonId,
        isCompleted,
        data.lastPositionSeconds,
        data.watchPercentage,
        isCompleted ? new Date() : null,
      ]
    );

    // Recalculate Course Progress with current lesson reference
    await this.RecalculateCourseProgress(organizationId, userId, course_id, data.lessonId, data.lastPositionSeconds);

    return {
      lessonId: data.lessonId,
      watchPercentage: data.watchPercentage,
      isCompleted,
    };
  }

  async SetActiveLesson(organizationId: string, userId: string, courseId: string, lessonId: string) {
    const lessonRes = await executeQuery(
      `SELECT id, title, video_duration_seconds FROM ${this.schema}.lessons WHERE id = $1 AND course_id = $2`,
      [lessonId, courseId]
    );
    if (lessonRes.rowCount === 0) throw ApiError.notFound('Lesson not found.');

    const posRes = await executeQuery(
      `SELECT last_position_seconds FROM ${this.schema}.student_lesson_progress
       WHERE organization_id = $1 AND user_id = $2 AND lesson_id = $3`,
      [organizationId, userId, lessonId]
    );
    const lastPos = posRes.rows[0]?.last_position_seconds || 0;

    await executeQuery(
      `INSERT INTO ${this.schema}.student_course_progress (
        organization_id, user_id, course_id, last_lesson_id, last_position_seconds, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (organization_id, user_id, course_id) DO UPDATE SET
        last_lesson_id = EXCLUDED.last_lesson_id,
        last_position_seconds = EXCLUDED.last_position_seconds,
        last_activity_at = CURRENT_TIMESTAMP`,
      [organizationId, userId, courseId, lessonId, lastPos]
    );

    return {
      courseId,
      lessonId,
      lessonTitle: lessonRes.rows[0].title,
      lastPositionSeconds: lastPos,
    };
  }

  async MarkLessonAsCompleted(organizationId: string, userId: string, lessonId: string) {
    const lessonRes = await executeQuery(
      `SELECT course_id FROM ${this.schema}.lessons WHERE id = $1 AND organization_id = $2`,
      [lessonId, organizationId]
    );
    if (lessonRes.rowCount === 0) throw ApiError.notFound('Lesson not found.');
    const { course_id } = lessonRes.rows[0];

    await executeQuery(
      `INSERT INTO ${this.schema}.student_lesson_progress (
        organization_id, user_id, lesson_id, is_completed, watch_percentage, completed_at
      ) VALUES ($1, $2, $3, TRUE, 100.00, CURRENT_TIMESTAMP)
      ON CONFLICT (organization_id, user_id, lesson_id) DO UPDATE SET
        is_completed = TRUE,
        watch_percentage = 100.00,
        completed_at = COALESCE(${this.schema}.student_lesson_progress.completed_at, CURRENT_TIMESTAMP)`,
      [organizationId, userId, lessonId]
    );

    await this.RecalculateCourseProgress(organizationId, userId, course_id, lessonId);

    return { lessonId, isCompleted: true };
  }

  private async RecalculateCourseProgress(
    organizationId: string,
    userId: string,
    courseId: string,
    lastLessonId?: string,
    lastPositionSeconds?: number
  ) {
    const totalLessonsRes = await executeQuery(
      `SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`,
      [courseId]
    );
    const totalLessons = parseInt(totalLessonsRes.rows[0].count, 10) || 1;

    const statsRes = await executeQuery(
      `SELECT 
         COUNT(CASE WHEN slp.is_completed = TRUE THEN 1 END) as completed_count,
         COALESCE(SUM(LEAST(100.0, slp.watch_percentage)), 0) as total_watch_pct
       FROM ${this.schema}.lessons l
       LEFT JOIN ${this.schema}.student_lesson_progress slp 
         ON slp.lesson_id = l.id AND slp.user_id = $2
       WHERE l.course_id = $1`,
      [courseId, userId]
    );
    const completedLessons = parseInt(statsRes.rows[0]?.completed_count, 10) || 0;
    const totalWatchPct = parseFloat(statsRes.rows[0]?.total_watch_pct) || 0;

    let progressPercentage = Math.min(100, Math.round((totalWatchPct / totalLessons) * 100) / 100);
    const isCourseCompleted = completedLessons >= totalLessons;
    if (isCourseCompleted) {
      progressPercentage = 100;
    }

    await executeQuery(
      `INSERT INTO ${this.schema}.student_course_progress (
        organization_id, user_id, course_id, completed_lessons_count, total_lessons_count,
        progress_percentage, is_completed, completed_at, last_activity_at, last_lesson_id, last_position_seconds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10)
      ON CONFLICT (organization_id, user_id, course_id) DO UPDATE SET
        completed_lessons_count = EXCLUDED.completed_lessons_count,
        total_lessons_count = EXCLUDED.total_lessons_count,
        progress_percentage = EXCLUDED.progress_percentage,
        is_completed = EXCLUDED.is_completed,
        completed_at = CASE WHEN ${this.schema}.student_course_progress.is_completed THEN ${this.schema}.student_course_progress.completed_at ELSE EXCLUDED.completed_at END,
        last_activity_at = CURRENT_TIMESTAMP,
        last_lesson_id = COALESCE(EXCLUDED.last_lesson_id, ${this.schema}.student_course_progress.last_lesson_id),
        last_position_seconds = COALESCE(EXCLUDED.last_position_seconds, ${this.schema}.student_course_progress.last_position_seconds)`,
      [
        organizationId,
        userId,
        courseId,
        completedLessons,
        totalLessons,
        progressPercentage,
        isCourseCompleted,
        isCourseCompleted ? new Date() : null,
        lastLessonId || null,
        lastPositionSeconds || 0,
      ]
    );

    if (isCourseCompleted) {
      await executeQuery(
        `UPDATE ${this.schema}.enrollments SET completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE organization_id = $1 AND user_id = $2 AND course_id = $3`,
        [organizationId, userId, courseId]
      );
    }
  }

  async GetStudentCourseProgress(organizationId: string, userId: string, courseId: string) {
    const progressRes = await executeQuery(
      `SELECT scp.*, l.title as last_lesson_title, l.order_index as last_lesson_order
       FROM ${this.schema}.student_course_progress scp
       LEFT JOIN ${this.schema}.lessons l ON l.id = scp.last_lesson_id
       WHERE scp.organization_id = $1 AND scp.user_id = $2 AND scp.course_id = $3`,
      [organizationId, userId, courseId]
    );

    const lessonProgressRes = await executeQuery(
      `SELECT slp.lesson_id, slp.is_completed, slp.last_position_seconds, slp.watch_percentage
       FROM ${this.schema}.student_lesson_progress slp
       JOIN ${this.schema}.lessons l ON l.id = slp.lesson_id
       WHERE l.course_id = $1 AND slp.user_id = $2 AND slp.organization_id = $3`,
      [courseId, userId, organizationId]
    );

    return {
      courseProgress: progressRes.rows[0] || {
        progress_percentage: 0,
        completed_lessons_count: 0,
        is_completed: false,
      },
      lessonProgress: lessonProgressRes.rows,
    };
  }

  async CheckCourseCompletionEligibility(organizationId: string, userId: string, courseId: string) {
    const progressRes = await executeQuery(
      `SELECT is_completed, progress_percentage FROM ${this.schema}.student_course_progress
       WHERE organization_id = $1 AND user_id = $2 AND course_id = $3`,
      [organizationId, userId, courseId]
    );

    const isEligible = progressRes.rows[0]?.is_completed === true;
    return {
      courseId,
      isEligible,
      progressPercentage: progressRes.rows[0]?.progress_percentage || 0,
    };
  }
}

export const progressService = new ProgressService();
