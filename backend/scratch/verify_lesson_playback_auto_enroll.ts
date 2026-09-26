import { dbPool, executeQuery } from '../src/database/connection';
import { VideoService } from '../src/modules/videos/VideoService';

async function verifyPlaybackAutoEnroll() {
  const videoService = new VideoService();
  const lessonId = 'ebb38bb9-5deb-4374-8fe4-fc2f4fac67e1';
  const orgId = '50c841aa-95d7-41dc-acd9-15695a292d70';

  // Find a student who belongs to this org but is NOT enrolled in this course
  const studentRes = await executeQuery(
    `SELECT u.id, u.email FROM novacodex.users u
     JOIN novacodex.organization_members om ON om.user_id = u.id
     WHERE om.organization_id = $1 AND om.role_id = 'STUDENT' AND om.status = 'ACTIVE'
     LIMIT 1`,
    [orgId]
  );
  if (studentRes.rowCount === 0) {
    console.error('No active student found');
    return;
  }
  const student = studentRes.rows[0];
  console.log(`Testing with student: ${student.email} (${student.id})`);

  // Ensure student is NOT yet enrolled in this course before test
  const courseRes = await executeQuery(
    `SELECT course_id FROM novacodex.lessons WHERE id = $1`,
    [lessonId]
  );
  const courseId = courseRes.rows[0].course_id;
  await executeQuery(
    `DELETE FROM novacodex.enrollments WHERE user_id = $1 AND course_id = $2`,
    [student.id, courseId]
  );
  console.log('✓ Ensured student is not enrolled initially');

  // Call GenerateVideoPlaybackUrl
  const playbackUrl = await videoService.GenerateVideoPlaybackUrl(orgId, student.id, lessonId);
  console.log('✓ GenerateVideoPlaybackUrl succeeded!');
  console.log('Playback data:', playbackUrl);

  // Verify enrollment was automatically created
  const verifyEnroll = await executeQuery(
    `SELECT id, status FROM novacodex.enrollments WHERE user_id = $1 AND course_id = $2`,
    [student.id, courseId]
  );
  console.log('Enrollment record created:', verifyEnroll.rows);
  if (verifyEnroll.rowCount === 0 || verifyEnroll.rows[0].status !== 'ACTIVE') {
    throw new Error('FAILED: Enrollment was not automatically created!');
  }
  console.log('🎉 Auto-enrollment verified successfully for lesson video playback!');
}

verifyPlaybackAutoEnroll()
  .then(() => dbPool.end())
  .catch((e) => {
    console.error('Failed:', e);
    dbPool.end().then(() => process.exit(1));
  });
