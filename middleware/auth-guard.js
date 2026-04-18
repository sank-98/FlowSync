/**
 * JWT/OAuth Authentication Guard Middleware
 * Validates Bearer tokens and injects user context into requests.
 */

const jwt = require('jsonwebtoken');

const TOKEN_ALGORITHMS = ['HS256', 'RS256'];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error('JWT_SECRET is required in production');
      error.statusCode = 500;
      throw error;
    }

    return 'flowsync-dev-secret';
  }

  return secret;
}

function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authorization header provided',
    });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authorization header format. Expected: Bearer <token>',
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: TOKEN_ALGORITHMS });

    req.user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      iat: decoded.iat ? new Date(decoded.iat * 1000) : null,
      exp: decoded.exp ? new Date(decoded.exp * 1000) : null,
    };

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token signature',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired',
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: 'Unauthorized',
        message: error.message,
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token validation failed',
    });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No user context found',
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `User does not have required role. Required: ${roles.join(', ')}`,
      });
    }

    return next();
  };
}

module.exports = {
  authGuard,
  requireRole,
};
