import { IFileStorageService } from './IFileStorageService';
import { LocalFileStorageService } from './LocalFileStorageService';
import { S3FileStorageService } from './S3FileStorageService';
import { EnvironmentConfig } from '../../config/environment';

export class FileStorageFactory {
  private static instance: IFileStorageService;

  static getInstance(): IFileStorageService {
    if (!this.instance) {
      if (EnvironmentConfig.storage.provider === 's3') {
        this.instance = new S3FileStorageService();
      } else {
        this.instance = new LocalFileStorageService();
      }
    }
    return this.instance;
  }
}
