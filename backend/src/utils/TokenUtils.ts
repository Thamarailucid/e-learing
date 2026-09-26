import jwt from 'jsonwebtoken';
import { EnvironmentConfig } from '../config/environment';

export interface ITokenPayload {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  activeOrganizationId?: string;
  role?: string;
  permissions?: Record<string, boolean> | string[];
  sessionId?: string;
}

export class TokenUtils {
  static generateAccessToken(payload: ITokenPayload): string {
    return jwt.sign(payload, EnvironmentConfig.jwt.accessSecret, {
      expiresIn: EnvironmentConfig.jwt.accessExpiresIn as any,
    });
  }

  static generateRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, EnvironmentConfig.jwt.refreshSecret, {
      expiresIn: EnvironmentConfig.jwt.refreshExpiresIn as any,
    });
  }

  static verifyAccessToken(token: string): ITokenPayload {
    return jwt.verify(token, EnvironmentConfig.jwt.accessSecret) as ITokenPayload;
  }

  static verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, EnvironmentConfig.jwt.refreshSecret) as { userId: string };
  }
}
