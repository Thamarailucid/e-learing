"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalFileStorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const environment_1 = require("../../config/environment");
class LocalFileStorageService {
    getStorageDir(category) {
        const basePath = path_1.default.resolve(process.cwd(), environment_1.EnvironmentConfig.storage.local.basePath);
        const categoryPath = path_1.default.join(basePath, category);
        if (!fs_1.default.existsSync(categoryPath)) {
            fs_1.default.mkdirSync(categoryPath, { recursive: true });
        }
        return categoryPath;
    }
    async UploadFile(options) {
        const categoryDir = this.getStorageDir(options.category);
        const orgDir = path_1.default.join(categoryDir, options.organizationId);
        if (!fs_1.default.existsSync(orgDir)) {
            fs_1.default.mkdirSync(orgDir, { recursive: true });
        }
        let finalFileName;
        if (options.customFileName) {
            finalFileName = options.customFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        }
        else {
            const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const sanitizedFileName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            finalFileName = `${uniquePrefix}_${sanitizedFileName}`;
        }
        const filePath = path_1.default.join(orgDir, finalFileName);
        await fs_1.default.promises.writeFile(filePath, options.buffer);
        const relativeKey = `storage/${options.category}/${options.organizationId}/${finalFileName}`.replace(/\\/g, '/');
        const fileUrl = `${environment_1.EnvironmentConfig.application.backendUrl}/${relativeKey}`;
        return {
            storageKey: relativeKey,
            url: fileUrl,
            fileSize: options.buffer.length,
            mimeType: options.mimeType,
        };
    }
    async DeleteFile(storageKey) {
        const fullPath = path_1.default.resolve(process.cwd(), storageKey);
        if (fs_1.default.existsSync(fullPath)) {
            await fs_1.default.promises.unlink(fullPath);
            return true;
        }
        return false;
    }
    async GetSignedFileUrl(storageKey, _expiresInSeconds = 3600) {
        // For local development, stream via backend server route
        const normalizedKey = storageKey.replace(/\\/g, '/');
        return `${environment_1.EnvironmentConfig.application.backendUrl}/${normalizedKey}`;
    }
    async GetFileMetadata(storageKey) {
        const fullPath = path_1.default.resolve(process.cwd(), storageKey);
        if (!fs_1.default.existsSync(fullPath))
            return null;
        const stats = await fs_1.default.promises.stat(fullPath);
        return {
            storageKey,
            url: `${environment_1.EnvironmentConfig.application.backendUrl}/${storageKey.replace(/\\/g, '/')}`,
            fileSize: stats.size,
            mimeType: 'application/octet-stream',
        };
    }
}
exports.LocalFileStorageService = LocalFileStorageService;
