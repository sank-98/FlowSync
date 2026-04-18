/**
 * JWT/OAuth Authentication Guard Middleware
 * Validates Bearer tokens and injects user context into requests.
 */

const jwt = require('jsonwebtoken');
const { logWarn } = require('./logger');

const TOKEN_ALGORITHMS = ['HS256', 'RS256'];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error('JWT_SECRET is not configured');
    error.statusCode = 500;
    throw error;
  }

  return secret;
}

function isJwtToken(token) {
  return token.split('.').length === 3;
}

function validateOAuthToken(token) {
  if (!token || token.length < 20) {
    return null;
  }

  const isGoogleLikeToken = token.startsWith('ya29.');
  const isGenericOpaqueToken = /^[A-Za-z0-9\-._~+/]+=*$/.test(token);

  if (!isGoogleLikeToken && !isGenericOpaqueToken) {
    return null;
  }

  return {
    id: null,
    email: null,
    roles: [],
    provider: 'oauth',
    rawToken: token,
  };
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
    if (isJwtToken(token)) {
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: TOKEN_ALGORITHMS });

      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        roles: Array.isArray(decoded.roles) ? decoded.roles : [],
        iat: decoded.iat ? new Date(decoded.iat * 1000) : null,
        exp: decoded.exp ? new Date(decoded.exp * 1000) : null,
        provider: 'jwt',
      };
    } else {
      const oauthUser = validateOAuthToken(token);

      if (!oauthUser) {
        throw new jwt.JsonWebTokenError('Malformed OAuth token');
      }

      req.user = oauthUser;
    }

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired',
      });
    }

    if (error.statusCode) {
      logWarn('authGuard misconfiguration', { message: error.message });
      return res.status(error.statusCode).json({
        error: 'Unauthorized',
        message: 'Authentication unavailable',
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
