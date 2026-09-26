export interface UserPermissions {
  can_edit_students?: boolean;
  can_reset_student_passwords?: boolean;
  can_manage_courses?: boolean;
  can_manage_campaigns?: boolean;
  can_manage_staff?: boolean;
  can_manage_bulk_staff?: boolean;
  can_view_reports?: boolean;
  [key: string]: boolean | undefined;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  activeOrganizationId?: string;
  activeOrganizationName?: string;
  activeOrganizationLogo?: string;
  activeOrganizationSlug?: string;
  role?: string;
  permissions?: UserPermissions;
  lastLoginIp?: string;
  lastLoginAt?: string;
  lastLoginAtIst?: string;
}

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
  organizations: UserOrganization[];
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORGANIZATION_OWNER'
  | 'ORGANIZATION_ADMIN'
  | 'MANAGER'
  | 'INSTRUCTOR'
  | 'CONTENT_MANAGER'
  | 'REVIEWER'
  | 'SUPPORT_STAFF'
  | 'STUDENT';
