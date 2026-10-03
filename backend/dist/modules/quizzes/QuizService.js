"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizService = exports.QuizService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const ApiError_1 = require("../../utils/ApiError");
const FileStorageFactory_1 = require("../../services/storage/FileStorageFactory");
class QuizService {
    schema = environment_1.EnvironmentConfig.database.schema;
    storage = FileStorageFactory_1.FileStorageFactory.getInstance();
    async GetQuizList(organizationId, courseId) {
        const res = await (0, connection_1.executeQuery)(`SELECT q.id, q.title, q.description, q.passing_score_percentage, q.time_limit_minutes, q.max_attempts,
              (SELECT COUNT(*) FROM ${this.schema}.quiz_questions qq WHERE qq.quiz_id = q.id) as question_count
       FROM ${this.schema}.quizzes q
       WHERE q.course_id = $1 AND q.organization_id = $2
       ORDER BY q.created_at ASC`, [courseId, organizationId]);
        return res.rows;
    }
    async GetQuizDetails(organizationId, quizId, hideAnswers = true) {
        const quizRes = await (0, connection_1.executeQuery)(`SELECT * FROM ${this.schema}.quizzes WHERE id = $1 AND organization_id = $2`, [quizId, organizationId]);
        if (quizRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Quiz not found.');
        const quiz = quizRes.rows[0];
        const questionsRes = await (0, connection_1.executeQuery)(`SELECT id, question_text, options, points, order_index,
              ${hideAnswers ? 'NULL as correct_answer' : 'correct_answer'},
              ${hideAnswers ? 'NULL as explanation' : 'explanation'}
       FROM ${this.schema}.quiz_questions
       WHERE quiz_id = $1 AND organization_id = $2
       ORDER BY order_index ASC`, [quizId, organizationId]);
        return {
            ...quiz,
            questions: questionsRes.rows,
        };
    }
    async CreateQuiz(organizationId, data) {
        const quizRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.quizzes (
        organization_id, course_id, section_id, title, description,
        passing_score_percentage, time_limit_minutes, max_attempts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [
            organizationId,
            data.courseId,
            data.sectionId || null,
            data.title,
            data.description || null,
            data.passingScorePercentage || 70,
            data.timeLimitMinutes || 20,
            data.maxAttempts || 3,
        ]);
        const quiz = quizRes.rows[0];
        if (data.questions && data.questions.length > 0) {
            for (let i = 0; i < data.questions.length; i++) {
                const q = data.questions[i];
                await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.quiz_questions (
            organization_id, quiz_id, question_text, options, correct_answer, explanation, points, order_index
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                    organizationId,
                    quiz.id,
                    q.questionText,
                    JSON.stringify(q.options),
                    q.correctAnswer,
                    q.explanation || null,
                    q.points || 1,
                    i,
                ]);
            }
        }
        return this.GetQuizDetails(organizationId, quiz.id, false);
    }
    async SubmitQuizAttempt(organizationId, userId, quizId, submittedAnswers) {
        const fullQuiz = await this.GetQuizDetails(organizationId, quizId, false);
        const questions = fullQuiz.questions;
        let correctCount = 0;
        const totalQuestions = questions.length || 1;
        questions.forEach((q) => {
            const studentAnswer = submittedAnswers[q.id];
            if (studentAnswer && studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
                correctCount++;
            }
        });
        const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
        const isPassed = scorePercentage >= fullQuiz.passing_score_percentage;
        const attemptRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.quiz_attempts (
        organization_id, quiz_id, user_id, score_percentage, is_passed, answers
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [organizationId, quizId, userId, scorePercentage, isPassed, JSON.stringify(submittedAnswers)]);
        return {
            attemptId: attemptRes.rows[0].id,
            scorePercentage,
            isPassed,
            correctCount,
            totalQuestions,
            passingScorePercentage: fullQuiz.passing_score_percentage,
        };
    }
    async UploadQuizAttachment(organizationId, quizId, file) {
        const uploadResult = await this.storage.UploadFile({
            organizationId,
            category: 'documents',
            fileName: file.originalname,
            mimeType: file.mimetype,
            buffer: file.buffer,
        });
        const quizRes = await (0, connection_1.executeQuery)(`SELECT attachments FROM ${this.schema}.quizzes WHERE id = $1 AND organization_id = $2`, [quizId, organizationId]);
        if (quizRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Quiz not found.');
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
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.quizzes 
       SET attachments = $1::jsonb, 
           document_url = COALESCE(document_url, $2)
       WHERE id = $3 AND organization_id = $4`, [JSON.stringify(updatedAttachments), uploadResult.url, quizId, organizationId]);
        return { attachment: newAttachment, attachments: updatedAttachments };
    }
    async DeleteQuizAttachment(organizationId, quizId, attachmentUrl) {
        const quizRes = await (0, connection_1.executeQuery)(`SELECT attachments FROM ${this.schema}.quizzes WHERE id = $1 AND organization_id = $2`, [quizId, organizationId]);
        if (quizRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Quiz not found.');
        const existingAttachments = quizRes.rows[0].attachments || [];
        const target = existingAttachments.find((att) => att.url === attachmentUrl || att.storageKey === attachmentUrl || att.id === attachmentUrl || att.name === attachmentUrl);
        if (target?.storageKey) {
            await this.storage.DeleteFile(target.storageKey).catch(console.error);
        }
        const updatedAttachments = existingAttachments.filter((att) => att.url !== attachmentUrl && att.storageKey !== attachmentUrl && att.id !== attachmentUrl && att.name !== attachmentUrl);
        const newDocUrl = updatedAttachments.length > 0 ? (updatedAttachments[0].url || updatedAttachments[0].file_url) : null;
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.quizzes 
       SET attachments = $1::jsonb, 
           document_url = $2
       WHERE id = $3 AND organization_id = $4`, [JSON.stringify(updatedAttachments), newDocUrl, quizId, organizationId]);
        return { success: true, attachments: updatedAttachments };
    }
}
exports.QuizService = QuizService;
exports.quizService = new QuizService();
