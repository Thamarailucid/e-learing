"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificateService = exports.CertificateService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const ApiError_1 = require("../../utils/ApiError");
class CertificateService {
    schema = environment_1.EnvironmentConfig.database.schema;
    async GenerateCertificate(organizationId, userId, courseId) {
        // 1. Verify eligibility
        const progressRes = await (0, connection_1.executeQuery)(`SELECT is_completed FROM ${this.schema}.student_course_progress
       WHERE organization_id = $1 AND user_id = $2 AND course_id = $3`, [organizationId, userId, courseId]);
        if (progressRes.rowCount === 0 || !progressRes.rows[0].is_completed) {
            throw ApiError_1.ApiError.badRequest('Course completion requirements have not yet been satisfied.');
        }
        // Check if already generated
        const existingRes = await (0, connection_1.executeQuery)(`SELECT * FROM ${this.schema}.certificates
       WHERE organization_id = $1 AND user_id = $2 AND course_id = $3`, [organizationId, userId, courseId]);
        if (existingRes.rowCount > 0) {
            return existingRes.rows[0];
        }
        // Gather student, course, and org details
        const studentRes = await (0, connection_1.executeQuery)(`SELECT first_name, last_name FROM ${this.schema}.users WHERE id = $1`, [userId]);
        const courseRes = await (0, connection_1.executeQuery)(`SELECT title FROM ${this.schema}.courses WHERE id = $1`, [courseId]);
        const orgRes = await (0, connection_1.executeQuery)(`SELECT name FROM ${this.schema}.organizations WHERE id = $1`, [organizationId]);
        const studentName = `${studentRes.rows[0].first_name} ${studentRes.rows[0].last_name}`;
        const courseTitle = courseRes.rows[0].title;
        const orgName = orgRes.rows[0].name;
        const certRandom = Math.floor(100000 + Math.random() * 900000);
        const certNumber = `Novacodex-${new Date().getFullYear()}-${certRandom}`;
        const verificationUrl = `${environment_1.EnvironmentConfig.application.frontendUrl}/verify/${certNumber}`;
        const insertRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.certificates (
        organization_id, user_id, course_id, certificate_number, student_name,
        course_title, organization_name, verification_url, qr_code_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`, [
            organizationId,
            userId,
            courseId,
            certNumber,
            studentName,
            courseTitle,
            orgName,
            verificationUrl,
            verificationUrl,
        ]);
        return insertRes.rows[0];
    }
    async VerifyCertificate(certificateNumber) {
        const res = await (0, connection_1.executeQuery)(`SELECT c.certificate_number, c.student_name, c.course_title, c.organization_name,
              c.issue_date, c.verification_url, o.slug as organization_slug, o.logo_url as organization_logo_url,
              ots.primary_color, ots.certificate_title, ots.certificate_signatory_name,
              ots.certificate_signatory_title, ots.certificate_signature_url, ots.certificate_background_url,
              ots.certificate_accent_color
       FROM ${this.schema}.certificates c
       JOIN ${this.schema}.organizations o ON o.id = c.organization_id
       LEFT JOIN ${this.schema}.organization_theme_settings ots ON ots.organization_id = c.organization_id
       WHERE c.certificate_number = $1`, [certificateNumber.trim()]);
        if (res.rowCount === 0) {
            return {
                isValid: false,
                message: 'Certificate not found or revoked.',
            };
        }
        return {
            isValid: true,
            certificate: res.rows[0],
        };
    }
    async GetStudentCertificateList(userId, organizationId) {
        let query = `
      SELECT c.*, o.slug as organization_slug, o.logo_url as organization_logo_url,
             ots.primary_color, ots.certificate_title, ots.certificate_signatory_name,
             ots.certificate_signatory_title, ots.certificate_signature_url, ots.certificate_background_url,
             ots.certificate_accent_color
      FROM ${this.schema}.certificates c
      JOIN ${this.schema}.organizations o ON o.id = c.organization_id
      LEFT JOIN ${this.schema}.organization_theme_settings ots ON ots.organization_id = c.organization_id
      WHERE c.user_id = $1
    `;
        const params = [userId];
        if (organizationId) {
            query += ` AND c.organization_id = $2`;
            params.push(organizationId);
        }
        query += ` ORDER BY c.issue_date DESC`;
        const res = await (0, connection_1.executeQuery)(query, params);
        return res.rows;
    }
    async GetStudentCertificateOverview(userId, organizationId) {
        // 1. All issued certificates
        const earnedCertificates = await this.GetStudentCertificateList(userId, organizationId);
        const earnedCourseIds = earnedCertificates.map((c) => c.course_id);
        // 2. Claimable courses: 100% completed or all lessons done, but certificate not generated yet
        let claimableQuery = `
      SELECT c.id as course_id, c.title as course_title, c.thumbnail_url, c.category, c.level,
             e.organization_id, o.name as organization_name, o.logo_url as organization_logo_url,
             scp.progress_percentage, scp.completed_lessons_count, scp.total_lessons_count,
             scp.completed_at
      FROM ${this.schema}.enrollments e
      JOIN ${this.schema}.courses c ON c.id = e.course_id
      JOIN ${this.schema}.organizations o ON o.id = e.organization_id
      LEFT JOIN ${this.schema}.student_course_progress scp 
        ON scp.course_id = c.id AND scp.user_id = e.user_id AND scp.organization_id = e.organization_id
      WHERE e.user_id = $1 AND e.status = 'ACTIVE'
        AND (scp.is_completed = TRUE OR (scp.completed_lessons_count >= scp.total_lessons_count AND scp.total_lessons_count > 0))
    `;
        const claimableParams = [userId];
        if (organizationId) {
            claimableQuery += ` AND e.organization_id = $2`;
            claimableParams.push(organizationId);
        }
        const claimableRes = await (0, connection_1.executeQuery)(claimableQuery, claimableParams);
        const claimableCourses = claimableRes.rows.filter((c) => !earnedCourseIds.includes(c.course_id));
        // 3. In-progress courses working towards certification
        let inProgressQuery = `
      SELECT c.id as course_id, c.title as course_title, c.thumbnail_url, c.category, c.level,
             e.organization_id, o.name as organization_name, o.logo_url as organization_logo_url,
             COALESCE(scp.progress_percentage, 0) as progress_percentage,
             COALESCE(scp.completed_lessons_count, 0) as completed_lessons_count,
             COALESCE(scp.total_lessons_count, (SELECT COUNT(*) FROM ${this.schema}.lessons l WHERE l.course_id = c.id), 1) as total_lessons_count,
             scp.last_activity_at
      FROM ${this.schema}.enrollments e
      JOIN ${this.schema}.courses c ON c.id = e.course_id
      JOIN ${this.schema}.organizations o ON o.id = e.organization_id
      LEFT JOIN ${this.schema}.student_course_progress scp 
        ON scp.course_id = c.id AND scp.user_id = e.user_id AND scp.organization_id = e.organization_id
      WHERE e.user_id = $1 AND e.status = 'ACTIVE'
        AND (scp.is_completed IS NOT TRUE)
        AND NOT (scp.completed_lessons_count >= scp.total_lessons_count AND scp.total_lessons_count > 0)
      ORDER BY COALESCE(scp.last_activity_at, e.enrolled_at) DESC
    `;
        const inProgressParams = [userId];
        if (organizationId) {
            inProgressQuery += ` AND e.organization_id = $2`;
            inProgressParams.push(organizationId);
        }
        const inProgressRes = await (0, connection_1.executeQuery)(inProgressQuery, inProgressParams);
        return {
            earnedCertificates,
            claimableCourses,
            inProgressCourses: inProgressRes.rows.map((row) => ({
                ...row,
                progress_percentage: parseFloat(row.progress_percentage || '0'),
                total_lessons_count: parseInt(row.total_lessons_count || '1', 10),
                completed_lessons_count: parseInt(row.completed_lessons_count || '0', 10),
                remaining_lessons_count: Math.max(0, parseInt(row.total_lessons_count || '1', 10) - parseInt(row.completed_lessons_count || '0', 10)),
            })),
            stats: {
                totalEarned: earnedCertificates.length,
                readyToClaim: claimableCourses.length,
                inProgress: inProgressRes.rows.length,
            }
        };
    }
}
exports.CertificateService = CertificateService;
exports.certificateService = new CertificateService();
