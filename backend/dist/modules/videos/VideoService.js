"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoService = exports.VideoService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const FileStorageFactory_1 = require("../../services/storage/FileStorageFactory");
const ApiError_1 = require("../../utils/ApiError");
const AssetNamingUtils_1 = require("../../utils/AssetNamingUtils");
class VideoService {
    schema = environment_1.EnvironmentConfig.database.schema;
    storage = FileStorageFactory_1.FileStorageFactory.getInstance();
    async UploadCourseVideo(organizationId, lessonId, file) {
        const lessonRes = await (0, connection_1.executeQuery)(`SELECT l.id, l.title as lesson_title, c.slug as course_slug, c.title as course_title, o.slug as org_slug
       FROM ${this.schema}.lessons l
       JOIN ${this.schema}.courses c ON c.id = l.course_id
       JOIN ${this.schema}.organizations o ON o.id = l.organization_id
       WHERE l.id = $1 AND l.organization_id = $2`, [lessonId, organizationId]);
        if (lessonRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Lesson not found.');
        const lessonData = lessonRes.rows[0];
        const customFileName = AssetNamingUtils_1.AssetNamingUtils.getVideoName(lessonData.org_slug, lessonData.course_slug || lessonData.course_title, lessonData.lesson_title, file.originalname);
        const uploadResult = await this.storage.UploadFile({
            organizationId,
            category: 'videos',
            fileName: file.originalname,
            customFileName,
            mimeType: file.mimetype,
            buffer: file.buffer,
        });
        // Update lesson video_url and video_file_size_bytes
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.lessons
       SET video_url = $1, video_file_size_bytes = $2, content_type = 'VIDEO', updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`, [uploadResult.url, uploadResult.fileSize, lessonId]);
        return {
            lessonId,
            videoUrl: uploadResult.url,
            storageKey: uploadResult.storageKey,
            fileSize: uploadResult.fileSize,
        };
    }
    async GenerateVideoPlaybackUrl(organizationId, userId, lessonId) {
        // 1. Verify enrollment or authorized staff
        const userRes = await (0, connection_1.executeQuery)(`SELECT is_super_admin FROM ${this.schema}.users WHERE id = $1`, [userId]);
        const isSuper = userRes.rows[0]?.is_super_admin;
        if (!isSuper) {
            const staffRes = await (0, connection_1.executeQuery)(`SELECT role_id FROM ${this.schema}.organization_members WHERE user_id = $1 AND organization_id = $2 AND status = 'ACTIVE'`, [userId, organizationId]);
            const isStaff = staffRes.rows.length > 0 && staffRes.rows[0].role_id !== 'STUDENT';
            if (!isStaff) {
                // Check if student already has active enrollment
                const enrollRes = await (0, connection_1.executeQuery)(`SELECT e.id FROM ${this.schema}.enrollments e
           JOIN ${this.schema}.lessons l ON l.course_id = e.course_id
           WHERE l.id = $1 AND e.user_id = $2 AND e.organization_id = $3 AND e.status = 'ACTIVE'`, [lessonId, userId, organizationId]);
                if (enrollRes.rowCount === 0) {
                    // Check if lesson is free preview or belongs to a published public course
                    const lessonCourseRes = await (0, connection_1.executeQuery)(`SELECT l.id, l.is_free_preview, c.id as course_id, c.is_published, c.is_private
             FROM ${this.schema}.lessons l
             JOIN ${this.schema}.courses c ON c.id = l.course_id
             WHERE l.id = $1 AND l.organization_id = $2`, [lessonId, organizationId]);
                    if (lessonCourseRes.rowCount === 0) {
                        throw ApiError_1.ApiError.notFound('Lesson video not found.');
                    }
                    const info = lessonCourseRes.rows[0];
                    if (info.is_free_preview) {
                        // Free preview lessons can be viewed before enrollment
                    }
                    else if (info.is_published && (info.is_private === false || info.is_private === null)) {
                        // Active academy student opening a published public course: auto-enroll
                        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.enrollments (organization_id, user_id, course_id, status)
               VALUES ($1, $2, $3, 'ACTIVE')
               ON CONFLICT (organization_id, user_id, course_id) DO UPDATE SET status = 'ACTIVE'`, [organizationId, userId, info.course_id]);
                        // Initialize course progress tracking
                        const totalLessonsRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`, [info.course_id]);
                        const totalLessons = parseInt(totalLessonsRes.rows[0]?.count || '1', 10);
                        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.student_course_progress (organization_id, user_id, course_id, total_lessons_count)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (organization_id, user_id, course_id) DO NOTHING`, [organizationId, userId, info.course_id, totalLessons]);
                    }
                    else {
                        // Private course strictly requires invite campaign token redemption
                        throw ApiError_1.ApiError.forbidden('You are not enrolled in the course for this video.');
                    }
                }
            }
        }
        const lessonRes = await (0, connection_1.executeQuery)(`SELECT video_url, title, video_duration_seconds FROM ${this.schema}.lessons WHERE id = $1 AND organization_id = $2`, [lessonId, organizationId]);
        if (lessonRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Lesson video not found.');
        const lesson = lessonRes.rows[0];
        return {
            lessonId,
            title: lesson.title,
            videoUrl: lesson.video_url,
            durationSeconds: lesson.video_duration_seconds,
        };
    }
    async GetVideoInteractiveQuestionList(organizationId, lessonId) {
        const res = await (0, connection_1.executeQuery)(`SELECT id, timestamp_seconds, question_text, question_type, options, is_required, display_mode
       FROM ${this.schema}.video_interactive_questions
       WHERE lesson_id = $1 AND organization_id = $2
       ORDER BY timestamp_seconds ASC`, [lessonId, organizationId]);
        return res.rows;
    }
    async CreateVideoInteractiveQuestion(organizationId, data) {
        const res = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.video_interactive_questions (
        organization_id, lesson_id, timestamp_seconds, question_text, question_type,
        options, correct_answer, explanation, is_required, display_mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`, [
            organizationId,
            data.lessonId,
            data.timestampSeconds,
            data.questionText,
            data.questionType || 'MCQ',
            JSON.stringify(data.options),
            data.correctAnswer,
            data.explanation || null,
            data.isRequired ?? true,
            data.displayMode || 'FIXED',
        ]);
        return res.rows[0];
    }
    async SubmitVideoInteractiveQuestionAnswer(organizationId, questionId, submittedAnswer) {
        const qRes = await (0, connection_1.executeQuery)(`SELECT id, correct_answer, explanation FROM ${this.schema}.video_interactive_questions
       WHERE id = $1 AND organization_id = $2`, [questionId, organizationId]);
        if (qRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Interactive question not found.');
        const q = qRes.rows[0];
        const isCorrect = q.correct_answer.trim().toLowerCase() === submittedAnswer.trim().toLowerCase();
        return {
            questionId,
            isCorrect,
            explanation: q.explanation,
        };
    }
}
exports.VideoService = VideoService;
exports.videoService = new VideoService();
