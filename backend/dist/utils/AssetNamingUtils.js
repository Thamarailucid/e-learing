"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetNamingUtils = void 0;
const path_1 = __importDefault(require("path"));
class AssetNamingUtils {
    /**
     * Sanitizes string to lowercase alphanumeric characters only
     */
    static cleanSlug(text) {
        if (!text)
            return '';
        return text.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    /**
     * Extracts clean file extension from filename or returns fallback
     */
    static getExtension(originalName, defaultExt = 'png') {
        const ext = path_1.default.extname(originalName || '').replace('.', '').toLowerCase();
        return ext || defaultExt;
    }
    /**
     * Formats name for organization favicon: orgnamefavicon.ico / orgnamefavicon.png
     */
    static getFaviconName(orgSlug, originalName) {
        const ext = this.getExtension(originalName, 'ico');
        const slug = this.cleanSlug(orgSlug) || 'org';
        return `${slug}favicon.${ext}`;
    }
    /**
     * Formats name for organization logo: orgnamelogo.png
     */
    static getLogoName(orgSlug, originalName) {
        const ext = this.getExtension(originalName, 'png');
        const slug = this.cleanSlug(orgSlug) || 'org';
        return `${slug}logo.${ext}`;
    }
    /**
     * Formats name for organization certificate background: orgnamecertbackground.png
     */
    static getCertificateBackgroundName(orgSlug, originalName) {
        const ext = this.getExtension(originalName, 'png');
        const slug = this.cleanSlug(orgSlug) || 'org';
        return `${slug}certbackground.${ext}`;
    }
    /**
     * Formats name for organization certificate signature: orgnamesignature.png
     */
    static getCertificateSignatureName(orgSlug, originalName) {
        const ext = this.getExtension(originalName, 'png');
        const slug = this.cleanSlug(orgSlug) || 'org';
        return `${slug}signature.${ext}`;
    }
    /**
     * Formats name for course thumbnail: orgnamereactbasiccouse.jpg
     */
    static getCourseThumbnailName(orgSlug, courseSlugOrTitle, originalName) {
        const ext = this.getExtension(originalName, 'jpg');
        const org = this.cleanSlug(orgSlug) || 'org';
        const course = this.cleanSlug(courseSlugOrTitle) || 'course';
        return `${org}${course}.${ext}`;
    }
    /**
     * Formats name for course video: orgnamecoursevideolesson_timestamp.mp4
     */
    static getVideoName(orgSlug, courseSlugOrTitle, lessonTitle, originalName) {
        const ext = this.getExtension(originalName, 'mp4');
        const org = this.cleanSlug(orgSlug) || 'org';
        const course = this.cleanSlug(courseSlugOrTitle) || 'course';
        const lesson = this.cleanSlug(lessonTitle) || 'lesson';
        return `${org}${course}${lesson}_${Date.now()}.${ext}`;
    }
}
exports.AssetNamingUtils = AssetNamingUtils;
