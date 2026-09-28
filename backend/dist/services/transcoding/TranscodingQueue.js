"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcodingQueue = void 0;
const TranscodingService_1 = require("./TranscodingService");
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
class TranscodingQueue {
    queue = [];
    isProcessing = false;
    transcodingService = new TranscodingService_1.TranscodingService();
    async enqueue(job) {
        if (!environment_1.EnvironmentConfig.transcoding.enabled) {
            console.log(`[TranscodingQueue] Transcoding is disabled. Skipping job for lesson ${job.lessonId}.`);
            return;
        }
        this.queue.push(job);
        console.log(`[TranscodingQueue] Job enqueued for lesson ${job.lessonId}. Queue length: ${this.queue.length}`);
        this.processNext();
    }
    async processNext() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }
        this.isProcessing = true;
        const job = this.queue.shift();
        if (job) {
            console.log(`[TranscodingQueue] Processing job for lesson ${job.lessonId}...`);
            try {
                await (0, connection_1.executeQuery)(`UPDATE ${environment_1.EnvironmentConfig.database.schema}.lessons SET hls_status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [job.lessonId]);
                await this.transcodingService.processJob(job);
                console.log(`[TranscodingQueue] ✅ Job completed for lesson ${job.lessonId}.`);
            }
            catch (error) {
                console.error(`[TranscodingQueue] ❌ Job failed for lesson ${job.lessonId}:`, error);
            }
        }
        this.isProcessing = false;
        this.processNext();
    }
    async recoverInterruptedJobs() {
        if (!environment_1.EnvironmentConfig.transcoding.enabled)
            return;
        try {
            console.log('[TranscodingQueue] Recovering interrupted transcoding jobs...');
            const res = await (0, connection_1.executeQuery)(`SELECT id as lesson_id, organization_id, source_video_key 
         FROM ${environment_1.EnvironmentConfig.database.schema}.lessons 
         WHERE hls_status IN ('QUEUED', 'PROCESSING') AND source_video_key IS NOT NULL`);
            if (res.rows.length === 0) {
                console.log('[TranscodingQueue] No interrupted jobs found.');
                return;
            }
            for (const row of res.rows) {
                console.log(`[TranscodingQueue] Recovered job for lesson ${row.lesson_id}`);
                this.enqueue({
                    lessonId: row.lesson_id,
                    organizationId: row.organization_id,
                    sourceKey: row.source_video_key,
                });
            }
        }
        catch (error) {
            console.error('[TranscodingQueue] Failed to recover interrupted jobs:', error);
        }
    }
    getQueueLength() {
        return this.queue.length;
    }
    isCurrentlyProcessing() {
        return this.isProcessing;
    }
}
exports.transcodingQueue = new TranscodingQueue();
