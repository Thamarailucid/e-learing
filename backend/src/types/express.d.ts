import { ITokenPayload } from '../utils/TokenUtils';

declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
      organizationId?: string;
    }
  }
}
