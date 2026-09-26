"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3FileStorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const environment_1 = require("../../config/environment");
class S3FileStorageService {
    s3Client;
    bucket;
    region;
    constructor() {
        this.bucket = environment_1.EnvironmentConfig.storage.s3.bucketName;
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
    async UploadFile(options) {
        const finalFileName = options.customFileName
            ? options.customFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
            : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const storageKey = `organizations/${options.organizationId}/${options.category}/${finalFileName}`;
        await this.s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: storageKey,
            Body: options.buffer,
            ContentType: options.mimeType,
        }));
        const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
        return {
            storageKey,
            url: s3Url,
            fileSize: options.buffer.length,
            mimeType: options.mimeType,
        };
    }
    async DeleteFile(storageKey) {
        try {
            await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: storageKey,
            }));
            return true;
        }
        catch (err) {
            console.error('[S3FileStorageService] Failed to delete file:', err);
            return false;
        }
    }
    async GetSignedFileUrl(storageKey, _expiresInSeconds = 3600) {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
    }
    async GetFileMetadata(storageKey) {
        try {
            const head = await this.s3Client.send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: storageKey,
            }));
            return {
                storageKey,
                url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`,
                fileSize: head.ContentLength || 0,
                mimeType: head.ContentType || 'application/octet-stream',
            };
        }
        catch {
            return null;
        }
    }
}
exports.S3FileStorageService = S3FileStorageService;
