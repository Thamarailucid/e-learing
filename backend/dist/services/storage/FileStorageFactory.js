"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageFactory = void 0;
const LocalFileStorageService_1 = require("./LocalFileStorageService");
const S3FileStorageService_1 = require("./S3FileStorageService");
const environment_1 = require("../../config/environment");
class FileStorageFactory {
    static instance;
    static getInstance() {
        if (!this.instance) {
            if (environment_1.EnvironmentConfig.storage.provider === 's3') {
                this.instance = new S3FileStorageService_1.S3FileStorageService();
            }
            else {
                this.instance = new LocalFileStorageService_1.LocalFileStorageService();
            }
        }
        return this.instance;
    }
}
exports.FileStorageFactory = FileStorageFactory;
