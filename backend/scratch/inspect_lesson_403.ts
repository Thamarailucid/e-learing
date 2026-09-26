import { executeQuery, dbPool } from '../src/database/connection';

async function inspectLesson() {
  const lessonId = 'ebb38bb9-5deb-4374-8fe4-fc2f4fac67e1';
  const res = await executeQuery(
    `SELECT l.id, l.title, l.course_id, l.organization_id, l.is_free_preview, l.video_url,
            c.title as course_title, c.is_published, c.is_private, o.name as org_name
     FROM novacodex.lessons l
     JOIN novacodex.courses c ON c.id = l.course_id
     JOIN novacodex.organizations o ON o.id = l.organization_id
     WHERE l.id = $1`,
    [lessonId]
  );
  console.log('Lesson:', res.rows);

  const enrollmentsRes = await executeQuery(
    `SELECT e.id, e.user_id, e.status, u.email, u.first_name
     FROM novacodex.enrollments e
     JOIN novacodex.users u ON u.id = e.user_id
     JOIN novacodex.lessons l ON l.course_id = e.course_id
     WHERE l.id = $1`,
    [lessonId]
  );
  console.log('Enrollments for course:', enrollmentsRes.rows);

  const allUsers = await executeQuery(
    `SELECT id, email, is_super_admin FROM novacodex.users ORDER BY created_at DESC LIMIT 5`
  );
  console.log('Recent users:', allUsers.rows);
}

inspectLesson().then(() => dbPool.end());
