const express = require('express');
const { param } = require('express-validator');
const prisma = require('../utils/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get notifications for current user
router.get('/', async (req, res) => {
  try {
    const { limit = 20, unreadOnly = false } = req.query;

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false }
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.patch(
  '/:id/read',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      if (notification.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });

      res.json({ notification: updated });
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }
);

// Mark all notifications as read
router.post('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Delete notification
router.delete(
  '/:id',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      if (notification.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await prisma.notification.delete({
        where: { id }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
);

module.exports = router;
