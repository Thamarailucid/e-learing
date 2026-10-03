import { executeQuery } from '../../database/connection';
import { EnvironmentConfig } from '../../config/environment';
import { ApiError } from '../../utils/ApiError';
import { FileStorageFactory } from '../../services/storage/FileStorageFactory';

export class QuizService {
  private schema = EnvironmentConfig.database.schema;
  private storage = FileStorageFactory.getInstance();

  async GetQuizList(organizationId: string, courseId: string) {
    const res = await executeQuery(
      `SELECT q.id, q.title, q.description, q.passing_score_percentage, q.time_limit_minutes, q.max_attempts,
              (SELECT COUNT(*) FROM ${this.schema}.quiz_questions qq WHERE qq.quiz_id = q.id) as question_count
       FROM ${this.schema}.quizzes q
       WHERE q.course_id = $1 AND q.organization_id = $2
       ORDER BY q.created_at ASC`,
      [courseId, organizationId]
    );
    return res.rows;
  }

  async GetQuizDetails(organizationId: string, quizId: string, hideAnswers = true) {
    const quizRes = await executeQuery(
      `SELECT * FROM ${this.schema}.quizzes WHERE id = $1 AND organization_id = $2`,
      [quizId, organizationId]
    );
    if (quizRes.rowCount === 0) throw ApiError.notFound('Quiz not found.');
    const quiz = quizRes.rows[0];

    const questionsRes = await executeQuery(
      `SELECT id, question_text, options, points, order_index,
              ${hideAnswers ? 'NULL as correct_answer' : 'correct_answer'},
              ${hideAnswers ? 'NULL as explanation' : 'explanation'}
       FROM ${this.schema}.quiz_questions
       WHERE quiz_id = $1 AND organization_id = $2
       ORDER BY order_index ASC`,
      [quizId, organizationId]
    );

    return {
      ...quiz,
      questions: questionsRes.rows,
    };
  }

