import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { IFileStorageService, IFileUploadOptions, IStoredFileMetadata } from './IFileStorageService';
import { EnvironmentConfig } from '../../config/environment';

export class S3FileStorageService implements IFileStorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.bucket = EnvironmentConfig.storage.s3.bucketName;
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

  async UploadFile(options: IFileUploadOptions): Promise<IStoredFileMetadata> {
    const finalFileName = options.customFileName
      ? options.customFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageKey = `organizations/${options.organizationId}/${options.category}/${finalFileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: options.buffer,
        ContentType: options.mimeType,
      })
    );

    const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;

    return {
      storageKey,
      url: s3Url,
      fileSize: options.buffer.length,
      mimeType: options.mimeType,
    };
  }

  async DeleteFile(storageKey: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        })
      );
      return true;
    } catch (err) {
      console.error('[S3FileStorageService] Failed to delete file:', err);
      return false;
    }
  }

  async GetSignedFileUrl(storageKey: string, _expiresInSeconds = 3600): Promise<string> {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }

  async GetFileMetadata(storageKey: string): Promise<IStoredFileMetadata | null> {
    try {
      const head = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        })
      );
      return {
        storageKey,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`,
        fileSize: head.ContentLength || 0,
        mimeType: head.ContentType || 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }
}
