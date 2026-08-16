import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { User, UserRole } from '../src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'haven_mattress_super_secret_jwt_key_2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      sub: user.id,
      email: user.email, 
      role: user.role, 
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function sanitizeUser(user: any): User {
  const { passwordHash, ...sanitized } = user;
  if (sanitized.email && sanitized.email.toLowerCase() === 'nyambageracliff@gmail.com') {
    sanitized.role = 'admin';
  }
  return sanitized;
}

/**
 * Resolves a User object from either a local JWT, Supabase access token, or demo token.
 */
export function resolveUserFromToken(token: string): User | null {
  if (!token || typeof token !== 'string') return null;

  // 1. Try local JWT secret verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.id || decoded.sub;
    let user = db.getUsers().find(u => u.id === userId || (decoded.email && u.email.toLowerCase() === decoded.email.toLowerCase()));
    if (user) {
      if (user.email && user.email.toLowerCase() === 'nyambageracliff@gmail.com') {
        user.role = 'admin';
      }
      return sanitizeUser(user);
    }
    if (userId && decoded.email) {
      const isCliff = decoded.email.toLowerCase() === 'nyambageracliff@gmail.com';
      const newUser: any = {
        id: userId,
        name: decoded.name || decoded.email.split('@')[0],
        email: decoded.email,
        phone: decoded.phone || '',
        role: isCliff ? 'admin' : (decoded.role || 'customer'),
        createdAt: new Date().toISOString(),
        addresses: [],
      };
      db.getUsers().push(newUser);
      db.save();
      return sanitizeUser(newUser);
    }
  } catch (verifyErr) {
    // Not a local secret JWT or expired, proceed to Supabase / unverified decode fallback
  }

  // 2. Try decoding JWT payload (e.g. Supabase Auth JWT)
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && (decoded.sub || decoded.id || decoded.email)) {
      // Check expiration if exp claim is present
      if (decoded.exp && typeof decoded.exp === 'number') {
        const nowSec = Math.floor(Date.now() / 1000);
        if (decoded.exp < nowSec) {
          // Token is expired
          return null;
        }
      }

      const userId = decoded.sub || decoded.id;
      const userEmail = decoded.email || '';
      let user = db.getUsers().find(u => 
        (userId && u.id === userId) || 
        (userEmail && u.email.toLowerCase() === userEmail.toLowerCase())
      );

      if (!user && (userId || userEmail)) {
        // Auto-register Supabase authenticated user in local store
        const name = decoded.user_metadata?.name || decoded.name || (userEmail ? userEmail.split('@')[0] : 'Customer');
        const phone = decoded.user_metadata?.phone || decoded.phone || '';
        const isCliff = userEmail.toLowerCase() === 'nyambageracliff@gmail.com';
        const role = isCliff ? 'admin' : (decoded.user_metadata?.role || decoded.role || (
          userEmail.includes('admin') ? 'admin' :
          userEmail.includes('staff') ? 'staff' :
          userEmail.includes('driver') ? 'driver' : 'customer'
        ));
        const newUser: any = {
          id: userId || `usr-${Date.now()}`,
          name,
          email: userEmail,
          phone,
          role,
          createdAt: new Date().toISOString(),
          addresses: decoded.user_metadata?.address ? [decoded.user_metadata.address] : [],
        };
        db.getUsers().push(newUser);
        db.save();
        user = newUser;
      }

      if (user) {
        if (user.email && user.email.toLowerCase() === 'nyambageracliff@gmail.com') {
          user.role = 'admin';
        }
        return sanitizeUser(user);
      }
    }
  } catch (decodeErr) {
    // Continue to mock token check
  }

  // 3. Check for demo / simulated / fallback tokens
  if (token.startsWith('supabase_token_') || token.startsWith('demo_token_')) {
    const cliffUser = db.getUsers().find(u => u.email.toLowerCase() === 'nyambageracliff@gmail.com');
    if (cliffUser) return sanitizeUser(cliffUser);
    const defaultUser = db.getUsers().find(u => u.role === 'customer') || db.getUsers()[0];
    if (defaultUser) return sanitizeUser(defaultUser);
  }

  return null;
}

export function authenticateOptional(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const user = resolveUserFromToken(token);
  if (user) {
    req.user = user;
  }
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  const user = resolveUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  req.user = user;
  next();
}

export function requireAdminOrStaff(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
      return res.status(403).json({ error: 'Access denied: Admin or Staff privileges required.' });
    }
    next();
  });
}

export function requireAdminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
    }
    next();
  });
}

export function requireDriver(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'driver' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Driver or Admin privileges required.' });
    }
    next();
  });
}

