"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseService = exports.CourseService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const ApiError_1 = require("../../utils/ApiError");
const FileStorageFactory_1 = require("../../services/storage/FileStorageFactory");
const AssetNamingUtils_1 = require("../../utils/AssetNamingUtils");
class CourseService {
    schema = environment_1.EnvironmentConfig.database.schema;
    storage = FileStorageFactory_1.FileStorageFactory.getInstance();
    async GetCourseList(organizationId, page = 1, pageSize = 20, search, isPublicOnly = false) {
        const offset = (page - 1) * pageSize;
        let whereClause = `WHERE c.organization_id = $1`;
        const params = [organizationId, pageSize, offset];
        if (isPublicOnly) {
            whereClause += ` AND c.is_published = TRUE AND (c.is_private = FALSE OR c.is_private IS NULL)`;
        }
        if (search) {
            whereClause += ` AND (c.title ILIKE $4 OR c.description ILIKE $4)`;
            params.push(`%${search}%`);
        }
        const countRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.courses c ${whereClause}`, search ? [organizationId, `%${search}%`] : [organizationId]);
        const totalRecords = parseInt(countRes.rows[0].count, 10);
        const totalPages = Math.ceil(totalRecords / pageSize);
        const listRes = await (0, connection_1.executeQuery)(`SELECT c.id, c.title, c.slug, c.short_description, c.thumbnail_url, c.level, c.category,
              c.status, c.is_published, c.is_private, c.access_type, c.min_video_watch_percentage, c.pass_quiz_percentage, c.created_at,
              u.first_name as author_first_name, u.last_name as author_last_name,
              (SELECT COUNT(*) FROM ${this.schema}.lessons l WHERE l.course_id = c.id) as total_lessons_count,
              (SELECT COUNT(*) FROM ${this.schema}.enrollments e WHERE e.course_id = c.id) as total_enrolled_students
       FROM ${this.schema}.courses c
       LEFT JOIN ${this.schema}.users u ON u.id = c.created_by
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`, params);
        return {
            data: listRes.rows,
            pagination: { page, pageSize, totalRecords, totalPages },
        };
    }
    async GetCourseDetails(organizationId, courseId) {
        const courseRes = await (0, connection_1.executeQuery)(`SELECT c.*, u.first_name as author_first_name, u.last_name as author_last_name
       FROM ${this.schema}.courses c
       LEFT JOIN ${this.schema}.users u ON u.id = c.created_by
       WHERE c.id = $1 AND c.organization_id = $2`, [courseId, organizationId]);
        if (courseRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Course not found.');
        const course = courseRes.rows[0];
        // Fetch Sections
        const sectionsRes = await (0, connection_1.executeQuery)(`SELECT * FROM ${this.schema}.course_sections WHERE course_id = $1 ORDER BY order_index ASC, created_at ASC`, [courseId]);
        // Fetch Lessons
        const lessonsRes = await (0, connection_1.executeQuery)(`SELECT id, section_id, title, content_type, video_url, video_duration_seconds, order_index, is_free_preview
       FROM ${this.schema}.lessons WHERE course_id = $1 ORDER BY order_index ASC, created_at ASC`, [courseId]);
        // Nest lessons inside sections
        const sections = sectionsRes.rows.map((sec) => ({
            ...sec,
            lessons: lessonsRes.rows.filter((l) => l.section_id === sec.id),
        }));
        return {
            ...course,
            sections,
        };
    }
    async CreateCourse(organizationId, userId, data) {
        const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;
        const res = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.courses (
        organization_id, title, slug, description, short_description, level,
        category, thumbnail_url, is_private, access_type, min_video_watch_percentage, pass_quiz_percentage, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`, [
            organizationId,
            data.title,
            slug,
            data.description || null,
            data.shortDescription || null,
            data.level || 'BEGINNER',
            data.category || 'General',
            data.thumbnailUrl || null,
            Boolean(data.isPrivate),
            data.accessType || (data.isPrivate ? 'INVITE_ONLY' : 'PUBLIC'),
            data.minVideoWatchPercentage || 80,
            data.passQuizPercentage || 70,
            userId,
        ]);
        const newCourse = res.rows[0];
        // Seed default first module
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.course_sections (organization_id, course_id, title, order_index)
       VALUES ($1, $2, 'Module 1: Introduction & Fundamentals', 0)`, [organizationId, newCourse.id]);
        return newCourse;
    }
    async UpdateCourse(organizationId, courseId, data) {
        const fields = [];
        const params = [courseId, organizationId];
        Object.entries(data).forEach(([key, val]) => {
            if (val !== undefined) {
                params.push(val);
                const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
                fields.push(`${snakeKey} = $${params.length}`);
            }
        });
        if (fields.length === 0)
            return this.GetCourseDetails(organizationId, courseId);
        params.push(new Date());
        fields.push(`updated_at = $${params.length}`);
        const res = await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.courses SET ${fields.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`, params);
        if (res.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Course not found.');
        return res.rows[0];
    }
    async PublishCourse(organizationId, courseId) {
        const res = await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.courses SET is_published = TRUE, status = 'PUBLISHED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 RETURNING id, is_published, status`, [courseId, organizationId]);
        if (res.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Course not found.');
        return res.rows[0];
    }
    async UnpublishCourse(organizationId, courseId) {
        const res = await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.courses SET is_published = FALSE, status = 'DRAFT', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 RETURNING id, is_published, status`, [courseId, organizationId]);
        if (res.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Course not found.');
        return res.rows[0];
    }
    async CreateCourseSection(organizationId, courseId, title, orderIndex = 0) {
        const res = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.course_sections (organization_id, course_id, title, order_index)
       VALUES ($1, $2, $3, $4) RETURNING *`, [organizationId, courseId, title, orderIndex]);
        return res.rows[0];
    }
    async CreateLesson(organizationId, courseId, sectionId, data) {
        const res = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.lessons (
        organization_id, course_id, section_id, title, content_type,
        video_url, video_duration_seconds, article_content, document_url, order_index, is_free_preview
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`, [
            organizationId,
            courseId,
            sectionId,
            data.title,
            data.contentType || 'VIDEO',
            data.videoUrl || null,
            data.videoDurationSeconds || 0,
            data.articleContent || null,
            data.documentUrl || null,
            data.orderIndex || 0,
            data.isFreePreview || false,
        ]);
        // Update total lessons count in student progress records
        const lessonsCountRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`, [courseId]);
        const totalLessons = parseInt(lessonsCountRes.rows[0].count, 10);
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.student_course_progress SET total_lessons_count = $1 WHERE course_id = $2`, [totalLessons, courseId]);
        return res.rows[0];
    }
    async UploadCourseThumbnail(organizationId, courseId, file) {
        const courseRes = await (0, connection_1.executeQuery)(`SELECT c.id, c.slug, c.title, o.slug as org_slug
       FROM ${this.schema}.courses c
       JOIN ${this.schema}.organizations o ON o.id = c.organization_id
       WHERE c.id = $1 AND c.organization_id = $2`, [courseId, organizationId]);
        if (courseRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Course not found.');
        const course = courseRes.rows[0];
        const customFileName = AssetNamingUtils_1.AssetNamingUtils.getCourseThumbnailName(course.org_slug, course.slug || course.title, file.originalname);
        const uploadResult = await this.storage.UploadFile({
            organizationId,
            category: 'thumbnails',
            fileName: file.originalname,
            customFileName,
            mimeType: file.mimetype,
            buffer: file.buffer,
        });
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.courses SET thumbnail_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [uploadResult.url, courseId]);
        return {
            courseId,
            thumbnailUrl: uploadResult.url,
            fileName: customFileName,
        };
    }
    async LogCourseViolation(data) {
        let resolvedOrgId = data.organizationId;
        if (!resolvedOrgId && data.courseId) {
            const courseCheck = await (0, connection_1.executeQuery)(`SELECT organization_id FROM ${this.schema}.courses WHERE id = $1`, [data.courseId]);
            if (courseCheck.rowCount > 0) {
                resolvedOrgId = courseCheck.rows[0].organization_id;
            }
        }
        let userMeta = {};
        if (data.userId) {
            const uRes = await (0, connection_1.executeQuery)(`SELECT email, first_name, last_name FROM ${this.schema}.users WHERE id = $1`, [data.userId]);
            if (uRes.rowCount > 0) {
                userMeta = {
                    userEmail: uRes.rows[0].email,
                    userName: `${uRes.rows[0].first_name} ${uRes.rows[0].last_name}`.trim(),
                };
            }
        }
        const metadata = {
            ...userMeta,
            ...data.details,
            violationType: data.violationType,
            lessonId: data.lessonId,
            timestamp: new Date().toISOString(),
        };
        // 1. Insert into course_security_violations
        const violationRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.course_security_violations (
        organization_id, user_id, course_id, lesson_id, violation_type, client_ip, user_agent, details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING *`, [
            resolvedOrgId,
            data.userId,
            data.courseId,
            data.lessonId,
            data.violationType,
            data.clientIp,
            data.userAgent,
            JSON.stringify(metadata),
        ]);
        // 2. Also record in audit_logs
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.audit_logs (
        organization_id, user_id, action, resource, resource_id, ip_address, user_agent, metadata
      ) VALUES ($1, $2, 'SECURITY_PIRACY_VIOLATION', 'courses', $3, $4, $5, $6::jsonb)`, [
            resolvedOrgId,
            data.userId,
            data.courseId,
            data.clientIp,
            data.userAgent,
            JSON.stringify(metadata),
        ]);
        return violationRes.rows[0];
    }
}
exports.CourseService = CourseService;
exports.courseService = new CourseService();
