"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitializeDatabase = InitializeDatabase;
const pg_1 = require("pg");
const connection_1 = require("./connection");
const environment_1 = require("../config/environment");
const PasswordUtils_1 = require("../utils/PasswordUtils");
async function ensureDatabaseExists() {
    const adminClient = new pg_1.Client({
        host: environment_1.EnvironmentConfig.database.host,
        port: environment_1.EnvironmentConfig.database.port,
        database: 'postgres',
        user: environment_1.EnvironmentConfig.database.user,
        password: environment_1.EnvironmentConfig.database.password,
    });
    try {
        await adminClient.connect();
        const res = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [environment_1.EnvironmentConfig.database.database]);
        if (res.rowCount === 0) {
            console.log(`[DB Init] Database "${environment_1.EnvironmentConfig.database.database}" does not exist. Creating...`);
            await adminClient.query(`CREATE DATABASE "${environment_1.EnvironmentConfig.database.database}"`);
            console.log(`[DB Init] Database "${environment_1.EnvironmentConfig.database.database}" created successfully.`);
        }
    }
    catch (err) {
        console.warn(`[DB Init Warning] Could not verify/create database via postgres admin client: ${err.message}. Assuming target database already exists.`);
    }
    finally {
        try {
            await adminClient.end();
        }
        catch { }
    }
}
async function InitializeDatabase() {
    console.log('[DB Init] Starting PostgreSQL schema & table initialization...');
    await ensureDatabaseExists();
    // 1. Create Schema
    await (0, connection_1.executeQuery)(`CREATE SCHEMA IF NOT EXISTS ${environment_1.EnvironmentConfig.database.schema};`);
    // 2. Core Tables
    const schema = environment_1.EnvironmentConfig.database.schema;
    await (0, connection_1.executeQuery)(`
    -- Users table
    CREATE TABLE IF NOT EXISTS ${schema}.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      avatar_url TEXT,
      is_super_admin BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      email_verified BOOLEAN DEFAULT FALSE,
      must_reset_password BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Organizations table
    CREATE TABLE IF NOT EXISTS ${schema}.organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      domain VARCHAR(255),
      logo_url TEXT,
      favicon_url TEXT,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      plan_type VARCHAR(50) DEFAULT 'STARTER',
      license_type VARCHAR(50) DEFAULT 'SUBSCRIPTION',
      license_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      license_end_date TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '365 days'),
      license_is_active BOOLEAN DEFAULT TRUE,
      show_plan_tier_to_org BOOLEAN DEFAULT TRUE,
      license_warning_days INTEGER DEFAULT 2,
      max_students INTEGER DEFAULT 200,
      max_courses INTEGER DEFAULT 25,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Roles table
    CREATE TABLE IF NOT EXISTS ${schema}.roles (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_system BOOLEAN DEFAULT TRUE
    );

    -- Permissions table
    CREATE TABLE IF NOT EXISTS ${schema}.permissions (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT
    );

    -- Role Permissions table
    CREATE TABLE IF NOT EXISTS ${schema}.role_permissions (
      role_id VARCHAR(50) REFERENCES ${schema}.roles(id) ON DELETE CASCADE,
      permission_id VARCHAR(100) REFERENCES ${schema}.permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    -- Organization Members table
    CREATE TABLE IF NOT EXISTS ${schema}.organization_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
      role_id VARCHAR(50) NOT NULL REFERENCES ${schema}.roles(id),
      department_id UUID,
      team_id UUID,
      permissions JSONB DEFAULT '{"can_edit_students":false,"can_reset_student_passwords":false,"can_manage_courses":false,"can_manage_campaigns":false,"can_manage_staff":false,"can_manage_bulk_staff":false,"can_view_reports":false}'::jsonb,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, user_id)
    );

    -- Organization Theme Settings
    CREATE TABLE IF NOT EXISTS ${schema}.organization_theme_settings (
      organization_id UUID PRIMARY KEY REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      primary_color VARCHAR(50) DEFAULT '#000000',
      secondary_color VARCHAR(50) DEFAULT '#ffffff',
      sidebar_color VARCHAR(50) DEFAULT '#0a0a0a',
      sidebar_text_color VARCHAR(50) DEFAULT '#ffffff',
      border_color VARCHAR(50) DEFAULT '#e5e5e5',
      button_color VARCHAR(50) DEFAULT '#111111',
      button_text_color VARCHAR(50) DEFAULT '#ffffff',
      font_family VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif',
      border_radius_md VARCHAR(20) DEFAULT '12px',
      certificate_title VARCHAR(255) DEFAULT 'Certificate of Completion',
      certificate_signatory_name VARCHAR(255) DEFAULT 'Academic Director',
      certificate_signatory_title VARCHAR(255) DEFAULT 'Head of Education & Certification',
      certificate_signature_url TEXT,
      certificate_background_url TEXT,
      certificate_accent_color VARCHAR(50) DEFAULT '#0f172a',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Organization SMTP Settings
    CREATE TABLE IF NOT EXISTS ${schema}.organization_smtp_settings (
      organization_id UUID PRIMARY KEY REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      smtp_host VARCHAR(255),
      smtp_port INTEGER DEFAULT 587,
      smtp_username VARCHAR(255),
      smtp_password_encrypted TEXT,
      smtp_secure BOOLEAN DEFAULT FALSE,
      from_name VARCHAR(150),
      from_email VARCHAR(255),
      reply_to_email VARCHAR(255),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Departments table
    CREATE TABLE IF NOT EXISTS ${schema}.departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Teams table
    CREATE TABLE IF NOT EXISTS ${schema}.teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      department_id UUID REFERENCES ${schema}.departments(id) ON DELETE SET NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Courses table
    CREATE TABLE IF NOT EXISTS ${schema}.courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      short_description VARCHAR(500),
      thumbnail_url TEXT,
      level VARCHAR(50) DEFAULT 'BEGINNER',
      category VARCHAR(100) DEFAULT 'General',
      status VARCHAR(50) DEFAULT 'DRAFT',
      is_published BOOLEAN DEFAULT FALSE,
      min_video_watch_percentage INTEGER DEFAULT 80,
      pass_quiz_percentage INTEGER DEFAULT 70,
      created_by UUID REFERENCES ${schema}.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Course Sections / Modules
    CREATE TABLE IF NOT EXISTS ${schema}.course_sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES ${schema}.courses(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Lessons table
    CREATE TABLE IF NOT EXISTS ${schema}.lessons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES ${schema}.courses(id) ON DELETE CASCADE,
      section_id UUID NOT NULL REFERENCES ${schema}.course_sections(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content_type VARCHAR(50) DEFAULT 'VIDEO',
      video_url TEXT,
      video_duration_seconds INTEGER DEFAULT 0,
      article_content TEXT,
      document_url TEXT,
      order_index INTEGER DEFAULT 0,
      is_free_preview BOOLEAN DEFAULT FALSE,
      video_file_size_bytes BIGINT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Video Interactive Questions
    CREATE TABLE IF NOT EXISTS ${schema}.video_interactive_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      lesson_id UUID NOT NULL REFERENCES ${schema}.lessons(id) ON DELETE CASCADE,
      timestamp_seconds INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type VARCHAR(50) DEFAULT 'MCQ',
      options JSONB NOT NULL DEFAULT '[]'::jsonb,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      is_required BOOLEAN DEFAULT TRUE,
      display_mode VARCHAR(50) DEFAULT 'FIXED',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Enrollments table
    CREATE TABLE IF NOT EXISTS ${schema}.enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES ${schema}.courses(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(organization_id, user_id, course_id)
    );

    -- Student Course Progress
    CREATE TABLE IF NOT EXISTS ${schema}.student_course_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES ${schema}.courses(id) ON DELETE CASCADE,
      completed_lessons_count INTEGER DEFAULT 0,
      total_lessons_count INTEGER DEFAULT 0,
      progress_percentage NUMERIC(5, 2) DEFAULT 0.00,
      is_completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP WITH TIME ZONE,
      last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, user_id, course_id)
    );

    -- Student Lesson Progress
    CREATE TABLE IF NOT EXISTS ${schema}.student_lesson_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
      lesson_id UUID NOT NULL REFERENCES ${schema}.lessons(id) ON DELETE CASCADE,
      is_completed BOOLEAN DEFAULT FALSE,
      last_position_seconds INTEGER DEFAULT 0,
      watch_percentage NUMERIC(5, 2) DEFAULT 0.00,
      completed_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(organization_id, user_id, lesson_id)
    );

    -- Quizzes table
    CREATE TABLE IF NOT EXISTS ${schema}.quizzes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES ${schema}.courses(id) ON DELETE CASCADE,
      section_id UUID REFERENCES ${schema}.course_sections(id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      passing_score_percentage INTEGER DEFAULT 70,
      time_limit_minutes INTEGER DEFAULT 20,
      max_attempts INTEGER DEFAULT 3,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Quiz Questions
    CREATE TABLE IF NOT EXISTS ${schema}.quiz_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      quiz_id UUID NOT NULL REFERENCES ${schema}.quizzes(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      options JSONB NOT NULL DEFAULT '[]'::jsonb,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      points INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0
    );

    -- Quiz Attempts
    CREATE TABLE IF NOT EXISTS ${schema}.quiz_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      quiz_id UUID NOT NULL REFERENCES ${schema}.quizzes(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
      attempt_number INTEGER DEFAULT 1,
      score_percentage NUMERIC(5, 2) DEFAULT 0.00,
      is_passed BOOLEAN DEFAULT FALSE,
      answers JSONB DEFAULT '{}'::jsonb,
      completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Certificates table
    CREATE TABLE IF NOT EXISTS ${schema}.certificates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES ${schema}.courses(id) ON DELETE CASCADE,
      certificate_number VARCHAR(100) NOT NULL UNIQUE,
      student_name VARCHAR(200) NOT NULL,
      course_title VARCHAR(255) NOT NULL,
      organization_name VARCHAR(255) NOT NULL,
      issue_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      verification_url TEXT NOT NULL,
      qr_code_data TEXT,
      UNIQUE(organization_id, user_id, course_id)
    );

    -- Student Notes
    CREATE TABLE IF NOT EXISTS ${schema}.student_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
      lesson_id UUID NOT NULL REFERENCES ${schema}.lessons(id) ON DELETE CASCADE,
      timestamp_seconds INTEGER DEFAULT 0,
      note_text TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs table
    CREATE TABLE IF NOT EXISTS ${schema}.audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      user_id UUID,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100) NOT NULL,
      resource_id VARCHAR(100),
      ip_address VARCHAR(50),
      user_agent TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Course Categories table (supports platform defaults & tenant custom categories)
    CREATE TABLE IF NOT EXISTS ${schema}.course_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(50) DEFAULT 'book',
      is_system BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Course Difficulty Levels table (supports platform defaults & tenant custom levels)
    CREATE TABLE IF NOT EXISTS ${schema}.course_difficulty_levels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) NOT NULL,
      description TEXT,
      badge_color VARCHAR(50) DEFAULT 'blue',
      is_system BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Course Outreach & Marketing Campaign Links (Private / College Shared Access)
    CREATE TABLE IF NOT EXISTS ${schema}.course_campaign_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES ${schema}.courses(id) ON DELETE CASCADE,
      campaign_name VARCHAR(255) NOT NULL,
      target_institution VARCHAR(255) NOT NULL,
      invite_code VARCHAR(100) NOT NULL UNIQUE,
      max_redemptions INTEGER DEFAULT 100,
      current_redemptions INTEGER DEFAULT 0,
      expires_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT TRUE,
      created_by UUID REFERENCES ${schema}.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Course Campaign Redemptions (Tracks students who claimed access via outreach link)
    CREATE TABLE IF NOT EXISTS ${schema}.course_campaign_redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_link_id UUID NOT NULL REFERENCES ${schema}.course_campaign_links(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES ${schema}.courses(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
      ip_address VARCHAR(100),
      redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(campaign_link_id, user_id)
    );

    -- Course Security Violations (Logs screenshot, screen recording, and unauthorized capture attempts)
    CREATE TABLE IF NOT EXISTS ${schema}.course_security_violations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES ${schema}.users(id) ON DELETE SET NULL,
      course_id UUID REFERENCES ${schema}.courses(id) ON DELETE CASCADE,
      lesson_id UUID REFERENCES ${schema}.lessons(id) ON DELETE SET NULL,
      violation_type VARCHAR(100) NOT NULL,
      client_ip VARCHAR(50),
      user_agent TEXT,
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Organization Role Permissions (Customized 6-switch page control rights per role)
    CREATE TABLE IF NOT EXISTS ${schema}.organization_role_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      role_id VARCHAR(50) NOT NULL,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_org_role_perm UNIQUE (organization_id, role_id)
    );

    -- Staff Invite Links (Shareable Links & QR Codes for Bulk Staff Onboarding)
    CREATE TABLE IF NOT EXISTS ${schema}.staff_invite_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      invite_code VARCHAR(100) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      role_id VARCHAR(50) NOT NULL,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      max_registrations INTEGER DEFAULT 500,
      current_registrations INTEGER DEFAULT 0,
      expires_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT TRUE,
      created_by UUID REFERENCES ${schema}.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Staff Invite Redemptions (Tracks staff self-registration via invite link)
    CREATE TABLE IF NOT EXISTS ${schema}.staff_invite_redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invite_id UUID NOT NULL REFERENCES ${schema}.staff_invite_links(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES ${schema}.users(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES ${schema}.organizations(id) ON DELETE CASCADE,
      client_ip VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_staff_invite_user UNIQUE (invite_id, user_id)
    );
  `);
    // 3. Idempotent Column Additions & Schema Synchronizations (Guarantees production DB compatibility)
    await (0, connection_1.executeQuery)(`
    -- Organizations columns
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS favicon_url TEXT;
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'STARTER';
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 200;
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS max_courses INTEGER DEFAULT 25;
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS license_type VARCHAR(50) DEFAULT 'SUBSCRIPTION';
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS license_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS license_end_date TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '365 days');
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS license_is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS show_plan_tier_to_org BOOLEAN DEFAULT TRUE;
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS license_warning_days INTEGER DEFAULT 2;
    ALTER TABLE ${schema}.organizations ADD COLUMN IF NOT EXISTS invite_code VARCHAR(50);

    -- Users columns
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(100);
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS current_session_id VARCHAR(255);
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE ${schema}.users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT FALSE;

    -- Organization Members columns
    ALTER TABLE ${schema}.organization_members ADD COLUMN IF NOT EXISTS department_id UUID;
    ALTER TABLE ${schema}.organization_members ADD COLUMN IF NOT EXISTS team_id UUID;
    ALTER TABLE ${schema}.organization_members ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
    ALTER TABLE ${schema}.organization_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_edit_students":false,"can_reset_student_passwords":false,"can_manage_courses":false,"can_manage_campaigns":false,"can_manage_staff":false,"can_manage_bulk_staff":false,"can_view_reports":false}'::jsonb;

    -- Organization Theme Settings columns
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50) DEFAULT '#000000';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(50) DEFAULT '#ffffff';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS sidebar_color VARCHAR(50) DEFAULT '#0a0a0a';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS sidebar_text_color VARCHAR(50) DEFAULT '#ffffff';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS border_color VARCHAR(50) DEFAULT '#e5e5e5';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS button_color VARCHAR(50) DEFAULT '#111111';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS button_text_color VARCHAR(50) DEFAULT '#ffffff';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS font_family VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS border_radius_md VARCHAR(20) DEFAULT '12px';

    -- Courses columns
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS short_description VARCHAR(500);
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'BEGINNER';
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT';
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS access_type VARCHAR(50) DEFAULT 'PUBLIC';
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS min_video_watch_percentage INTEGER DEFAULT 80;
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS pass_quiz_percentage INTEGER DEFAULT 70;
    ALTER TABLE ${schema}.courses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES ${schema}.users(id);

    -- Lessons columns
    ALTER TABLE ${schema}.lessons ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'VIDEO';
    ALTER TABLE ${schema}.lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE ${schema}.lessons ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER DEFAULT 0;
    ALTER TABLE ${schema}.lessons ADD COLUMN IF NOT EXISTS article_content TEXT;
    ALTER TABLE ${schema}.lessons ADD COLUMN IF NOT EXISTS document_url TEXT;
    ALTER TABLE ${schema}.lessons ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
    ALTER TABLE ${schema}.lessons ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN DEFAULT FALSE;

    -- Video Interactive Questions columns
    ALTER TABLE ${schema}.video_interactive_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
    ALTER TABLE ${schema}.video_interactive_questions ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT TRUE;
    ALTER TABLE ${schema}.video_interactive_questions ADD COLUMN IF NOT EXISTS display_mode VARCHAR(50) DEFAULT 'FIXED';

    -- Course Categories columns
    ALTER TABLE ${schema}.course_categories ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'book';
    ALTER TABLE ${schema}.course_categories ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
    ALTER TABLE ${schema}.course_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE ${schema}.course_categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

    -- Course Difficulty Levels columns
    ALTER TABLE ${schema}.course_difficulty_levels ADD COLUMN IF NOT EXISTS badge_color VARCHAR(50) DEFAULT 'blue';
    ALTER TABLE ${schema}.course_difficulty_levels ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
    ALTER TABLE ${schema}.course_difficulty_levels ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE ${schema}.course_difficulty_levels ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

    -- Organization Theme Settings & Certificate Design columns
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS certificate_title VARCHAR(255) DEFAULT 'Certificate of Completion';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS certificate_signatory_name VARCHAR(255) DEFAULT 'Academic Director';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS certificate_signatory_title VARCHAR(255) DEFAULT 'Head of Education & Certification';
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS certificate_signature_url TEXT;
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS certificate_background_url TEXT;
    ALTER TABLE ${schema}.organization_theme_settings ADD COLUMN IF NOT EXISTS certificate_accent_color VARCHAR(50) DEFAULT '#0f172a';

    -- Student Course Progress Dynamic Resume Tracking
    ALTER TABLE ${schema}.student_course_progress ADD COLUMN IF NOT EXISTS last_lesson_id UUID;
    ALTER TABLE ${schema}.student_course_progress ADD COLUMN IF NOT EXISTS last_position_seconds INTEGER DEFAULT 0;

    -- Student Lesson Progress timestamps
    ALTER TABLE ${schema}.student_lesson_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `);
    // 4. Create Performance Indexes
    await (0, connection_1.executeQuery)(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON ${schema}.users(email);
    CREATE INDEX IF NOT EXISTS idx_users_session ON ${schema}.users(current_session_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_org ON ${schema}.organization_members(organization_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_user ON ${schema}.organization_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_courses_org ON ${schema}.courses(organization_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_course ON ${schema}.lessons(course_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_user ON ${schema}.enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_org ON ${schema}.enrollments(organization_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user_course ON ${schema}.student_course_progress(user_id, course_id);
    CREATE INDEX IF NOT EXISTS idx_audit_org ON ${schema}.audit_logs(organization_id);
    CREATE INDEX IF NOT EXISTS idx_certs_number ON ${schema}.certificates(certificate_number);
    CREATE INDEX IF NOT EXISTS idx_course_categories_org ON ${schema}.course_categories(organization_id);
    CREATE INDEX IF NOT EXISTS idx_course_levels_org ON ${schema}.course_difficulty_levels(organization_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_links_org ON ${schema}.course_campaign_links(organization_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_links_code ON ${schema}.course_campaign_links(invite_code);
    CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_user ON ${schema}.course_campaign_redemptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sec_violations_org ON ${schema}.course_security_violations(organization_id);
    CREATE INDEX IF NOT EXISTS idx_sec_violations_course ON ${schema}.course_security_violations(course_id);
    CREATE INDEX IF NOT EXISTS idx_org_role_perms ON ${schema}.organization_role_permissions(organization_id);
    CREATE INDEX IF NOT EXISTS idx_staff_invite_org ON ${schema}.staff_invite_links(organization_id);
    CREATE INDEX IF NOT EXISTS idx_staff_invite_code ON ${schema}.staff_invite_links(invite_code);
    CREATE INDEX IF NOT EXISTS idx_staff_invite_redemptions_user ON ${schema}.staff_invite_redemptions(user_id);

    -- Backfill can_manage_campaigns and can_manage_bulk_staff in permissions JSONB for existing organization_members
    UPDATE ${schema}.organization_members
    SET permissions = jsonb_set(
      jsonb_set(COALESCE(permissions, '{}'::jsonb), '{can_manage_bulk_staff}',
        CASE WHEN role_id IN ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN') THEN 'true'::jsonb ELSE 'false'::jsonb END
      ),
      '{can_manage_campaigns}',
      CASE WHEN role_id IN ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN') OR (permissions->>'can_manage_courses' = 'true') THEN 'true'::jsonb ELSE 'false'::jsonb END
    )
    WHERE NOT (permissions ? 'can_manage_bulk_staff') OR NOT (permissions ? 'can_manage_campaigns');
  `);
    // 5. Seed Standard Roles
    const roles = [
        { id: 'SUPER_ADMIN', name: 'Super Admin', description: 'Platform Operations Administrator' },
        { id: 'ORGANIZATION_OWNER', name: 'Organization Owner', description: 'Organization Creator and Billing Owner' },
        { id: 'ORGANIZATION_ADMIN', name: 'Organization Admin', description: 'Full Organization Administrator' },
        { id: 'MANAGER', name: 'Team / Department Manager', description: 'Oversees team progress and completions' },
        { id: 'INSTRUCTOR', name: 'Instructor / Trainer', description: 'Builds courses, uploads videos, creates quizzes' },
        { id: 'CONTENT_MANAGER', name: 'Content Manager', description: 'Curates and organizes course modules' },
        { id: 'REVIEWER', name: 'Reviewer', description: 'Reviews courses prior to publication' },
        { id: 'SUPPORT_STAFF', name: 'Support Staff', description: 'Assists students and staff' },
        { id: 'STUDENT', name: 'Student / Learner', description: 'Enrolls in courses, watches videos, earns certificates' },
    ];
    for (const r of roles) {
        await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.roles (id, name, description, is_system)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;`, [r.id, r.name, r.description]);
    }
    // 6. Seed Standard Permissions
    const permissions = [
        { id: 'courses:read', name: 'Read Courses', category: 'Courses', description: 'View course catalog and modules' },
        { id: 'courses:write', name: 'Create & Edit Courses', category: 'Courses', description: 'Author lessons, sections, and courses' },
        { id: 'courses:publish', name: 'Publish Courses', category: 'Courses', description: 'Publish or unpublish courses for students' },
        { id: 'videos:upload', name: 'Upload Videos', category: 'Content', description: 'Upload course video assets' },
        { id: 'videos:stream', name: 'Stream Videos', category: 'Content', description: 'Watch and stream lesson videos' },
        { id: 'students:read', name: 'View Students', category: 'Users', description: 'List organization students and view progress' },
        { id: 'students:manage', name: 'Manage Students', category: 'Users', description: 'Enroll, create, and manage student accounts' },
        { id: 'staff:manage', name: 'Manage Staff', category: 'Users', description: 'Invite instructors, admins, and managers' },
        { id: 'staff:invites', name: 'Bulk Staff Onboarding & QR Links', category: 'Users', description: 'Generate bulk staff registration links and scannable QR codes' },
        { id: 'quizzes:manage', name: 'Manage Quizzes', category: 'Assessments', description: 'Create and edit quizzes and questions' },
        { id: 'quizzes:attempt', name: 'Attempt Quizzes', category: 'Assessments', description: 'Take course quizzes and submit answers' },
        { id: 'certificates:issue', name: 'Issue Certificates', category: 'Certificates', description: 'Generate and verify completion certificates' },
        { id: 'settings:manage', name: 'Manage Organization Settings', category: 'Settings', description: 'Configure branding, theme, and profile' },
        { id: 'superadmin:all', name: 'Platform Operations', category: 'Platform', description: 'Full Super Administrator platform control' },
    ];
    for (const p of permissions) {
        await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.permissions (id, name, category, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, description = EXCLUDED.description;`, [p.id, p.name, p.category, p.description]);
    }
    // 7. Map Permissions to Standard Roles
    const rolePermissionsMap = {
        SUPER_ADMIN: permissions.map((p) => p.id),
        ORGANIZATION_OWNER: [
            'courses:read', 'courses:write', 'courses:publish', 'videos:upload', 'videos:stream',
            'students:read', 'students:manage', 'staff:manage', 'quizzes:manage', 'certificates:issue', 'settings:manage'
        ],
        ORGANIZATION_ADMIN: [
            'courses:read', 'courses:write', 'courses:publish', 'videos:upload', 'videos:stream',
            'students:read', 'students:manage', 'staff:manage', 'quizzes:manage', 'certificates:issue', 'settings:manage'
        ],
        INSTRUCTOR: [
            'courses:read', 'courses:write', 'videos:upload', 'videos:stream', 'quizzes:manage', 'students:read'
        ],
        MANAGER: [
            'courses:read', 'videos:stream', 'students:read'
        ],
        STUDENT: [
            'courses:read', 'videos:stream', 'quizzes:attempt'
        ],
    };
    for (const [roleId, permIds] of Object.entries(rolePermissionsMap)) {
        for (const permId of permIds) {
            await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id) DO NOTHING;`, [roleId, permId]);
        }
    }
    // 7.1 Seed Standard Course Categories
    const standardCategories = [
        { name: 'Software Engineering', slug: 'software-engineering', description: 'Full-stack development, software architecture, backend APIs & frontend systems', icon: 'code', order: 1 },
        { name: 'Web Development', slug: 'web-development', description: 'React, Vue, Node.js, modern CSS and frontend engineering', icon: 'globe', order: 2 },
        { name: 'Cloud & DevOps', slug: 'cloud-devops', description: 'AWS, Docker, Kubernetes, CI/CD pipelines & cloud infrastructure', icon: 'cloud', order: 3 },
        { name: 'Data Science & AI', slug: 'data-science-ai', description: 'Machine learning, Python, data analysis & generative AI applications', icon: 'cpu', order: 4 },
        { name: 'UI/UX Design', slug: 'ui-ux-design', description: 'Design systems, Figma, user research & product interaction design', icon: 'layout', order: 5 },
        { name: 'Business & Product', slug: 'business-product', description: 'Product management, SaaS growth, agile methodologies & leadership', icon: 'briefcase', order: 6 },
        { name: 'Cybersecurity & Compliance', slug: 'cybersecurity-compliance', description: 'Information security, network defense, compliance & audit protocols', icon: 'shield', order: 7 },
        { name: 'General Foundation', slug: 'general', description: 'Fundamental learning tracks and orientation courses', icon: 'book-open', order: 8 },
    ];
    for (const cat of standardCategories) {
        const existing = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.course_categories WHERE organization_id IS NULL AND slug = $1`, [cat.slug]);
        if (existing.rowCount === 0) {
            await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.course_categories (organization_id, name, slug, description, icon, is_system, is_active, display_order)
         VALUES (NULL, $1, $2, $3, $4, TRUE, TRUE, $5)`, [cat.name, cat.slug, cat.description, cat.icon, cat.order]);
        }
        else {
            await (0, connection_1.executeQuery)(`UPDATE ${schema}.course_categories
         SET name = $1, description = $2, icon = $3, display_order = $4, is_system = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`, [cat.name, cat.description, cat.icon, cat.order, existing.rows[0].id]);
        }
    }
    // 7.2 Seed Standard Course Difficulty Levels
    const standardLevels = [
        { name: 'Beginner', code: 'BEGINNER', description: 'No prior experience required; foundational concepts and step-by-step guidance', color: 'green', order: 1 },
        { name: 'Intermediate', code: 'INTERMEDIATE', description: 'Requires basic fundamentals; dives deeper into practical implementation', color: 'blue', order: 2 },
        { name: 'Advanced', code: 'ADVANCED', description: 'Complex problem solving, architectural patterns and high-performance design', color: 'orange', order: 3 },
        { name: 'Expert', code: 'EXPERT', description: 'Deep domain mastery, production troubleshooting and enterprise engineering', color: 'purple', order: 4 },
        { name: 'All Levels', code: 'ALL_LEVELS', description: 'Comprehensive curriculum suitable for all background levels', color: 'cyan', order: 5 },
    ];
    for (const lvl of standardLevels) {
        const existing = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.course_difficulty_levels WHERE organization_id IS NULL AND code = $1`, [lvl.code]);
        if (existing.rowCount === 0) {
            await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.course_difficulty_levels (organization_id, name, code, description, badge_color, is_system, is_active, display_order)
         VALUES (NULL, $1, $2, $3, $4, TRUE, TRUE, $5)`, [lvl.name, lvl.code, lvl.description, lvl.color, lvl.order]);
        }
        else {
            await (0, connection_1.executeQuery)(`UPDATE ${schema}.course_difficulty_levels
         SET name = $1, description = $2, badge_color = $3, display_order = $4, is_system = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`, [lvl.name, lvl.description, lvl.color, lvl.order, existing.rows[0].id]);
        }
    }
    // 8. Seed / Update Super Admin
    const adminEmail = environment_1.EnvironmentConfig.superAdmin.email.toLowerCase();
    const existingAdmin = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.users WHERE email = $1`, [adminEmail]);
    if (existingAdmin.rowCount === 0) {
        const passwordHash = await PasswordUtils_1.PasswordUtils.hashPassword(environment_1.EnvironmentConfig.superAdmin.password);
        await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.users (email, password_hash, first_name, last_name, is_super_admin, is_active, email_verified)
       VALUES ($1, $2, 'Super', 'Administrator', TRUE, TRUE, TRUE)`, [adminEmail, passwordHash]);
        console.log(`[DB Init] Super Admin user created with email: ${adminEmail}`);
    }
    else {
        console.log(`[DB Init] Super Admin user already exists: ${adminEmail}`);
    }
    // 9. Seed Default Showcase Academy (Apex Coding Academy)
    let orgId;
    const existingOrg = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.organizations WHERE slug = 'apex-academy'`);
    if (existingOrg.rowCount === 0) {
        const orgRes = await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.organizations (name, slug, domain, plan_type, status)
       VALUES ('Apex Coding Academy', 'apex-academy', 'learn.apexacademy.com', 'BUSINESS', 'ACTIVE')
       RETURNING id`);
        orgId = orgRes.rows[0].id;
    }
    else {
        orgId = existingOrg.rows[0].id;
    }
    // Theme settings
    await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.organization_theme_settings (
      organization_id, primary_color, secondary_color, sidebar_color, sidebar_text_color, button_color, button_text_color,
      certificate_title, certificate_signatory_name, certificate_signatory_title, certificate_accent_color
     ) VALUES ($1, '#4f46e5', '#ffffff', '#0f172a', '#ffffff', '#4f46e5', '#ffffff', 'Certificate of Completion', 'Dr. Vikram Malhotra', 'Dean of Academic Affairs', '#4f46e5')
     ON CONFLICT (organization_id) DO UPDATE SET
       certificate_title = COALESCE(organization_theme_settings.certificate_title, EXCLUDED.certificate_title),
       certificate_signatory_name = COALESCE(organization_theme_settings.certificate_signatory_name, EXCLUDED.certificate_signatory_name),
       certificate_signatory_title = COALESCE(organization_theme_settings.certificate_signatory_title, EXCLUDED.certificate_signatory_title)`, [orgId]);
    // Seed Owner Account
    const ownerEmail = 'owner@apexacademy.com';
    let ownerId;
    const existingOwner = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.users WHERE email = $1`, [ownerEmail]);
    if (existingOwner.rowCount === 0) {
        const ownerHash = await PasswordUtils_1.PasswordUtils.hashPassword('OrgOwner@2026!');
        const newOwner = await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.users (email, password_hash, first_name, last_name, is_active, email_verified, last_login_ip, last_login_at)
       VALUES ($1, $2, 'Rahul', 'Sharma', TRUE, TRUE, '103.21.244.2', CURRENT_TIMESTAMP)
       RETURNING id`, [ownerEmail, ownerHash]);
        ownerId = newOwner.rows[0].id;
    }
    else {
        ownerId = existingOwner.rows[0].id;
        await (0, connection_1.executeQuery)(`UPDATE ${schema}.users 
       SET last_login_ip = COALESCE(last_login_ip, '103.21.244.2'),
           last_login_at = COALESCE(last_login_at, CURRENT_TIMESTAMP)
       WHERE id = $1`, [ownerId]);
    }
    // Sync Apex Coding Academy License
    await (0, connection_1.executeQuery)(`UPDATE ${schema}.organizations
     SET license_type = COALESCE(license_type, 'SUBSCRIPTION'),
         license_start_date = COALESCE(license_start_date, CURRENT_TIMESTAMP - INTERVAL '30 days'),
         license_end_date = COALESCE(license_end_date, CURRENT_TIMESTAMP + INTERVAL '335 days'),
         license_is_active = COALESCE(license_is_active, TRUE),
         show_plan_tier_to_org = COALESCE(show_plan_tier_to_org, TRUE),
         license_warning_days = COALESCE(license_warning_days, 2)
     WHERE id = $1`, [orgId]);
    const fullPermissions = JSON.stringify({
        can_edit_students: true,
        can_reset_student_passwords: true,
        can_manage_courses: true,
        can_manage_campaigns: true,
        can_manage_staff: true,
        can_manage_bulk_staff: true,
        can_view_reports: true,
    });
    // Attach as ORGANIZATION_OWNER
    await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.organization_members (organization_id, user_id, role_id, permissions, status)
     VALUES ($1, $2, 'ORGANIZATION_OWNER', $3::jsonb, 'ACTIVE')
     ON CONFLICT (organization_id, user_id) DO UPDATE SET permissions = $3::jsonb, status = 'ACTIVE'`, [orgId, ownerId, fullPermissions]);
    // Seed Sample Published Course
    let sampleCourseId;
    const existingCourse = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.courses WHERE organization_id = $1 AND slug = 'fullstack-typescript-react-mastery'`, [orgId]);
    if (existingCourse.rowCount === 0) {
        const courseRes = await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.courses (
        organization_id, title, slug, description, level, category, status, is_published, created_by
       ) VALUES (
        $1, 'Full-Stack TypeScript & React Mastery', 'fullstack-typescript-react-mastery',
        'Master modern production-grade web applications with TypeScript, React 18, PostgreSQL, and scalable multi-tenant architecture.',
        'INTERMEDIATE', 'Software Engineering', 'PUBLISHED', TRUE, $2
       ) RETURNING id`, [orgId, ownerId]);
        sampleCourseId = courseRes.rows[0].id;
    }
    else {
        sampleCourseId = existingCourse.rows[0].id;
        await (0, connection_1.executeQuery)(`UPDATE ${schema}.courses SET is_published = TRUE, status = 'PUBLISHED' WHERE id = $1`, [sampleCourseId]);
    }
    // Seed Section
    let sectionId;
    const existingSection = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.course_sections WHERE course_id = $1 LIMIT 1`, [sampleCourseId]);
    if (existingSection.rowCount === 0) {
        const sectionRes = await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.course_sections (organization_id, course_id, title, order_index)
       VALUES ($1, $2, 'Module 1: Architecture & Foundations', 1)
       RETURNING id`, [orgId, sampleCourseId]);
        sectionId = sectionRes.rows[0].id;
    }
    else {
        sectionId = existingSection.rows[0].id;
    }
    // Seed Lesson
    let lessonId;
    const existingLesson = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.lessons WHERE course_id = $1 LIMIT 1`, [sampleCourseId]);
    if (existingLesson.rowCount === 0) {
        const lessonRes = await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.lessons (
        organization_id, course_id, section_id, title, content_type, video_url, video_duration_seconds, is_free_preview, order_index
       ) VALUES (
        $1, $2, $3, 'Architecture Overview & Environment Setup', 'VIDEO',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 600, TRUE, 1
       ) RETURNING id`, [orgId, sampleCourseId, sectionId]);
        lessonId = lessonRes.rows[0].id;
    }
    else {
        lessonId = existingLesson.rows[0].id;
    }
    // Seed Interactive Video Question
    const existingQ = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.video_interactive_questions WHERE lesson_id = $1 LIMIT 1`, [lessonId]);
    if (existingQ.rowCount === 0) {
        await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.video_interactive_questions (
        organization_id, lesson_id, timestamp_seconds, question_text, question_type, options, correct_answer, explanation
       ) VALUES (
        $1, $2, 45, 'Which database schema isolation strategy is used by Novacodex LMS?', 'MCQ',
        '["Single Schema with Tenant Column", "PostgreSQL Schema-per-tenant", "Separate Database-per-tenant", "NoSQL Document Store"]'::jsonb,
        'Single Schema with Tenant Column',
        'Novacodex uses row-level tenant identification with organization_id and partitioned indexes for optimal scale and simplified multi-tenancy.'
       )`, [orgId, lessonId]);
    }
    // Seed Sample Quiz
    const existingQuiz = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.quizzes WHERE course_id = $1 LIMIT 1`, [sampleCourseId]);
    if (existingQuiz.rowCount === 0) {
        const quizRes = await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.quizzes (
        organization_id, course_id, section_id, title, description, passing_score_percentage, time_limit_minutes, max_attempts
       ) VALUES (
        $1, $2, $3, 'Foundations Knowledge Check', 'Test your understanding of core platform architectural principles.', 70, 15, 3
       ) RETURNING id`, [orgId, sampleCourseId, sectionId]);
        const quizId = quizRes.rows[0].id;
        await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.quiz_questions (
        organization_id, quiz_id, question_text, options, correct_answer, explanation, points, order_index
       ) VALUES (
        $1, $2, 'What role does the organization_members table play?',
        '["Stores system roles", "Associates users with organizations and their specific role", "Manages course enrollment", "Tracks video progress"]'::jsonb,
        'Associates users with organizations and their specific role',
        'organization_members defines multi-tenant membership linking a user, an organization, and their RBAC role.', 1, 0
       )`, [orgId, quizId]);
    }
    // Seed Sample Student User & Enrollment
    const studentEmail = 'student@apexacademy.com';
    let studentId;
    const existingStudent = await (0, connection_1.executeQuery)(`SELECT id FROM ${schema}.users WHERE email = $1`, [studentEmail]);
    if (existingStudent.rowCount === 0) {
        const studentHash = await PasswordUtils_1.PasswordUtils.hashPassword('Student@2026!');
        const newStudent = await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.users (email, password_hash, first_name, last_name, is_active, email_verified, last_login_ip, last_login_at)
       VALUES ($1, $2, 'Karan', 'Verma', TRUE, TRUE, '157.240.198.35', CURRENT_TIMESTAMP)
       RETURNING id`, [studentEmail, studentHash]);
        studentId = newStudent.rows[0].id;
    }
    else {
        studentId = existingStudent.rows[0].id;
        await (0, connection_1.executeQuery)(`UPDATE ${schema}.users
       SET last_login_ip = COALESCE(last_login_ip, '157.240.198.35'),
           last_login_at = COALESCE(last_login_at, CURRENT_TIMESTAMP)
       WHERE id = $1`, [studentId]);
    }
    await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.organization_members (organization_id, user_id, role_id, status)
     VALUES ($1, $2, 'STUDENT', 'ACTIVE')
     ON CONFLICT (organization_id, user_id) DO NOTHING`, [orgId, studentId]);
    await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.enrollments (organization_id, user_id, course_id, status)
     VALUES ($1, $2, $3, 'ACTIVE')
     ON CONFLICT (organization_id, user_id, course_id) DO NOTHING`, [orgId, studentId, sampleCourseId]);
    await (0, connection_1.executeQuery)(`INSERT INTO ${schema}.student_course_progress (
      organization_id, user_id, course_id, completed_lessons_count, total_lessons_count, progress_percentage
     ) VALUES ($1, $2, $3, 0, 1, 0.00)
     ON CONFLICT (organization_id, user_id, course_id) DO NOTHING`, [orgId, studentId, sampleCourseId]);
    console.log(`[DB Init] Showcase academy "Apex Coding Academy" (/apex-academy) verified with sample course, quiz, and student.`);
    console.log('[DB Init] Database schema initialization completed successfully.');
}
