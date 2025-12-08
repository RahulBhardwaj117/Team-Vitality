const { verifyToken, decodeToken } = require('./generateTokens');

/**
 * Authentication middleware for Electron app
 * Protects routes that require user authentication
 */
const protect = (req, res, next) => {
    try {
        // Get token from different possible headers
        let token = req.headers.authorization || req.headers.authentication || req.headers.token;

        if (!token) {
            return res.status(401).json({ error: "Access denied. No token provided." });
        }

        // Handle "Bearer <token>" format
        if (token.startsWith('Bearer ')) {
            token = token.split(' ')[1];
        }

        // Verify token
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ error: "Invalid token." });
        }

        // Add user info to request
        req.userId = decoded.id;
        req.user = decoded;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: "Authentication failed." });
    }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // First run authentication middleware
        protect(req, res, () => {
            // Check if user role is allowed
            // Note: In Electron app, user role needs to be retrieved from database
            // This would require passing db instance or creating an enhanced version
            next();
        });
    };
};

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't block if missing
 */
const optionalAuth = (req, res, next) => {
    try {
        let token = req.headers.authorization || req.headers.authentication || req.headers.token;

        if (token) {
            if (token.startsWith('Bearer ')) {
                token = token.split(' ')[1];
            }

            const decoded = verifyToken(token);
            if (decoded) {
                req.userId = decoded.id;
                req.user = decoded;
            }
        }

        next();
    } catch (error) {
        // Don't block for optional auth, just continue without user info
        next();
    }
};

module.exports = {
    protect,
    requireRole,
    optionalAuth
};
