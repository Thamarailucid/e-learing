"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicService = exports.PublicService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const ApiError_1 = require("../../utils/ApiError");
class PublicService {
    schema = environment_1.EnvironmentConfig.database.schema;
    async GetPublicCatalog(search, orgSlug) {
        let whereClause = "WHERE c.is_published = TRUE AND (c.is_private = FALSE OR c.is_private IS NULL) AND o.status = 'ACTIVE'";
        const params = [];
        if (search) {
            params.push(`%${search}%`);
            whereClause += ` AND (c.title ILIKE $${params.length} OR c.description ILIKE $${params.length})`;
        }
        if (orgSlug) {
            params.push(orgSlug.toLowerCase().trim());
            whereClause += ` AND o.slug = $${params.length}`;
        }
        const query = `
      SELECT 
        c.id, c.title, c.slug, c.description, c.thumbnail_url, c.level,
        c.created_at,
        COALESCE((SELECT SUM(l.video_duration_seconds) / 60 FROM ${this.schema}.lessons l WHERE l.course_id = c.id), 0) as duration_minutes,
        o.id as organization_id, o.name as organization_name, o.slug as organization_slug, o.logo_url as organization_logo_url,
        COALESCE(u.first_name || ' ' || u.last_name, 'Instructor') as instructor_name,
        (SELECT COUNT(*) FROM ${this.schema}.lessons l WHERE l.course_id = c.id) as lesson_count
      FROM ${this.schema}.courses c
      JOIN ${this.schema}.organizations o ON o.id = c.organization_id
      LEFT JOIN ${this.schema}.users u ON u.id = c.created_by
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT 100
    `;
        const res = await (0, connection_1.executeQuery)(query, params);
        return res.rows;
    }
    async GetAcademyPublicProfile(slug) {
        const slugNorm = slug.toLowerCase().trim();
        const orgRes = await (0, connection_1.executeQuery)(`SELECT o.id, o.name, o.slug, o.domain, o.logo_url, o.favicon_url, o.status,
              ts.primary_color, ts.secondary_color, ts.sidebar_color, ts.sidebar_text_color,
              ts.button_color, ts.button_text_color
       FROM ${this.schema}.organizations o
       LEFT JOIN ${this.schema}.organization_theme_settings ts ON ts.organization_id = o.id
       WHERE o.slug = $1 AND o.status = 'ACTIVE'`, [slugNorm]);
        if (orgRes.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Academy not found or is currently inactive.');
        }
        const org = orgRes.rows[0];
        const coursesRes = await (0, connection_1.executeQuery)(`SELECT c.id, c.title, c.slug, c.description, c.thumbnail_url, c.level,
              COALESCE((SELECT SUM(l.video_duration_seconds) / 60 FROM ${this.schema}.lessons l WHERE l.course_id = c.id), 0) as duration_minutes,
              COALESCE(u.first_name || ' ' || u.last_name, 'Instructor') as instructor_name,
              (SELECT COUNT(*) FROM ${this.schema}.lessons l WHERE l.course_id = c.id) as lesson_count
       FROM ${this.schema}.courses c
       LEFT JOIN ${this.schema}.users u ON u.id = c.created_by
       WHERE c.organization_id = $1 AND c.is_published = TRUE AND (c.is_private = FALSE OR c.is_private IS NULL)
       ORDER BY c.created_at DESC`, [org.id]);
        return {
            academy: {
                id: org.id,
                name: org.name,
                slug: org.slug,
                domain: org.domain,
                logoUrl: org.logo_url,
                faviconUrl: org.favicon_url,
            },
            theme: {
                primaryColor: org.primary_color || '#000000',
                secondaryColor: org.secondary_color || '#ffffff',
                sidebarColor: org.sidebar_color || '#0a0a0a',
                sidebarTextColor: org.sidebar_text_color || '#ffffff',
                buttonColor: org.button_color || '#111111',
                buttonTextColor: org.button_text_color || '#ffffff',
            },
            courses: coursesRes.rows,
        };
    }
    async GetPublicCourseDetails(courseIdOrSlug) {
        const res = await (0, connection_1.executeQuery)(`SELECT 
        c.id, c.title, c.slug, c.description, c.thumbnail_url, c.level,
        c.created_at,
        COALESCE((SELECT SUM(l.video_duration_seconds) / 60 FROM ${this.schema}.lessons l WHERE l.course_id = c.id), 0) as duration_minutes,
        o.id as organization_id, o.name as organization_name, o.slug as organization_slug, o.logo_url as organization_logo_url,
        COALESCE(u.first_name || ' ' || u.last_name, 'Instructor') as instructor_name
       FROM ${this.schema}.courses c
       JOIN ${this.schema}.organizations o ON o.id = c.organization_id
       LEFT JOIN ${this.schema}.users u ON u.id = c.created_by
       WHERE (c.id::text = $1 OR c.slug = $1) AND c.is_published = TRUE AND (c.is_private = FALSE OR c.is_private IS NULL) AND o.status = 'ACTIVE'`, [courseIdOrSlug]);
        if (res.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Course not found or is unpublished.');
        }
        const course = res.rows[0];
        const sectionsRes = await (0, connection_1.executeQuery)(`SELECT id, title, order_index
       FROM ${this.schema}.course_sections
       WHERE course_id = $1
       ORDER BY order_index ASC`, [course.id]);
        const lessonsRes = await (0, connection_1.executeQuery)(`SELECT id, section_id, title, content_type, video_duration_seconds,
              video_duration_seconds as duration_seconds,
              is_free_preview, is_free_preview as is_previewable, order_index
       FROM ${this.schema}.lessons
       WHERE course_id = $1
       ORDER BY order_index ASC`, [course.id]);
        const sections = sectionsRes.rows.map((sec) => ({
            id: sec.id,
            title: sec.title,
            order_index: sec.order_index,
            lessons: lessonsRes.rows
                .filter((l) => l.section_id === sec.id)
                .map((l) => ({
                id: l.id,
                section_id: l.section_id,
                title: l.title,
                content_type: l.content_type,
                duration_seconds: l.duration_seconds,
                video_duration_seconds: l.video_duration_seconds,
                is_free_preview: Boolean(l.is_free_preview),
                is_previewable: Boolean(l.is_free_preview),
                order_index: l.order_index,
            })),
        }));
        return {
            course,
            sections,
        };
    }
    /**
     * Resolve public organization information by code, slug, or ID
     * For branded student registration URL & QR scanning
     */
    async GetPublicOrganizationByCodeOrSlug(codeOrSlug) {
        const val = codeOrSlug.trim();
        const res = await (0, connection_1.executeQuery)(`SELECT o.id, o.name, o.slug, o.domain, o.logo_url, o.favicon_url, o.invite_code,
              ts.primary_color, ts.button_color, ts.button_text_color
       FROM ${this.schema}.organizations o
       LEFT JOIN ${this.schema}.organization_theme_settings ts ON ts.organization_id = o.id
       WHERE (o.slug = $1 OR o.invite_code ILIKE $1 OR o.id::text = $1) AND o.status = 'ACTIVE'`, [val]);
        if (res.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Organization not found.');
        }
        return res.rows[0];
    }
}
exports.PublicService = PublicService;
exports.publicService = new PublicService();
