"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseService = exports.CourseService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const ApiError_1 = require("../../utils/ApiError");
const FileStorageFactory_1 = require("../../services/storage/FileStorageFactory");
const AssetNamingUtils_1 = require("../../utils/AssetNamingUtils");
const ClientIpResolver_1 = require("../../utils/ClientIpResolver");
class CourseService {
    schema = environment_1.EnvironmentConfig.database.schema;
    storage = FileStorageFactory_1.FileStorageFactory.getInstance();
    async GetCourseList(organizationId, page = 1, pageSize = 20, search, isPublicOnly = false, category, level, status, accessType, studentUserId) {
        if (page < 1)
            page = 1;
        if (pageSize < 1)
            pageSize = 20;
        if (pageSize > 100)
            pageSize = 100;
        const offset = (page - 1) * pageSize;
        let whereClause = `WHERE c.organization_id = $1`;
        const countParams = [organizationId];
        if (studentUserId) {
            countParams.push(studentUserId);
            const studentIdx = countParams.length;
            if (isPublicOnly) {
                whereClause += ` AND c.is_published = TRUE AND (c.is_private = FALSE OR c.is_private IS NULL)`;
            }
            else {
                // Students can see published public courses PLUS any private/exclusive course they have active enrollment in
                whereClause += ` AND c.is_published = TRUE AND (
          (c.is_private = FALSE OR c.is_private IS NULL)
          OR EXISTS (
            SELECT 1 FROM ${this.schema}.enrollments e
            WHERE e.course_id = c.id AND e.user_id = $${studentIdx} AND e.organization_id = $1 AND e.status = 'ACTIVE'
          )
        )`;
            }
        }
        else if (isPublicOnly) {
            whereClause += ` AND c.is_published = TRUE AND (c.is_private = FALSE OR c.is_private IS NULL)`;
        }
        if (category && category !== 'ALL') {
            countParams.push(category);
            whereClause += ` AND c.category = $${countParams.length}`;
        }
        if (level && level !== 'ALL') {
            countParams.push(level);
            whereClause += ` AND c.level = $${countParams.length}`;
        }
        if (status && status !== 'ALL') {
            countParams.push(status);
            whereClause += ` AND c.status = $${countParams.length}`;
        }
        if (accessType && accessType !== 'ALL') {
            if (accessType === 'PRIVATE') {
                whereClause += ` AND c.is_private = TRUE`;
            }
            else if (accessType === 'PUBLIC') {
                whereClause += ` AND (c.is_private = FALSE OR c.is_private IS NULL)`;
            }
        }
        if (search && search.trim()) {
            countParams.push(`%${search.trim()}%`);
            whereClause += ` AND (c.title ILIKE $${countParams.length} OR c.description ILIKE $${countParams.length} OR c.short_description ILIKE $${countParams.length} OR c.category ILIKE $${countParams.length})`;
        }
        const countRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.courses c ${whereClause}`, countParams);
        const totalRecords = parseInt(countRes.rows[0].count, 10);
        const totalPages = Math.ceil(totalRecords / pageSize);
        const listParams = [...countParams, pageSize, offset];
        const limitIdx = listParams.length - 1;
        const offsetIdx = listParams.length;
        const listRes = await (0, connection_1.executeQuery)(`SELECT c.id, c.title, c.slug, c.short_description, c.thumbnail_url, c.level, c.category,
              c.status, c.is_published, c.is_private, c.access_type, c.min_video_watch_percentage, c.pass_quiz_percentage, c.created_at,
              u.first_name as author_first_name, u.last_name as author_last_name,
              (c.is_private = TRUE OR c.access_type = 'PRIVATE') as is_exclusive,
              (SELECT COUNT(*) FROM ${this.schema}.lessons l WHERE l.course_id = c.id) as total_lessons_count,
              (SELECT COUNT(*) FROM ${this.schema}.enrollments e WHERE e.course_id = c.id) as total_enrolled_students
       FROM ${this.schema}.courses c
       LEFT JOIN ${this.schema}.users u ON u.id = c.created_by
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`, listParams);
        return {
            data: listRes.rows,
            pagination: { page, pageSize, totalRecords, totalPages },
        };
    }
    async GetStudentEnrolledCourses(organizationId, userId) {
        const res = await (0, connection_1.executeQuery)(`SELECT c.id, c.title, c.slug, c.short_description, c.description, c.thumbnail_url,
              c.level, c.category, c.status, c.is_published, c.is_private, c.access_type,
              e.enrolled_at, e.status as enrollment_status,
              COALESCE(scp.progress_percentage, 0.00) as progress_percentage,
              COALESCE(scp.completed_lessons_count, 0) as completed_lessons_count,
              COALESCE(
                NULLIF(scp.total_lessons_count, 0),
                (SELECT COUNT(*) FROM ${this.schema}.lessons l WHERE l.course_id = c.id),
                0
              ) as total_lessons_count,
              COALESCE(scp.is_completed, FALSE) as is_completed,
              scp.last_activity_at,
              scp.last_lesson_id,
              COALESCE(l_last.title, (SELECT l_first.title FROM ${this.schema}.lessons l_first WHERE l_first.course_id = c.id ORDER BY l_first.order_index ASC LIMIT 1)) as last_lesson_title,
              COALESCE(scp.last_position_seconds, 0) as last_position_seconds,
              ccl.campaign_name,
              ccl.target_institution,
              (c.is_private = TRUE OR c.access_type = 'PRIVATE' OR ccl.id IS NOT NULL) as is_exclusive
       FROM ${this.schema}.enrollments e
       JOIN ${this.schema}.courses c ON c.id = e.course_id
       LEFT JOIN ${this.schema}.student_course_progress scp
         ON scp.course_id = c.id AND scp.user_id = e.user_id AND scp.organization_id = e.organization_id
       LEFT JOIN ${this.schema}.lessons l_last
         ON l_last.id = scp.last_lesson_id
       LEFT JOIN ${this.schema}.course_campaign_redemptions ccr
         ON ccr.course_id = c.id AND ccr.user_id = e.user_id AND ccr.organization_id = e.organization_id
       LEFT JOIN ${this.schema}.course_campaign_links ccl
         ON ccl.id = ccr.campaign_link_id
       WHERE e.organization_id = $1 AND e.user_id = $2 AND e.status = 'ACTIVE'
       ORDER BY COALESCE(scp.last_activity_at, e.enrolled_at) DESC`, [organizationId, userId]);
        return res.rows.map((row) => ({
            ...row,
            progress_percentage: parseFloat(row.progress_percentage || '0'),
            total_lessons_count: parseInt(row.total_lessons_count || '0', 10),
            completed_lessons_count: parseInt(row.completed_lessons_count || '0', 10),
            last_position_seconds: parseInt(row.last_position_seconds || '0', 10),
            is_exclusive: Boolean(row.is_exclusive),
        }));
    }
    async GetCourseDetails(organizationId, courseId, callerRole) {
        const courseRes = await (0, connection_1.executeQuery)(`SELECT c.*, u.first_name as author_first_name, u.last_name as author_last_name
       FROM ${this.schema}.courses c
       LEFT JOIN ${this.schema}.users u ON u.id = c.created_by
       WHERE c.id = $1 AND c.organization_id = $2`, [courseId, organizationId]);
        if (courseRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Course not found.');
        const course = courseRes.rows[0];
        // Fetch Sections
        const sectionsRes = await (0, connection_1.executeQuery)(`SELECT * FROM ${this.schema}.course_sections WHERE course_id = $1 ORDER BY order_index ASC, created_at ASC`, [courseId]);
        // Fetch Lessons with metadata (size, timestamps)
        const lessonsRes = await (0, connection_1.executeQuery)(`SELECT id, section_id, title, content_type, video_url, video_duration_seconds, order_index, is_free_preview, video_file_size_bytes, created_at, updated_at
       FROM ${this.schema}.lessons WHERE course_id = $1 ORDER BY order_index ASC, created_at ASC`, [courseId]);
        const isStudent = callerRole === 'STUDENT';
        // Nest lessons inside sections, stripping sensitive fields for students
        const sections = sectionsRes.rows.map((sec) => ({
            ...sec,
            lessons: lessonsRes.rows
                .filter((l) => l.section_id === sec.id)
                .map((l) => {
                if (isStudent) {
                    // Students should NOT get raw video_url or file size — they use signed playback URL
                    const { video_url, video_file_size_bytes, ...safeLesson } = l;
                    return safeLesson;
                }
                return l;
            }),
        }));
        // For students, strip internal course fields they don't need
        if (isStudent) {
            const { created_by, organization_id, ...safeCourse } = course;
            return { ...safeCourse, sections };
        }
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
        if ((0, ClientIpResolver_1.isLoopbackIp)(data.clientIp)) {
            data.clientIp = await (0, ClientIpResolver_1.FetchPublicIp)();
        }
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
    async DeleteCourse(organizationId, courseId, actorUserId, clientIp, userAgent) {
        const courseRes = await (0, connection_1.executeQuery)(`SELECT id, title FROM ${this.schema}.courses WHERE id = $1 AND organization_id = $2`, [courseId, organizationId]);
        if (courseRes.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Course not found.');
        }
        const courseTitle = courseRes.rows[0].title;
        await (0, connection_1.executeQuery)(`DELETE FROM ${this.schema}.courses WHERE id = $1 AND organization_id = $2`, [courseId, organizationId]);
        // Record audit log for course deletion
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.audit_logs (
        organization_id, user_id, action, resource, resource_id, ip_address, user_agent, metadata
      ) VALUES ($1, $2, 'DELETE_COURSE', 'courses', $3, $4, $5, $6::jsonb)`, [
            organizationId,
            actorUserId,
            courseId,
            clientIp,
            userAgent,
            JSON.stringify({
                course_id: courseId,
                course_title: courseTitle,
                description: `Course "${courseTitle}" was deleted.`
            }),
        ]);
        return { success: true, message: 'Course deleted successfully' };
    }
    async DeleteCourseSection(organizationId, sectionId) {
        const sectionRes = await (0, connection_1.executeQuery)(`SELECT course_id FROM ${this.schema}.course_sections WHERE id = $1 AND organization_id = $2`, [sectionId, organizationId]);
        if (sectionRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Course section not found.');
        const courseId = sectionRes.rows[0].course_id;
        await (0, connection_1.executeQuery)(`DELETE FROM ${this.schema}.course_sections WHERE id = $1 AND organization_id = $2`, [sectionId, organizationId]);
        // recalculate total lessons count for the course and update student_course_progress
        const lessonsCountRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`, [courseId]);
        const totalLessons = parseInt(lessonsCountRes.rows[0].count, 10);
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.student_course_progress SET total_lessons_count = $1 WHERE course_id = $2`, [totalLessons, courseId]);
        return { success: true, message: 'Module section deleted successfully.' };
    }
    async DeleteLesson(organizationId, lessonId) {
        const lessonRes = await (0, connection_1.executeQuery)(`SELECT course_id FROM ${this.schema}.lessons WHERE id = $1 AND organization_id = $2`, [lessonId, organizationId]);
        if (lessonRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Lesson not found.');
        const courseId = lessonRes.rows[0].course_id;
        await (0, connection_1.executeQuery)(`DELETE FROM ${this.schema}.lessons WHERE id = $1 AND organization_id = $2`, [lessonId, organizationId]);
        const lessonsCountRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`, [courseId]);
        const totalLessons = parseInt(lessonsCountRes.rows[0].count, 10);
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.student_course_progress SET total_lessons_count = $1 WHERE course_id = $2`, [totalLessons, courseId]);
        return { success: true, message: 'Lesson deleted successfully.' };
    }
    async UploadLessonAttachment(organizationId, lessonId, file) {
        const uploadResult = await this.storage.UploadFile({
            organizationId,
            category: 'documents',
            fileName: file.originalname,
            mimeType: file.mimetype,
            buffer: file.buffer,
        });
        const lessonRes = await (0, connection_1.executeQuery)(`SELECT attachments FROM ${this.schema}.lessons WHERE id = $1 AND organization_id = $2`, [lessonId, organizationId]);
        if (lessonRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Lesson not found.');
        const existingAttachments = lessonRes.rows[0].attachments || [];
        const newAttachment = {
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            storageKey: uploadResult.storageKey,
            url: uploadResult.url,
            name: file.originalname,
            size: uploadResult.fileSize,
            mimeType: file.mimetype,
            uploadedAt: new Date().toISOString()
        };
        const updatedAttachments = [...existingAttachments, newAttachment];
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.lessons 
       SET attachments = $1::jsonb, 
           document_url = COALESCE(document_url, $2)
       WHERE id = $3 AND organization_id = $4`, [JSON.stringify(updatedAttachments), uploadResult.url, lessonId, organizationId]);
        return { attachment: newAttachment, attachments: updatedAttachments };
    }
    async DeleteLessonAttachment(organizationId, lessonId, attachmentUrl) {
        const lessonRes = await (0, connection_1.executeQuery)(`SELECT attachments FROM ${this.schema}.lessons WHERE id = $1 AND organization_id = $2`, [lessonId, organizationId]);
        if (lessonRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Lesson not found.');
        const existingAttachments = lessonRes.rows[0].attachments || [];
        const target = existingAttachments.find((att) => att.url === attachmentUrl || att.storageKey === attachmentUrl || att.id === attachmentUrl || att.name === attachmentUrl);
        if (target?.storageKey) {
            await this.storage.DeleteFile(target.storageKey).catch(console.error);
        }
        const updatedAttachments = existingAttachments.filter((att) => att.url !== attachmentUrl && att.storageKey !== attachmentUrl && att.id !== attachmentUrl && att.name !== attachmentUrl);
        const newDocUrl = updatedAttachments.length > 0 ? (updatedAttachments[0].url || updatedAttachments[0].file_url) : null;
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.lessons 
       SET attachments = $1::jsonb, 
           document_url = $2
       WHERE id = $3 AND organization_id = $4`, [JSON.stringify(updatedAttachments), newDocUrl, lessonId, organizationId]);
        return { success: true, attachments: updatedAttachments };
    }
    async ScaffoldCourseraFlow(organizationId, courseId) {
        const modules = [
            {
                title: 'Module 1: Course Orientation & Foundations',
                lessons: [
                    { title: 'Welcome & Overview', type: 'VIDEO' },
                    { title: 'Syllabus & Learning Goals', type: 'ARTICLE' }
                ]
            },
            {
                title: 'Module 2: Core Concepts & Guided Practice',
                lessons: [
                    { title: 'Introduction', type: 'VIDEO' },
                    { title: 'Practice reading note', type: 'ARTICLE' }
                ]
            },
            {
                title: 'Module 3: Reference Materials, Cheatsheets & Downloads',
                lessons: [
                    { title: 'Course reference guides and downloads', type: 'DOCUMENT' }
                ]
            },
            {
                title: 'Module 4: Course Conclusion & Feedback',
                lessons: [
                    { title: 'Course wrap-up', type: 'ARTICLE' },
                    { title: 'Feedback & Certificate unlock', type: 'ARTICLE' }
                ]
            }
        ];
        let secOrder = 0;
        let lesOrder = 0;
        for (const mod of modules) {
            const secRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.course_sections (organization_id, course_id, title, order_index)
         VALUES ($1, $2, $3, $4) RETURNING id`, [organizationId, courseId, mod.title, secOrder++]);
            const secId = secRes.rows[0].id;
            for (const les of mod.lessons) {
                await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.lessons (organization_id, course_id, section_id, title, content_type, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)`, [organizationId, courseId, secId, les.title, les.type, lesOrder++]);
            }
        }
        const lessonsCountRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`, [courseId]);
        const totalLessons = parseInt(lessonsCountRes.rows[0].count, 10);
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.student_course_progress SET total_lessons_count = $1 WHERE course_id = $2`, [totalLessons, courseId]);
        return this.GetCourseDetails(organizationId, courseId);
    }
    async SubmitCourseFeedback(organizationId, userId, courseId, rating, feedbackText) {
        const res = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.course_feedback (organization_id, user_id, course_id, rating, feedback_text)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, course_id) 
       DO UPDATE SET rating = EXCLUDED.rating, feedback_text = EXCLUDED.feedback_text, updated_at = CURRENT_TIMESTAMP
       RETURNING *`, [organizationId, userId, courseId, rating, feedbackText || null]);
        return res.rows[0];
    }
    async GetCourseFeedback(organizationId, courseId) {
        const res = await (0, connection_1.executeQuery)(`SELECT cf.*, u.first_name, u.last_name
       FROM ${this.schema}.course_feedback cf
       JOIN ${this.schema}.users u ON u.id = cf.user_id
       WHERE cf.course_id = $1 AND cf.organization_id = $2
       ORDER BY cf.created_at DESC`, [courseId, organizationId]);
        return res.rows;
    }
}
exports.CourseService = CourseService;
exports.courseService = new CourseService();
