const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../utils/db');
const { getDefaultProfileImageUrl } = require('../utils/cloudinary');

const authenticate = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyAccessToken(accessToken);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatarUrl: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      ...user,
      avatarUrl: user.avatarUrl || getDefaultProfileImageUrl()
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    
    if (accessToken) {
      const decoded = verifyAccessToken(accessToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, avatarUrl: true }
      });
      req.user = user ? {
        ...user,
        avatarUrl: user.avatarUrl || getDefaultProfileImageUrl()
      } : null;
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = { authenticate, optionalAuth };
