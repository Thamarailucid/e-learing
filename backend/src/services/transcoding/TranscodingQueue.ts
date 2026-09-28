import { TranscodingService, TranscodingJob } from './TranscodingService';
import { executeQuery } from '../../database/connection';
import { EnvironmentConfig } from '../../config/environment';

class TranscodingQueue {
  private queue: TranscodingJob[] = [];
  private isProcessing: boolean = false;
  private transcodingService = new TranscodingService();

  public async enqueue(job: TranscodingJob): Promise<void> {
    if (!EnvironmentConfig.transcoding.enabled) {
      console.log(`[TranscodingQueue] Transcoding is disabled. Skipping job for lesson ${job.lessonId}.`);
      return;
    }

    this.queue.push(job);
    console.log(`[TranscodingQueue] Job enqueued for lesson ${job.lessonId}. Queue length: ${this.queue.length}`);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();

    if (job) {
      console.log(`[TranscodingQueue] Processing job for lesson ${job.lessonId}...`);
      try {
        await executeQuery(
          `UPDATE ${EnvironmentConfig.database.schema}.lessons SET hls_status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [job.lessonId]
        );
        await this.transcodingService.processJob(job);
        console.log(`[TranscodingQueue] ✅ Job completed for lesson ${job.lessonId}.`);
      } catch (error) {
        console.error(`[TranscodingQueue] ❌ Job failed for lesson ${job.lessonId}:`, error);
      }
    }

    this.isProcessing = false;
    this.processNext();
  }

  public async recoverInterruptedJobs(): Promise<void> {
    if (!EnvironmentConfig.transcoding.enabled) return;
    try {
      console.log('[TranscodingQueue] Recovering interrupted transcoding jobs...');
      const res = await executeQuery(
        `SELECT id as lesson_id, organization_id, source_video_key 
         FROM ${EnvironmentConfig.database.schema}.lessons 
         WHERE hls_status IN ('QUEUED', 'PROCESSING') AND source_video_key IS NOT NULL`
      );

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
    } catch (error) {
      console.error('[TranscodingQueue] Failed to recover interrupted jobs:', error);
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

export const transcodingQueue = new TranscodingQueue();
