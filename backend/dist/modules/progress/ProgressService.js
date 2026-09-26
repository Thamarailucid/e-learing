"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressService = exports.ProgressService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const ApiError_1 = require("../../utils/ApiError");
class ProgressService {
    schema = environment_1.EnvironmentConfig.database.schema;
    async SaveStudentVideoWatchProgress(organizationId, userId, data) {
        const lessonRes = await (0, connection_1.executeQuery)(`SELECT course_id FROM ${this.schema}.lessons WHERE id = $1 AND organization_id = $2`, [data.lessonId, organizationId]);
        if (lessonRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Lesson not found.');
        const { course_id } = lessonRes.rows[0];
        const isCompleted = data.watchPercentage >= 80;
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.student_lesson_progress (
        organization_id, user_id, lesson_id, is_completed, last_position_seconds, watch_percentage, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (organization_id, user_id, lesson_id) DO UPDATE SET
        last_position_seconds = EXCLUDED.last_position_seconds,
        watch_percentage = GREATEST(${this.schema}.student_lesson_progress.watch_percentage, EXCLUDED.watch_percentage),
        is_completed = (${this.schema}.student_lesson_progress.is_completed OR EXCLUDED.is_completed),
        completed_at = CASE WHEN ${this.schema}.student_lesson_progress.is_completed THEN ${this.schema}.student_lesson_progress.completed_at ELSE EXCLUDED.completed_at END`, [
            organizationId,
            userId,
            data.lessonId,
            isCompleted,
            data.lastPositionSeconds,
            data.watchPercentage,
            isCompleted ? new Date() : null,
        ]);
        // Recalculate Course Progress
        await this.RecalculateCourseProgress(organizationId, userId, course_id);
        return {
            lessonId: data.lessonId,
            watchPercentage: data.watchPercentage,
            isCompleted,
        };
    }
    async MarkLessonAsCompleted(organizationId, userId, lessonId) {
        const lessonRes = await (0, connection_1.executeQuery)(`SELECT course_id FROM ${this.schema}.lessons WHERE id = $1 AND organization_id = $2`, [lessonId, organizationId]);
        if (lessonRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Lesson not found.');
        const { course_id } = lessonRes.rows[0];
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.student_lesson_progress (
        organization_id, user_id, lesson_id, is_completed, watch_percentage, completed_at
      ) VALUES ($1, $2, $3, TRUE, 100.00, CURRENT_TIMESTAMP)
      ON CONFLICT (organization_id, user_id, lesson_id) DO UPDATE SET
        is_completed = TRUE,
        watch_percentage = 100.00,
        completed_at = COALESCE(${this.schema}.student_lesson_progress.completed_at, CURRENT_TIMESTAMP)`, [organizationId, userId, lessonId]);
        await this.RecalculateCourseProgress(organizationId, userId, course_id);
        return { lessonId, isCompleted: true };
    }
    async RecalculateCourseProgress(organizationId, userId, courseId) {
        const totalLessonsRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`, [courseId]);
        const totalLessons = parseInt(totalLessonsRes.rows[0].count, 10) || 1;
        const completedLessonsRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count
       FROM ${this.schema}.student_lesson_progress slp
       JOIN ${this.schema}.lessons l ON l.id = slp.lesson_id
       WHERE l.course_id = $1 AND slp.user_id = $2 AND slp.is_completed = TRUE`, [courseId, userId]);
        const completedLessons = parseInt(completedLessonsRes.rows[0].count, 10);
        const progressPercentage = Math.min(100, Math.round((completedLessons / totalLessons) * 100));
        const isCourseCompleted = completedLessons >= totalLessons;
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.student_course_progress (
        organization_id, user_id, course_id, completed_lessons_count, total_lessons_count,
        progress_percentage, is_completed, completed_at, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (organization_id, user_id, course_id) DO UPDATE SET
        completed_lessons_count = EXCLUDED.completed_lessons_count,
        total_lessons_count = EXCLUDED.total_lessons_count,
        progress_percentage = EXCLUDED.progress_percentage,
        is_completed = EXCLUDED.is_completed,
        completed_at = CASE WHEN ${this.schema}.student_course_progress.is_completed THEN ${this.schema}.student_course_progress.completed_at ELSE EXCLUDED.completed_at END,
        last_activity_at = CURRENT_TIMESTAMP`, [
            organizationId,
            userId,
            courseId,
            completedLessons,
            totalLessons,
            progressPercentage,
            isCourseCompleted,
            isCourseCompleted ? new Date() : null,
        ]);
        if (isCourseCompleted) {
            await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.enrollments SET completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE organization_id = $1 AND user_id = $2 AND course_id = $3`, [organizationId, userId, courseId]);
        }
    }
    async GetStudentCourseProgress(organizationId, userId, courseId) {
        const progressRes = await (0, connection_1.executeQuery)(`SELECT * FROM ${this.schema}.student_course_progress
       WHERE organization_id = $1 AND user_id = $2 AND course_id = $3`, [organizationId, userId, courseId]);
        const lessonProgressRes = await (0, connection_1.executeQuery)(`SELECT slp.lesson_id, slp.is_completed, slp.last_position_seconds, slp.watch_percentage
       FROM ${this.schema}.student_lesson_progress slp
       JOIN ${this.schema}.lessons l ON l.id = slp.lesson_id
       WHERE l.course_id = $1 AND slp.user_id = $2 AND slp.organization_id = $3`, [courseId, userId, organizationId]);
        return {
            courseProgress: progressRes.rows[0] || {
                progress_percentage: 0,
                completed_lessons_count: 0,
                is_completed: false,
            },
            lessonProgress: lessonProgressRes.rows,
        };
    }
    async CheckCourseCompletionEligibility(organizationId, userId, courseId) {
        const progressRes = await (0, connection_1.executeQuery)(`SELECT is_completed, progress_percentage FROM ${this.schema}.student_course_progress
       WHERE organization_id = $1 AND user_id = $2 AND course_id = $3`, [organizationId, userId, courseId]);
        const isEligible = progressRes.rows[0]?.is_completed === true;
        return {
            courseId,
            isEligible,
            progressPercentage: progressRes.rows[0]?.progress_percentage || 0,
        };
    }
}
exports.ProgressService = ProgressService;
exports.progressService = new ProgressService();
