import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { executeQuery } from '../../database/connection';
import { EnvironmentConfig } from '../../config/environment';
import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const execFileAsync = util.promisify(execFile);

export interface TranscodingJob {
  lessonId: string;
  organizationId: string;
  sourceKey: string;
}

interface ResolutionProfile {
  quality: string;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
  maxrate: string;
  bufsize: string;
}

export class TranscodingService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  private readonly PROFILES: ResolutionProfile[] = [
    { quality: '480p', height: 480, videoBitrate: '1000k', audioBitrate: '128k', maxrate: '1100k', bufsize: '1500k' },
    { quality: '720p', height: 720, videoBitrate: '2500k', audioBitrate: '128k', maxrate: '2800k', bufsize: '3500k' },
    { quality: '1080p', height: 1080, videoBitrate: '5000k', audioBitrate: '192k', maxrate: '5500k', bufsize: '7500k' },
  ];

  constructor() {
    this.bucketName = EnvironmentConfig.storage.s3.bucketName;
    this.region = EnvironmentConfig.storage.s3.region || 'ap-south-1';

    const clientConfig: any = {
      region: this.region,
    };

    if (EnvironmentConfig.storage.s3.accessKeyId && EnvironmentConfig.storage.s3.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: EnvironmentConfig.storage.s3.accessKeyId,
        secretAccessKey: EnvironmentConfig.storage.s3.secretAccessKey,
      };
    }

    if (EnvironmentConfig.storage.s3.endpoint) {
      clientConfig.endpoint = EnvironmentConfig.storage.s3.endpoint;
    }

    this.s3Client = new S3Client(clientConfig);
  }

  public async processJob(job: TranscodingJob): Promise<void> {
    const tempDir = EnvironmentConfig.transcoding.tempDir;
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const workDir = path.join(tempDir, job.lessonId);

    try {
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
      fs.mkdirSync(workDir, { recursive: true });

      // 1. Download source MP4 from S3
      console.log(`[TranscodingService] Downloading source: ${job.sourceKey}`);
      const sourcePath = path.join(workDir, 'source.mp4');
      await this.downloadFromS3(job.sourceKey, sourcePath);

      // 2. Probe source video for height and duration
      console.log(`[TranscodingService] Probing video...`);
      const probeData = await this.probeVideo(sourcePath);
      const sourceHeight = probeData.height;
      const durationSeconds = Math.round(probeData.duration);
      console.log(`[TranscodingService] Source: ${sourceHeight}p, ${durationSeconds}s`);

      // 3. Filter profiles to only include heights <= source height
      let applicableProfiles = this.PROFILES.filter(p => p.height <= sourceHeight);
      if (applicableProfiles.length === 0) {
        // Source is smaller than 480p — use original resolution
        applicableProfiles = [{
          quality: `${sourceHeight}p`,
          height: sourceHeight,
          videoBitrate: '1000k',
          audioBitrate: '128k',
          maxrate: '1100k',
          bufsize: '1500k',
        }];
      }

      // 4. Run FFmpeg for each resolution
      for (const profile of applicableProfiles) {
        const profileDir = path.join(workDir, `v${profile.height}`);
        fs.mkdirSync(profileDir, { recursive: true });
        console.log(`[TranscodingService] Transcoding ${profile.quality}...`);
        await this.transcodeResolution(sourcePath, profileDir, profile);
      }

      // 5. Generate master.m3u8
      const masterContent = this.generateMasterPlaylist(applicableProfiles);
      fs.writeFileSync(path.join(workDir, 'master.m3u8'), masterContent, 'utf-8');

      // 6. Upload all HLS outputs to S3
      const hlsPrefix = `organizations/${job.organizationId}/hls/${job.lessonId}`;
      console.log(`[TranscodingService] Uploading HLS to S3: ${hlsPrefix}/`);
      await this.uploadDirectoryToS3(workDir, hlsPrefix);

      // 7. Build result
      const masterUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${hlsPrefix}/master.m3u8`;
      const hlsVariants = applicableProfiles.map(p => ({
        quality: p.quality,
        height: p.height,
        bandwidth: this.parseBitrateToNumber(p.videoBitrate) + this.parseBitrateToNumber(p.audioBitrate),
        playlist: `v${p.height}/playlist.m3u8`,
      }));

      // 8. Update database
      await executeQuery(
        `UPDATE ${EnvironmentConfig.database.schema}.lessons 
         SET hls_master_url = $1, hls_status = 'COMPLETED', hls_variants = $2, 
             video_duration_seconds = $3, hls_error_message = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [masterUrl, JSON.stringify(hlsVariants), durationSeconds, job.lessonId]
      );

      console.log(`[TranscodingService] ✅ Completed: ${job.lessonId} → ${applicableProfiles.map(p => p.quality).join(', ')}`);
    } catch (error: any) {
      console.error(`[TranscodingService] ❌ Job failed for lesson ${job.lessonId}:`, error.message || error);
      await executeQuery(
        `UPDATE ${EnvironmentConfig.database.schema}.lessons 
         SET hls_status = 'FAILED', hls_error_message = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [String(error.message || 'Unknown transcoding error').substring(0, 500), job.lessonId]
      );
      throw error;
    } finally {
      // 9. Cleanup temp directory
      try {
        if (fs.existsSync(workDir)) {
          fs.rmSync(workDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        console.warn('[TranscodingService] Cleanup warning:', cleanupErr);
      }
    }
  }

  /**
   * Transcode source to a single resolution using FFmpeg HLS output.
   */
  private async transcodeResolution(sourcePath: string, outputDir: string, profile: ResolutionProfile): Promise<void> {
    const segmentPattern = path.join(outputDir, 'segment_%04d.ts');
    const playlistPath = path.join(outputDir, 'playlist.m3u8');

    const args = [
      '-i', sourcePath,
      '-vf', `scale=-2:${profile.height}`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-b:v', profile.videoBitrate,
      '-maxrate', profile.maxrate,
      '-bufsize', profile.bufsize,
      '-c:a', 'aac',
      '-b:a', profile.audioBitrate,
      '-ac', '2',
      '-g', '48',
      '-keyint_min', '48',
      '-sc_threshold', '0',
      '-f', 'hls',
      '-hls_time', '6',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', segmentPattern,
      playlistPath,
    ];

    await execFileAsync('ffmpeg', args, { maxBuffer: 50 * 1024 * 1024 });
  }

  /**
   * Generate master.m3u8 manifest referencing all variant playlists.
   */
  private generateMasterPlaylist(profiles: ResolutionProfile[]): string {
    let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    for (const profile of profiles) {
      const bandwidth = this.parseBitrateToNumber(profile.videoBitrate) + this.parseBitrateToNumber(profile.audioBitrate);
      const width = Math.round((profile.height * 16) / 9);
      // Ensure width is even
      const evenWidth = width % 2 === 0 ? width : width + 1;

      content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${evenWidth}x${profile.height},NAME="${profile.quality}"\n`;
      content += `v${profile.height}/playlist.m3u8\n\n`;
    }

    return content;
  }

  /**
   * Download a file from S3 to local disk.
   */
  private async downloadFromS3(key: string, destPath: string): Promise<void> {
    const cmd = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    const response = await this.s3Client.send(cmd);
    const writeStream = fs.createWriteStream(destPath);

    return new Promise((resolve, reject) => {
      if (!response.Body) return reject(new Error('Empty S3 response body'));
      const bodyStream = response.Body as Readable;
      bodyStream.pipe(writeStream)
        .on('error', reject)
        .on('close', resolve);
    });
  }

  /**
   * Probe video file for height and duration using ffprobe.
   */
  private async probeVideo(filePath: string): Promise<{ height: number; duration: number }> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=height',
        '-show_entries', 'format=duration',
        '-of', 'json',
        filePath,
      ]);

      const data = JSON.parse(stdout);
      const height = data?.streams?.[0]?.height || 1080;
      const duration = parseFloat(data?.format?.duration || '0');
      return { height, duration };
    } catch (err) {
      console.warn('[TranscodingService] ffprobe failed, using defaults:', err);
      return { height: 1080, duration: 0 };
    }
  }

  /**
   * Recursively upload a directory's contents to S3.
   */
  private async uploadDirectoryToS3(dir: string, s3Prefix: string): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.name === 'source.mp4') continue; // Skip the downloaded source file

      if (entry.isDirectory()) {
        // Recurse into subdirectories (v480/, v720/, v1080/)
        await this.uploadDirectoryToS3(fullPath, `${s3Prefix}/${entry.name}`);
      } else if (entry.isFile()) {
        const fileContent = fs.readFileSync(fullPath);
        let contentType = 'application/octet-stream';
        if (entry.name.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
        else if (entry.name.endsWith('.ts')) contentType = 'video/mp2t';

        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucketName,
          Key: `${s3Prefix}/${entry.name}`,
          Body: fileContent,
          ContentType: contentType,
        }));
      }
    }
  }

  /**
   * Parse bitrate string like '1000k' to number in bps.
   */
  private parseBitrateToNumber(bitrate: string): number {
    const num = parseInt(bitrate.replace(/[^0-9]/g, ''), 10);
    if (bitrate.toLowerCase().includes('k')) return num * 1000;
    if (bitrate.toLowerCase().includes('m')) return num * 1000000;
    return num;
  }
}
