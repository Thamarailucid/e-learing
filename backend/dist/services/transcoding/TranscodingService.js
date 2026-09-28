"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscodingService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const execFileAsync = util_1.default.promisify(child_process_1.execFile);
class TranscodingService {
    s3Client;
    bucketName;
    region;
    PROFILES = [
        { quality: '480p', height: 480, videoBitrate: '1000k', audioBitrate: '128k', maxrate: '1100k', bufsize: '1500k' },
        { quality: '720p', height: 720, videoBitrate: '2500k', audioBitrate: '128k', maxrate: '2800k', bufsize: '3500k' },
        { quality: '1080p', height: 1080, videoBitrate: '5000k', audioBitrate: '192k', maxrate: '5500k', bufsize: '7500k' },
    ];
    constructor() {
        this.bucketName = environment_1.EnvironmentConfig.storage.s3.bucketName;
        this.region = environment_1.EnvironmentConfig.storage.s3.region || 'ap-south-1';
        const clientConfig = {
            region: this.region,
        };
        if (environment_1.EnvironmentConfig.storage.s3.accessKeyId && environment_1.EnvironmentConfig.storage.s3.secretAccessKey) {
            clientConfig.credentials = {
                accessKeyId: environment_1.EnvironmentConfig.storage.s3.accessKeyId,
                secretAccessKey: environment_1.EnvironmentConfig.storage.s3.secretAccessKey,
            };
        }
        if (environment_1.EnvironmentConfig.storage.s3.endpoint) {
            clientConfig.endpoint = environment_1.EnvironmentConfig.storage.s3.endpoint;
        }
        this.s3Client = new client_s3_1.S3Client(clientConfig);
    }
    async processJob(job) {
        const tempDir = environment_1.EnvironmentConfig.transcoding.tempDir;
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        const workDir = path_1.default.join(tempDir, job.lessonId);
        try {
            if (fs_1.default.existsSync(workDir)) {
                fs_1.default.rmSync(workDir, { recursive: true, force: true });
            }
            fs_1.default.mkdirSync(workDir, { recursive: true });
            // 1. Download source MP4 from S3
            console.log(`[TranscodingService] Downloading source: ${job.sourceKey}`);
            const sourcePath = path_1.default.join(workDir, 'source.mp4');
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
                const profileDir = path_1.default.join(workDir, `v${profile.height}`);
                fs_1.default.mkdirSync(profileDir, { recursive: true });
                console.log(`[TranscodingService] Transcoding ${profile.quality}...`);
                await this.transcodeResolution(sourcePath, profileDir, profile);
            }
            // 5. Generate master.m3u8
            const masterContent = this.generateMasterPlaylist(applicableProfiles);
            fs_1.default.writeFileSync(path_1.default.join(workDir, 'master.m3u8'), masterContent, 'utf-8');
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
            await (0, connection_1.executeQuery)(`UPDATE ${environment_1.EnvironmentConfig.database.schema}.lessons 
         SET hls_master_url = $1, hls_status = 'COMPLETED', hls_variants = $2, 
             video_duration_seconds = $3, hls_error_message = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`, [masterUrl, JSON.stringify(hlsVariants), durationSeconds, job.lessonId]);
            console.log(`[TranscodingService] ✅ Completed: ${job.lessonId} → ${applicableProfiles.map(p => p.quality).join(', ')}`);
        }
        catch (error) {
            console.error(`[TranscodingService] ❌ Job failed for lesson ${job.lessonId}:`, error.message || error);
            await (0, connection_1.executeQuery)(`UPDATE ${environment_1.EnvironmentConfig.database.schema}.lessons 
         SET hls_status = 'FAILED', hls_error_message = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`, [String(error.message || 'Unknown transcoding error').substring(0, 500), job.lessonId]);
            throw error;
        }
        finally {
            // 9. Cleanup temp directory
            try {
                if (fs_1.default.existsSync(workDir)) {
                    fs_1.default.rmSync(workDir, { recursive: true, force: true });
                }
            }
            catch (cleanupErr) {
                console.warn('[TranscodingService] Cleanup warning:', cleanupErr);
            }
        }
    }
    /**
     * Transcode source to a single resolution using FFmpeg HLS output.
     */
    async transcodeResolution(sourcePath, outputDir, profile) {
        const segmentPattern = path_1.default.join(outputDir, 'segment_%04d.ts');
        const playlistPath = path_1.default.join(outputDir, 'playlist.m3u8');
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
    generateMasterPlaylist(profiles) {
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
    async downloadFromS3(key, destPath) {
        const cmd = new client_s3_1.GetObjectCommand({ Bucket: this.bucketName, Key: key });
        const response = await this.s3Client.send(cmd);
        const writeStream = fs_1.default.createWriteStream(destPath);
        return new Promise((resolve, reject) => {
            if (!response.Body)
                return reject(new Error('Empty S3 response body'));
            const bodyStream = response.Body;
            bodyStream.pipe(writeStream)
                .on('error', reject)
                .on('close', resolve);
        });
    }
    /**
     * Probe video file for height and duration using ffprobe.
     */
    async probeVideo(filePath) {
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
        }
        catch (err) {
            console.warn('[TranscodingService] ffprobe failed, using defaults:', err);
            return { height: 1080, duration: 0 };
        }
    }
    /**
     * Recursively upload a directory's contents to S3.
     */
    async uploadDirectoryToS3(dir, s3Prefix) {
        const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dir, entry.name);
            if (entry.name === 'source.mp4')
                continue; // Skip the downloaded source file
            if (entry.isDirectory()) {
                // Recurse into subdirectories (v480/, v720/, v1080/)
                await this.uploadDirectoryToS3(fullPath, `${s3Prefix}/${entry.name}`);
            }
            else if (entry.isFile()) {
                const fileContent = fs_1.default.readFileSync(fullPath);
                let contentType = 'application/octet-stream';
                if (entry.name.endsWith('.m3u8'))
                    contentType = 'application/vnd.apple.mpegurl';
                else if (entry.name.endsWith('.ts'))
                    contentType = 'video/mp2t';
                await this.s3Client.send(new client_s3_1.PutObjectCommand({
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
    parseBitrateToNumber(bitrate) {
        const num = parseInt(bitrate.replace(/[^0-9]/g, ''), 10);
        if (bitrate.toLowerCase().includes('k'))
            return num * 1000;
        if (bitrate.toLowerCase().includes('m'))
            return num * 1000000;
        return num;
    }
}
exports.TranscodingService = TranscodingService;
