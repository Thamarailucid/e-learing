import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { executeQuery } from '../database/connection';
import { EnvironmentConfig } from '../config/environment';

export async function ResolveOrganizationContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }

  // 1. Target organization can come from header, query or route params
  let requestedOrgId = (
    req.params.organizationId ||
    req.headers['x-organization-id'] ||
    req.query.organizationId ||
    req.user.activeOrganizationId
  ) as string | undefined;

  // Fallback: If not in header/token, resolve user's primary active organization from database
  if (!requestedOrgId && req.user?.userId && !req.user.isSuperAdmin) {
    try {
      const schema = EnvironmentConfig.database.schema;
      const userOrgRes = await executeQuery(
        `SELECT om.organization_id, om.status as member_status, o.name as org_name, o.status as org_status,
                o.license_is_active, o.license_end_date
         FROM ${schema}.organization_members om
         JOIN ${schema}.organizations o ON o.id = om.organization_id
         WHERE om.user_id = $1
         ORDER BY om.created_at ASC`,
        [req.user.userId]
      );
      if (userOrgRes.rowCount! > 0) {
        const activeOne = userOrgRes.rows.find(
          (r) =>
            r.member_status === 'ACTIVE' &&
            r.org_status === 'ACTIVE' &&
            r.license_is_active !== false &&
            (!r.license_end_date || new Date(r.license_end_date).getTime() >= Date.now())
        );

        if (activeOne) {
          requestedOrgId = activeOne.organization_id;
        } else {
          // Check specific reason for lack of active org
          const suspendedMember = userOrgRes.rows.find((r) => r.member_status === 'SUSPENDED' || r.member_status === 'INACTIVE');
          if (suspendedMember) {
            return next(ApiError.forbidden('Your account in this organization is suspended.', 'MEMBERSHIP_INACTIVE'));
          }

          const suspendedOrg = userOrgRes.rows.find((r) => r.org_status === 'SUSPENDED' || r.org_status === 'INACTIVE');
          if (suspendedOrg) {
            return next(
              ApiError.forbidden(
                `Organization "${suspendedOrg.org_name}" has been ${suspendedOrg.org_status.toLowerCase()}. Access is temporarily disabled.`,
                'ORGANIZATION_INACTIVE'
              )
            );
          }

          const expiredLicense = userOrgRes.rows.find(
            (r) => r.license_is_active === false || (r.license_end_date && new Date(r.license_end_date).getTime() < Date.now())
          );
          if (expiredLicense) {
            return next(ApiError.forbidden('This organization\'s license has expired. Please contact support.', 'ORGANIZATION_LICENSE_EXPIRED'));
          }

          return next(ApiError.forbidden('Your account has no active organization access.', 'NO_ACTIVE_ORGANIZATION'));
        }
      }
    } catch (dbErr) {
      return next(dbErr);
    }
  }

  // If user is platform Super Admin, they have platform-wide access
  if (req.user.isSuperAdmin) {
    req.organizationId = requestedOrgId || req.user.activeOrganizationId;
    if (!req.organizationId) {
      try {
        const schema = EnvironmentConfig.database.schema;
        const firstOrg = await executeQuery(`SELECT id FROM ${schema}.organizations WHERE status = 'ACTIVE' LIMIT 1`);
        if (firstOrg.rowCount! > 0) {
          req.organizationId = firstOrg.rows[0].id;
        }
      } catch {}
    }
    return next();
  }

  if (!requestedOrgId) {
    return next(ApiError.badRequest('Organization context is required for this operation.', 'MISSING_ORGANIZATION_CONTEXT'));
  }

  // 2. Validate tenant membership from database
  try {
    const schema = EnvironmentConfig.database.schema;
    const memberRes = await executeQuery(
      `SELECT om.role_id, om.status, o.status as org_status, o.license_is_active, o.license_end_date
       FROM ${schema}.organization_members om
       JOIN ${schema}.organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.organization_id = $2`,
      [req.user.userId, requestedOrgId]
    );

    if (memberRes.rowCount === 0) {
      return next(ApiError.forbidden('You do not belong to this organization.', 'TENANT_ACCESS_DENIED'));
    }

    const membership = memberRes.rows[0];
    if (membership.org_status !== 'ACTIVE') {
      return next(ApiError.forbidden('This organization has been suspended or is inactive.', 'ORGANIZATION_INACTIVE'));
    }

    // Check license expiry — block if license is disabled or end date has passed
    if (membership.license_is_active === false) {
      return next(ApiError.forbidden('This organization\'s license has been disabled. Please contact platform support.', 'ORGANIZATION_LICENSE_EXPIRED'));
    }
    if (membership.license_end_date && new Date(membership.license_end_date).getTime() < Date.now()) {
      return next(ApiError.forbidden('This organization\'s license has expired. Please contact platform support to renew.', 'ORGANIZATION_LICENSE_EXPIRED'));
    }

    if (membership.status !== 'ACTIVE') {
      return next(ApiError.forbidden('Your account in this organization is suspended.', 'MEMBERSHIP_INACTIVE'));
    }

    req.organizationId = requestedOrgId;
    req.user.role = membership.role_id;
    next();
  } catch (err) {
    next(err);
  }
}
