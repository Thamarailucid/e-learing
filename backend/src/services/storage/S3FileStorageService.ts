import { IFileStorageService, IFileUploadOptions, IStoredFileMetadata } from './IFileStorageService';
import { EnvironmentConfig } from '../../config/environment';

export class S3FileStorageService implements IFileStorageService {
  async UploadFile(options: IFileUploadOptions): Promise<IStoredFileMetadata> {
    const finalFileName = options.customFileName
      ? options.customFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageKey = `organizations/${options.organizationId}/${options.category}/${finalFileName}`;

    // S3 integration stub when S3 credentials configured
    const s3Url = `https://${EnvironmentConfig.storage.s3.bucketName}.s3.${EnvironmentConfig.storage.s3.region}.amazonaws.com/${storageKey}`;
    return {
      storageKey,
      url: s3Url,
      fileSize: options.buffer.length,
      mimeType: options.mimeType,
    };
  }

  async DeleteFile(_storageKey: string): Promise<boolean> {
    return true;
  }

  async GetSignedFileUrl(storageKey: string, _expiresInSeconds = 3600): Promise<string> {
    return `https://${EnvironmentConfig.storage.s3.bucketName}.s3.${EnvironmentConfig.storage.s3.region}.amazonaws.com/${storageKey}?signature=mock_signed_url`;
  }

  async GetFileMetadata(storageKey: string): Promise<IStoredFileMetadata | null> {
    return {
      storageKey,
      url: `https://${EnvironmentConfig.storage.s3.bucketName}.s3.${EnvironmentConfig.storage.s3.region}.amazonaws.com/${storageKey}`,
      fileSize: 0,
      mimeType: 'application/octet-stream',
    };
  }
}
