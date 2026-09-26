import { executeQuery } from '../../database/connection';
import { EnvironmentConfig } from '../../config/environment';
import { PasswordUtils } from '../../utils/PasswordUtils';
import { DateTimeUtils } from '../../utils/DateTimeUtils';
import { ApiError } from '../../utils/ApiError';
import { isLoopbackIp, FetchPublicIp } from '../../utils/ClientIpResolver';

export class StudentService {
  private schema = EnvironmentConfig.database.schema;

  async GetStudentList(
    organizationId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    status?: string,
    enrollmentFilter?: string
  ) {
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100;
    const offset = (page - 1) * pageSize;

    let whereClause = `WHERE om.organization_id = $1 AND om.role_id = 'STUDENT'`;
    const countParams: any[] = [organizationId];

    if (status && status !== 'ALL') {
      countParams.push(status);
      whereClause += ` AND om.status = $${countParams.length}`;
    }

    if (search && search.trim()) {
      countParams.push(`%${search.trim()}%`);
      whereClause += ` AND (u.first_name ILIKE $${countParams.length} OR u.last_name ILIKE $${countParams.length} OR u.email ILIKE $${countParams.length} OR u.phone ILIKE $${countParams.length})`;
    }

    if (enrollmentFilter === 'ENROLLED') {
      whereClause += ` AND (SELECT COUNT(*) FROM ${this.schema}.enrollments e WHERE e.user_id = u.id AND e.organization_id = $1) > 0`;
    } else if (enrollmentFilter === 'NOT_ENROLLED') {
      whereClause += ` AND (SELECT COUNT(*) FROM ${this.schema}.enrollments e WHERE e.user_id = u.id AND e.organization_id = $1) = 0`;
    }

    const countRes = await executeQuery(
      `SELECT COUNT(*) as count
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       ${whereClause}`,
      countParams
    );

    const totalRecords = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / pageSize);

    const listParams = [...countParams, pageSize, offset];
    const limitIdx = listParams.length - 1;
    const offsetIdx = listParams.length;

