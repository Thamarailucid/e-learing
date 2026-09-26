import fs from 'fs';
import path from 'path';
import { IFileStorageService, IFileUploadOptions, IStoredFileMetadata } from './IFileStorageService';
import { EnvironmentConfig } from '../../config/environment';

export class LocalFileStorageService implements IFileStorageService {
  private getStorageDir(category: IFileUploadOptions['category']): string {
    const basePath = path.resolve(process.cwd(), EnvironmentConfig.storage.local.basePath);
    const categoryPath = path.join(basePath, category);
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
    }
    return categoryPath;
  }

  async UploadFile(options: IFileUploadOptions): Promise<IStoredFileMetadata> {
    const categoryDir = this.getStorageDir(options.category);
    const orgDir = path.join(categoryDir, options.organizationId);
    if (!fs.existsSync(orgDir)) {
      fs.mkdirSync(orgDir, { recursive: true });
    }

    let finalFileName: string;
    if (options.customFileName) {
      finalFileName = options.customFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    } else {
      const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const sanitizedFileName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      finalFileName = `${uniquePrefix}_${sanitizedFileName}`;
    }
    const filePath = path.join(orgDir, finalFileName);

    await fs.promises.writeFile(filePath, options.buffer);

    const relativeKey = `storage/${options.category}/${options.organizationId}/${finalFileName}`.replace(/\\/g, '/');
    const fileUrl = `${EnvironmentConfig.application.backendUrl}/${relativeKey}`;

    return {
      storageKey: relativeKey,
      url: fileUrl,
      fileSize: options.buffer.length,
      mimeType: options.mimeType,
    };
  }

  async DeleteFile(storageKey: string): Promise<boolean> {
    const fullPath = path.resolve(process.cwd(), storageKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }

  async GetSignedFileUrl(storageKey: string, _expiresInSeconds = 3600): Promise<string> {
    // For local development, stream via backend server route
    const normalizedKey = storageKey.replace(/\\/g, '/');
    return `${EnvironmentConfig.application.backendUrl}/${normalizedKey}`;
  }

  async GetFileMetadata(storageKey: string): Promise<IStoredFileMetadata | null> {
    const fullPath = path.resolve(process.cwd(), storageKey);
    if (!fs.existsSync(fullPath)) return null;

    const stats = await fs.promises.stat(fullPath);
    return {
      storageKey,
      url: `${EnvironmentConfig.application.backendUrl}/${storageKey.replace(/\\/g, '/')}`,
      fileSize: stats.size,
      mimeType: 'application/octet-stream',
    };
  }
}