  async CreateQuiz(organizationId: string, data: {
    courseId: string;
    sectionId?: string;
    title: string;
    description?: string;
    passingScorePercentage?: number;
    timeLimitMinutes?: number;
    maxAttempts?: number;
    quizType?: string;
    questions?: Array<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      explanation?: string;
      points?: number;
    }>;
  }) {
    const quizRes = await executeQuery(
      `INSERT INTO ${this.schema}.quizzes (
        organization_id, course_id, section_id, title, description,
        passing_score_percentage, time_limit_minutes, max_attempts, quiz_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        organizationId,
        data.courseId,
        data.sectionId || null,
        data.title,
        data.description || null,
        data.passingScorePercentage || 70,
        data.timeLimitMinutes || 20,
        data.maxAttempts || null,
        data.quizType || 'MODULE',
      ]
    );

    const quiz = quizRes.rows[0];

    if (data.questions && data.questions.length > 0) {
      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        await executeQuery(
          `INSERT INTO ${this.schema}.quiz_questions (
            organization_id, quiz_id, question_text, options, correct_answer, explanation, points, order_index
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            organizationId,
            quiz.id,
            q.questionText,
            JSON.stringify(q.options),
            q.correctAnswer,
            q.explanation || null,
            q.points || 1,
            i,
          ]
        );
      }
    }

    return this.GetQuizDetails(organizationId, quiz.id, false);
  }

  async GetStudentQuizAttempts(organizationId: string, userId: string, quizId: string) {
    const res = await executeQuery(
      `SELECT id, attempt_number, score_percentage, is_passed, answers, completed_at
       FROM ${this.schema}.quiz_attempts
       WHERE organization_id = $1 AND user_id = $2 AND quiz_id = $3
       ORDER BY attempt_number ASC`,
      [organizationId, userId, quizId]
    );
    return res.rows;
  }

  async SubmitQuizAttempt(organizationId: string, userId: string, quizId: string, submittedAnswers: Record<string, string>) {
    const fullQuiz = await this.GetQuizDetails(organizationId, quizId, false);
    const questions = fullQuiz.questions;

    const attempts = await this.GetStudentQuizAttempts(organizationId, userId, quizId);
    if (fullQuiz.max_attempts !== null && attempts.length >= fullQuiz.max_attempts) {
      throw ApiError.badRequest('Maximum attempts reached for this quiz.');
    }

    const attemptNumber = attempts.length + 1;

    let correctCount = 0;
    const totalQuestions = questions.length || 1;
    
    const answersReview: any[] = [];

    questions.forEach((q: any) => {
      const studentAnswer = submittedAnswers[q.id];
      const isCorrect = studentAnswer && studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      if (isCorrect) {
        correctCount++;
      }
      answersReview.push({
        questionId: q.id,
        questionText: q.question_text,
        studentAnswer: studentAnswer || null,
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation
      });
    });

    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passingScorePercentage = fullQuiz.passing_score_percentage || 80;
    const isPassed = scorePercentage >= passingScorePercentage;

    const attemptRes = await executeQuery(
      `INSERT INTO ${this.schema}.quiz_attempts (
        organization_id, quiz_id, user_id, attempt_number, score_percentage, is_passed, answers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [organizationId, quizId, userId, attemptNumber, scorePercentage, isPassed, JSON.stringify(submittedAnswers)]
    );

    if (isPassed || fullQuiz.max_attempts === 1) {
      // Find the lesson linked to this quiz
      const lessonRes = await executeQuery(
        `SELECT id, course_id FROM ${this.schema}.lessons WHERE quiz_id = $1 AND organization_id = $2 LIMIT 1`,
        [quizId, organizationId]
      );
      if ((lessonRes.rowCount ?? 0) > 0) {
        const lesson = lessonRes.rows[0];
        
        // Mark lesson as completed
        await executeQuery(
          `INSERT INTO ${this.schema}.student_lesson_progress (
             organization_id, user_id, lesson_id, is_completed, watch_percentage, completed_at
           ) VALUES ($1, $2, $3, TRUE, 100.00, CURRENT_TIMESTAMP)
           ON CONFLICT (organization_id, user_id, lesson_id) 
           DO UPDATE SET is_completed = TRUE, watch_percentage = 100.00, completed_at = COALESCE(${this.schema}.student_lesson_progress.completed_at, CURRENT_TIMESTAMP)`,
          [organizationId, userId, lesson.id]
        );

        // Update student course progress
        await executeQuery(
          `UPDATE ${this.schema}.student_course_progress
           SET completed_lessons_count = (
                 SELECT COUNT(*) FROM ${this.schema}.student_lesson_progress
                 WHERE organization_id = $1 AND user_id = $2 AND is_completed = TRUE
                 AND lesson_id IN (SELECT id FROM ${this.schema}.lessons WHERE course_id = $3)
               ),
               last_activity_at = CURRENT_TIMESTAMP
           WHERE organization_id = $1 AND user_id = $2 AND course_id = $3`,
          [organizationId, userId, lesson.course_id]
        );
      }
    }

    return {
      attemptId: attemptRes.rows[0].id,
      scorePercentage,
      isPassed,
      passingScorePercentage,
      maxAttempts: fullQuiz.max_attempts,
      attemptsUsed: attemptNumber,
      correctCount,
      totalQuestions,
      answersReview,
    };
  }

  async UploadQuizAttachment(organizationId: string, quizId: string, file: Express.Multer.File) {
    const uploadResult = await this.storage.UploadFile({
      organizationId,
      category: 'documents',
      fileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    const quizRes = await executeQuery(
      `SELECT attachments FROM ${this.schema}.quizzes WHERE id = $1 AND organization_id = $2`,
      [quizId, organizationId]
    );
    if (quizRes.rowCount === 0) throw ApiError.notFound('Quiz not found.');

    const existingAttachments = quizRes.rows[0].attachments || [];
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

    await executeQuery(
      `UPDATE ${this.schema}.quizzes 
       SET attachments = $1::jsonb, 
           document_url = COALESCE(document_url, $2)
       WHERE id = $3 AND organization_id = $4`,
      [JSON.stringify(updatedAttachments), uploadResult.url, quizId, organizationId]
    );

    return { attachment: newAttachment, attachments: updatedAttachments };
  }

  async DeleteQuizAttachment(organizationId: string, quizId: string, attachmentUrl: string) {
    const quizRes = await executeQuery(
      `SELECT attachments FROM ${this.schema}.quizzes WHERE id = $1 AND organization_id = $2`,
      [quizId, organizationId]
    );
    if (quizRes.rowCount === 0) throw ApiError.notFound('Quiz not found.');

    const existingAttachments: any[] = quizRes.rows[0].attachments || [];
    const target = existingAttachments.find(
      (att: any) => att.url === attachmentUrl || att.storageKey === attachmentUrl || att.id === attachmentUrl || att.name === attachmentUrl
    );

    if (target?.storageKey) {
      await this.storage.DeleteFile(target.storageKey).catch(console.error);
    }

    const updatedAttachments = existingAttachments.filter(
      (att: any) => att.url !== attachmentUrl && att.storageKey !== attachmentUrl && att.id !== attachmentUrl && att.name !== attachmentUrl
    );
    const newDocUrl = updatedAttachments.length > 0 ? (updatedAttachments[0].url || updatedAttachments[0].file_url) : null;

    await executeQuery(
      `UPDATE ${this.schema}.quizzes 
       SET attachments = $1::jsonb, 
           document_url = $2
       WHERE id = $3 AND organization_id = $4`,
      [JSON.stringify(updatedAttachments), newDocUrl, quizId, organizationId]
    );

    return { success: true, attachments: updatedAttachments };
  }
  async UpdateQuiz(organizationId: string, quizId: string, data: { title?: string; description?: string; passingScorePercentage?: number; maxAttempts?: number; timeLimitMinutes?: number }) {
    const fields: string[] = [];
    const params: any[] = [quizId, organizationId];

    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined) {
        params.push(val);
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${params.length}`);
      }
    });

    if (fields.length === 0) return this.GetQuizDetails(organizationId, quizId, false);

    const res = await executeQuery(
      `UPDATE ${this.schema}.quizzes SET ${fields.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      params
    );
    if (res.rowCount === 0) throw ApiError.notFound('Quiz not found.');
    return this.GetQuizDetails(organizationId, quizId, false);
  }

  async AddQuizQuestion(organizationId: string, quizId: string, q: { questionText: string; options: string[]; correctAnswer: string; explanation?: string; points?: number; orderIndex?: number }) {
    const res = await executeQuery(
      `INSERT INTO ${this.schema}.quiz_questions (
        organization_id, quiz_id, question_text, options, correct_answer, explanation, points, order_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        organizationId,
        quizId,
        q.questionText,
        JSON.stringify(q.options),
        q.correctAnswer,
        q.explanation || null,
        q.points || 1,
        q.orderIndex || 0,
      ]
    );
    return res.rows[0];
  }

  async UpdateQuizQuestion(organizationId: string, questionId: string, q: { questionText?: string; options?: string[]; correctAnswer?: string; explanation?: string; points?: number; orderIndex?: number }) {
    const fields: string[] = [];
    const params: any[] = [questionId, organizationId];

    if (q.questionText !== undefined) { params.push(q.questionText); fields.push(`question_text = $${params.length}`); }
    if (q.options !== undefined) { params.push(JSON.stringify(q.options)); fields.push(`options = $${params.length}`); }
    if (q.correctAnswer !== undefined) { params.push(q.correctAnswer); fields.push(`correct_answer = $${params.length}`); }
    if (q.explanation !== undefined) { params.push(q.explanation); fields.push(`explanation = $${params.length}`); }
    if (q.points !== undefined) { params.push(q.points); fields.push(`points = $${params.length}`); }
    if (q.orderIndex !== undefined) { params.push(q.orderIndex); fields.push(`order_index = $${params.length}`); }

    if (fields.length === 0) {
      const existing = await executeQuery(`SELECT * FROM ${this.schema}.quiz_questions WHERE id = $1 AND organization_id = $2`, [questionId, organizationId]);
      if (existing.rowCount === 0) throw ApiError.notFound('Question not found.');
      return existing.rows[0];
    }

    const res = await executeQuery(
      `UPDATE ${this.schema}.quiz_questions SET ${fields.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      params
    );
    if (res.rowCount === 0) throw ApiError.notFound('Question not found.');
    return res.rows[0];
  }

  async DeleteQuizQuestion(organizationId: string, questionId: string) {
    const res = await executeQuery(
      `DELETE FROM ${this.schema}.quiz_questions WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [questionId, organizationId]
    );
    if (res.rowCount === 0) throw ApiError.notFound('Question not found.');
    return { success: true, message: 'Question deleted successfully' };
  }
  async EnsureModuleQuiz(organizationId: string, sectionId: string, courseId: string) {
    // Check if quiz exists
    const existingQuizRes = await executeQuery(
      `SELECT id FROM ${this.schema}.quizzes WHERE section_id = $1 AND organization_id = $2 LIMIT 1`,
      [sectionId, organizationId]
    );

    if ((existingQuizRes.rowCount ?? 0) > 0) {
      return this.GetQuizDetails(organizationId, existingQuizRes.rows[0].id, false);
    }

    const lessonQuizRes = await executeQuery(
      `SELECT quiz_id FROM ${this.schema}.lessons WHERE section_id = $1 AND content_type = 'QUIZ' AND organization_id = $2 AND quiz_id IS NOT NULL LIMIT 1`,
      [sectionId, organizationId]
    );

    if ((lessonQuizRes.rowCount ?? 0) > 0) {
      return this.GetQuizDetails(organizationId, lessonQuizRes.rows[0].quiz_id, false);
    }

    // Query section title
    const sectionRes = await executeQuery(
      `SELECT title FROM ${this.schema}.course_sections WHERE id = $1 AND organization_id = $2`,
      [sectionId, organizationId]
    );
    if (sectionRes.rowCount === 0) throw ApiError.notFound('Course section not found.');
    const sectionTitle = sectionRes.rows[0].title;

    const questions = [
      {
        questionText: "Module Quiz Question 1: What is the primary takeaway of this module?",
        options: ["Core Principle A", "Alternative Concept B", "Misconception C", "Secondary Detail D"],
        correctAnswer: "Core Principle A",
        explanation: "Choose the best answer representing core module foundations.",
        points: 1
      },
      {
        questionText: "Module Quiz Question 2: Which methodology best applies to this module?",
        options: ["Standard Practice", "Unsupported Hypothesis", "Unverified Approach", "Random Trial"],
        correctAnswer: "Standard Practice",
        explanation: "Standard industry methodology.",
        points: 1
      },
      {
        questionText: "Module Quiz Question 3: How should this module's concept be implemented?",
        options: ["Recommended Workflow", "Outdated Routine", "Incomplete Step", "Legacy Pattern"],
        correctAnswer: "Recommended Workflow",
        explanation: "Recommended workflow is the best choice.",
        points: 1
      }
    ];

    const quiz = await this.CreateQuiz(organizationId, {
      courseId,
      sectionId,
      title: `${sectionTitle} - Knowledge Check`,
      quizType: 'MODULE',
      passingScorePercentage: 70,
      maxAttempts: 1,
      timeLimitMinutes: 15,
      questions
    });

    // Query current max order_index of lessons in this section
    const orderRes = await executeQuery(
      `SELECT COALESCE(MAX(order_index), -1) as max_order FROM ${this.schema}.lessons WHERE section_id = $1`,
      [sectionId]
    );
    const maxOrderIndex = parseInt(orderRes.rows[0].max_order, 10);

    await executeQuery(
      `INSERT INTO ${this.schema}.lessons (
         organization_id, course_id, section_id, title, content_type, order_index, quiz_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [organizationId, courseId, sectionId, `${sectionTitle} Quiz`, 'QUIZ', maxOrderIndex + 1, quiz.id]
    );

    // Update student_course_progress.total_lessons_count
    const lessonsCountRes = await executeQuery(
      `SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`,
      [courseId]
    );
    const totalLessons = parseInt(lessonsCountRes.rows[0].count, 10);
    await executeQuery(
      `UPDATE ${this.schema}.student_course_progress SET total_lessons_count = $1 WHERE course_id = $2`,
      [totalLessons, courseId]
    );

    return this.GetQuizDetails(organizationId, quiz.id, false);
  }

  async EnsureFinalCourseQuiz(organizationId: string, courseId: string) {
    const existingRes = await executeQuery(
      `SELECT id FROM ${this.schema}.quizzes WHERE course_id = $1 AND quiz_type = 'FINAL' AND organization_id = $2 LIMIT 1`,
      [courseId, organizationId]
    );

    if ((existingRes.rowCount ?? 0) > 0) {
      return this.GetQuizDetails(organizationId, existingRes.rows[0].id, false);
    }

    const sectionsRes = await executeQuery(
      `SELECT id FROM ${this.schema}.course_sections WHERE course_id = $1 AND organization_id = $2 ORDER BY order_index DESC LIMIT 1`,
      [courseId, organizationId]
    );
    
    if (sectionsRes.rowCount === 0) throw ApiError.notFound('No sections found for this course.');
    const finalSectionId = sectionsRes.rows[0].id;

    const questions = Array.from({ length: 10 }, (_, i) => ({
      questionText: `Final Exam Question ${i + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'Choose the best answer.',
      points: 1
    }));

    const quiz = await this.CreateQuiz(organizationId, {
      courseId,
      sectionId: finalSectionId,
      title: 'Final Comprehensive Exam',
      quizType: 'FINAL',
      passingScorePercentage: 80,
      maxAttempts: undefined,
      questions
    });

    const orderRes = await executeQuery(
      `SELECT COALESCE(MAX(order_index), -1) as max_order FROM ${this.schema}.lessons WHERE section_id = $1`,
      [finalSectionId]
    );
    const maxOrderIndex = parseInt(orderRes.rows[0].max_order, 10);

    await executeQuery(
      `INSERT INTO ${this.schema}.lessons (
         organization_id, course_id, section_id, title, content_type, order_index, quiz_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [organizationId, courseId, finalSectionId, 'Final Comprehensive Exam', 'QUIZ', maxOrderIndex + 1, quiz.id]
    );

    const lessonsCountRes = await executeQuery(
      `SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`,
      [courseId]
    );
    const totalLessons = parseInt(lessonsCountRes.rows[0].count, 10);
    await executeQuery(
      `UPDATE ${this.schema}.student_course_progress SET total_lessons_count = $1 WHERE course_id = $2`,
      [totalLessons, courseId]
    );

    return this.GetQuizDetails(organizationId, quiz.id, false);
  }
}

export const quizService = new QuizService();