    const listRes = await executeQuery(
      `SELECT om.id as membership_id, om.status, om.created_at,
              u.id as user_id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.last_login_at, u.last_login_ip,
              (SELECT COUNT(*) FROM ${this.schema}.enrollments e WHERE e.user_id = u.id AND e.organization_id = $1) as enrolled_courses_count,
              (SELECT COUNT(*) FROM ${this.schema}.certificates cert WHERE cert.user_id = u.id AND cert.organization_id = $1) as certificates_count
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       ${whereClause}
       ORDER BY om.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams
    );

    const publicFallback = await FetchPublicIp();
    const formattedData = listRes.rows.map((row) => ({
      ...row,
      last_login_ip: isLoopbackIp(row.last_login_ip) ? (row.last_login_at ? publicFallback : null) : row.last_login_ip,
      last_login_at_utc: row.last_login_at ? DateTimeUtils.toUtcIsoString(row.last_login_at) : null,
    }));

    return {
      data: formattedData,
      pagination: { page, pageSize, totalRecords, totalPages },
    };
  }

  async CreateStudent(organizationId: string, data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    password?: string;
    avatarUrl?: string;
  }) {
    const emailNorm = data.email.toLowerCase().trim();
    let userId: string;
    let initialPassword = data.password;
    let isGeneratedPassword = false;

    const userRes = await executeQuery(
      `SELECT id FROM ${this.schema}.users WHERE email = $1`,
      [emailNorm]
    );

    if (userRes.rowCount === 0) {
      if (!initialPassword) {
        initialPassword = PasswordUtils.generateSecurePassword(12);
        isGeneratedPassword = true;
      }
      const hash = await PasswordUtils.hashPassword(initialPassword);
      const newUserRes = await executeQuery(
        `INSERT INTO ${this.schema}.users (email, password_hash, first_name, last_name, phone, avatar_url, is_active, email_verified, must_reset_password)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, TRUE)
         RETURNING id`,
        [emailNorm, hash, data.firstName, data.lastName, data.phone || null, data.avatarUrl || null]
      );
      userId = newUserRes.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
      if (data.avatarUrl) {
        await executeQuery(
          `UPDATE ${this.schema}.users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [data.avatarUrl, userId]
        );
      }
    }

    const memberRes = await executeQuery(
      `INSERT INTO ${this.schema}.organization_members (organization_id, user_id, role_id, status)
       VALUES ($1, $2, 'STUDENT', 'ACTIVE')
       ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'ACTIVE'
       RETURNING *`,
      [organizationId, userId]
    );

    return {
      ...memberRes.rows[0],
      email: emailNorm,
      firstName: data.firstName,
      lastName: data.lastName,
      avatarUrl: data.avatarUrl || null,
      avatar_url: data.avatarUrl || null,
      initialPassword: initialPassword || undefined,
      isGeneratedPassword,
    };
  }

  async UpdateStudentDetails(organizationId: string, studentUserId: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string | null;
    status?: string;
  }) {
    const checkRes = await executeQuery(
      `SELECT om.id, u.id as user_id, u.email
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.user_id = $2 AND om.role_id = 'STUDENT'`,
      [organizationId, studentUserId]
    );

    if (checkRes.rowCount === 0) {
      throw ApiError.notFound('Student account not found in this organization.');
    }

    const userFields: string[] = [];
    const userParams: any[] = [studentUserId];

    if (data.firstName !== undefined) {
      userParams.push(data.firstName.trim());
      userFields.push(`first_name = $${userParams.length}`);
    }
    if (data.lastName !== undefined) {
      userParams.push(data.lastName.trim());
      userFields.push(`last_name = $${userParams.length}`);
    }
    if (data.phone !== undefined) {
      userParams.push(data.phone ? data.phone.trim() : null);
      userFields.push(`phone = $${userParams.length}`);
    }
    if (data.avatarUrl !== undefined) {
      userParams.push(data.avatarUrl ? data.avatarUrl.trim() : null);
      userFields.push(`avatar_url = $${userParams.length}`);
    }

    if (userFields.length > 0) {
      userFields.push(`updated_at = CURRENT_TIMESTAMP`);
      await executeQuery(
        `UPDATE ${this.schema}.users SET ${userFields.join(', ')} WHERE id = $1`,
        userParams
      );
    }

    if (data.status) {
      await executeQuery(
        `UPDATE ${this.schema}.organization_members
         SET status = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = $2 AND user_id = $3`,
        [data.status, organizationId, studentUserId]
      );
    }

    const updatedRes = await executeQuery(
      `SELECT om.id as membership_id, om.status,
              u.id as user_id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.last_login_at, u.last_login_ip
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.user_id = $2`,
      [organizationId, studentUserId]
    );

    return updatedRes.rows[0];
  }

  async ResetStudentPassword(
    organizationId: string,
    studentUserId: string,
    newPassword?: string,
    actorId?: string,
    actorName?: string,
    clientIp?: string
  ) {
    const checkRes = await executeQuery(
      `SELECT om.id, u.id as user_id, u.email, u.first_name, u.last_name
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.user_id = $2 AND om.role_id = 'STUDENT'`,
      [organizationId, studentUserId]
    );

    if (checkRes.rowCount === 0) {
      throw ApiError.notFound('Student account not found in this organization.');
    }

    const student = checkRes.rows[0];
    const targetPassword = newPassword || PasswordUtils.generateSecurePassword(12);
    const hash = await PasswordUtils.hashPassword(targetPassword);

    await executeQuery(
      `UPDATE ${this.schema}.users
       SET password_hash = $1,
           must_reset_password = TRUE,
           current_session_id = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hash, studentUserId]
    );

    if (isLoopbackIp(clientIp)) {
      clientIp = await FetchPublicIp();
    }

    try {
      await executeQuery(
        `INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, ip_address, metadata)
         VALUES ($1::uuid, $2::uuid, 'STUDENT_PASSWORD_RESET', 'users', $3::text, $4::text, $5::jsonb)`,
        [
          organizationId,
          actorId || null,
          studentUserId,
          clientIp,
          JSON.stringify({
            studentEmail: student.email,
            studentName: `${student.first_name} ${student.last_name}`.trim(),
            resetByUserId: actorId || null,
            resetByName: actorName || 'System',
          }),
        ]
      );
    } catch (auditErr) {
      console.error('[StudentService] Audit log insert error', auditErr);
    }

    return {
      success: true,
      studentId: studentUserId,
      studentEmail: student.email,
      temporaryPassword: targetPassword,
      message: 'Student password successfully reset. Any active sessions were invalidated.',
    };
  }

  async AssignStudentCourse(organizationId: string, studentUserId: string, courseId: string) {
    const res = await executeQuery(
      `INSERT INTO ${this.schema}.enrollments (organization_id, user_id, course_id, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (organization_id, user_id, course_id) DO UPDATE SET status = 'ACTIVE'
       RETURNING *`,
      [organizationId, studentUserId, courseId]
    );

    // Initialize course progress record
    const lessonsCountRes = await executeQuery(
      `SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`,
      [courseId]
    );
    const totalLessons = parseInt(lessonsCountRes.rows[0].count, 10);

    await executeQuery(
      `INSERT INTO ${this.schema}.student_course_progress (organization_id, user_id, course_id, total_lessons_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, user_id, course_id) DO UPDATE SET total_lessons_count = $4`,
      [organizationId, studentUserId, courseId, totalLessons]
    );

    return res.rows[0];
  }
}

export const studentService = new StudentService();

