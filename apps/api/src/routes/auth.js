const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/db');
const { generateTokens, verifyRefreshToken, setTokenCookies, clearTokenCookies } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { upload, uploadToCloudinary, getDefaultProfileImageUrl } = require('../utils/cloudinary');

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().isLength({ min: 2 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true
        }
      });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id);
      setTokenCookies(res, accessToken, refreshToken);

      res.status(201).json({
        user: {
          ...user,
          avatarUrl: user.avatarUrl || getDefaultProfileImageUrl()
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id);
      setTokenCookies(res, accessToken, refreshToken);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl || getDefaultProfileImageUrl()
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    
    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true }
    });

    if (!user) {
      clearTokenCookies(res);
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const tokens = generateTokens(decoded.userId);
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ success: true });
  } catch (error) {
    clearTokenCookies(res);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  clearTokenCookies(res);
  res.json({ success: true });
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      ...req.user,
      avatarUrl: req.user.avatarUrl || getDefaultProfileImageUrl()
    }
  });
});

// Update profile
router.patch('/profile', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const { name } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      updateData.avatarUrl = result.secure_url;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true
      }
    });

    res.json({
      user: {
        ...user,
        avatarUrl: user.avatarUrl || getDefaultProfileImageUrl()
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
