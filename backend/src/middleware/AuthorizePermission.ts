import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { executeQuery } from '../database/connection';
import { EnvironmentConfig } from '../config/environment';

export function AuthorizeRoles(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (req.user.isSuperAdmin) {
      return next();
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Access restricted. Required roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
}

export function AuthorizePermission(permissionKey: string, ...fallbackRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (req.user.isSuperAdmin) {
      return next();
    }

    const role = req.user.role || '';
    if (['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', ...fallbackRoles].includes(role)) {
      return next();
    }

    // Realtime database check in case permissions were updated after login token was issued
    const orgId = req.organizationId || req.user.activeOrganizationId;
    if (orgId) {
      try {
        const schema = EnvironmentConfig.database.schema;
        const res = await executeQuery(
          `SELECT permissions FROM ${schema}.organization_members
           WHERE organization_id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
          [orgId, req.user.userId]
        );
        if (res.rowCount! > 0) {
          const dbPerms = res.rows[0].permissions;
          const hasDbPerm = dbPerms?.[permissionKey] === true || (permissionKey === 'can_manage_bulk_staff' && dbPerms?.can_manage_staff === true);
          if (hasDbPerm) {
            if (permissionKey === 'can_manage_campaigns' && dbPerms?.can_manage_courses !== true) {
              return next(
                ApiError.forbidden(
                  'Access restricted. College Outreach & Campaign management requires Course Management permission ("can_manage_courses").'
                )
              );
            }
            if (permissionKey === 'can_manage_bulk_staff' && dbPerms?.can_manage_staff !== true) {
              return next(
                ApiError.forbidden(
                  'Access restricted. Bulk Staff Onboarding Links & QR management requires Staff Management permission ("can_manage_staff").'
                )
              );
            }
            return next();
          } else {
            return next(
              ApiError.forbidden(
                `Access restricted. Your account lacks the required permission switch: "${permissionKey}". Please contact your organization owner or administrator.`
              )
            );
          }
        }
      } catch {}
    }

    // Fallback: Check token permissions
    const perms = (req.user as any).permissions;
    if (perms && typeof perms === 'object') {
      const hasPerm = perms[permissionKey] === true || (permissionKey === 'can_manage_bulk_staff' && perms.can_manage_staff === true);
      if (hasPerm) {
        if (permissionKey === 'can_manage_campaigns' && perms.can_manage_courses !== true) {
          return next(
            ApiError.forbidden(
              'Access restricted. College Outreach & Campaign management requires Course Management permission ("can_manage_courses").'
            )
          );
        }
        if (permissionKey === 'can_manage_bulk_staff' && perms.can_manage_staff !== true) {
          return next(
            ApiError.forbidden(
              'Access restricted. Bulk Staff Onboarding Links & QR management requires Staff Management permission ("can_manage_staff").'
            )
          );
        }
        return next();
      }
    }

    return next(
      ApiError.forbidden(
        `Access restricted. Your account lacks the required permission switch: "${permissionKey}". Please contact your organization owner or administrator.`
      )
    );
  };
}

export function RequireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || !req.user.isSuperAdmin) {
    return next(ApiError.forbidden('Only platform Super Administrators can access this endpoint.'));
  }
  next();
}

