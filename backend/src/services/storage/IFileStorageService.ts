export interface IFileUploadOptions {
  organizationId: string;
  category: 'videos' | 'documents' | 'assignments' | 'thumbnails' | 'certificates' | 'logos' | 'favicons';
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  customFileName?: string;
}

export interface IStoredFileMetadata {
  storageKey: string;
  url: string;
  fileSize: number;
  mimeType: string;
}

export interface IFileStorageService {
  UploadFile(options: IFileUploadOptions): Promise<IStoredFileMetadata>;
  DeleteFile(storageKey: string): Promise<boolean>;
  GetSignedFileUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
  GetFileMetadata(storageKey: string): Promise<IStoredFileMetadata | null>;
}
