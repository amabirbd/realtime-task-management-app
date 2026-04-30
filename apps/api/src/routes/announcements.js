const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../utils/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get announcements for workspace
router.get(
  '/workspace/:workspaceId',
  [param('workspaceId').isString()],
  async (req, res) => {
    try {
      const { workspaceId } = req.params;

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this workspace' });
      }

      const announcements = await prisma.announcement.findMany({
        where: { workspaceId },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true }
          },
          reactions: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          },
          comments: {
            include: {
              author: {
                select: { id: true, name: true, avatarUrl: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: { reactions: true, comments: true }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json({ announcements });
    } catch (error) {
      console.error('Get announcements error:', error);
      res.status(500).json({ error: 'Failed to get announcements' });
    }
  }
);

// Create announcement (Admin only)
router.post(
  '/',
  [
    body('workspaceId').isString(),
    body('content').trim().isLength({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId, content } = req.body;

      // Check admin permission
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId
          }
        }
      });

      console.log('Creating announcement - user:', req.user.id, 'role:', membership?.role, 'workspace:', workspaceId);

      if (!membership || (membership.role !== 'ADMIN' && membership.role !== 'OWNER')) {
        return res.status(403).json({ error: 'Admin permission required' });
      }

      const announcement = await prisma.announcement.create({
        data: {
          workspaceId,
          authorId: req.user.id,
          content
        },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true }
          },
          reactions: true,
          comments: true,
          _count: {
            select: { reactions: true, comments: true }
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId,
          userId: req.user.id,
          action: 'CREATE',
          entityType: 'Announcement',
          entityId: announcement.id,
          newValue: JSON.stringify({ content })
        }
      });

      console.log(`Emitting announcement:created to workspace:${workspaceId}`, announcement.id);
      req.io.to(`workspace:${workspaceId}`).emit('announcement:created', announcement);

      res.status(201).json({ announcement });
    } catch (error) {
      console.error('Create announcement error:', error);
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  }
);

// Update announcement (Admin only)
router.patch(
  '/:id',
  [param('id').isString(), body('content').optional().trim()],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { content, isPinned } = req.body;

      const announcement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!announcement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      // Check admin permission
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: announcement.workspaceId
          }
        }
      });

      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin permission required' });
      }

      const oldAnnouncement = { ...announcement };

      const updatedAnnouncement = await prisma.announcement.update({
        where: { id },
        data: {
          ...(content && { content }),
          ...(isPinned !== undefined && { isPinned })
        },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true }
          },
          reactions: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          },
          comments: {
            include: {
              author: {
                select: { id: true, name: true, avatarUrl: true }
              }
            }
          },
          _count: {
            select: { reactions: true, comments: true }
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: announcement.workspaceId,
          userId: req.user.id,
          action: 'UPDATE',
          entityType: 'Announcement',
          entityId: id,
          oldValue: JSON.stringify(oldAnnouncement),
          newValue: JSON.stringify(updatedAnnouncement)
        }
      });

      req.io.to(`workspace:${announcement.workspaceId}`).emit('announcement:updated', updatedAnnouncement);

      res.json({ announcement: updatedAnnouncement });
    } catch (error) {
      console.error('Update announcement error:', error);
      res.status(500).json({ error: 'Failed to update announcement' });
    }
  }
);

// Delete announcement (Admin only)
router.delete(
  '/:id',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      const announcement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!announcement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      // Check admin permission
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: announcement.workspaceId
          }
        }
      });

      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin permission required' });
      }

      await prisma.announcement.delete({
        where: { id }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: announcement.workspaceId,
          userId: req.user.id,
          action: 'DELETE',
          entityType: 'Announcement',
          entityId: id,
          oldValue: JSON.stringify(announcement)
        }
      });

      req.io.to(`workspace:${announcement.workspaceId}`).emit('announcement:deleted', { id });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete announcement error:', error);
      res.status(500).json({ error: 'Failed to delete announcement' });
    }
  }
);

// Add reaction
router.post(
  '/:id/react',
  [
    param('id').isString(),
    body('emoji').trim().isLength({ min: 1, max: 10 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { emoji } = req.body;

      const announcement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!announcement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: announcement.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Check if already reacted with this emoji
      const existingReaction = await prisma.reaction.findFirst({
        where: {
          announcementId: id,
          userId: req.user.id,
          emoji
        }
      });

      if (existingReaction) {
        // Remove reaction (toggle off)
        await prisma.reaction.delete({
          where: { id: existingReaction.id }
        });

        req.io.to(`workspace:${announcement.workspaceId}`).emit('reaction:removed', {
          announcementId: id,
          userId: req.user.id,
          emoji
        });

        return res.json({ removed: true });
      }

      // Add reaction
      const reaction = await prisma.reaction.create({
        data: {
          announcementId: id,
          userId: req.user.id,
          emoji
        },
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      });

      req.io.to(`workspace:${announcement.workspaceId}`).emit('reaction:added', {
        announcementId: id,
        reaction
      });

      res.status(201).json({ reaction });
    } catch (error) {
      console.error('Add reaction error:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  }
);

// Add comment
router.post(
  '/:id/comments',
  [
    param('id').isString(),
    body('content').trim().isLength({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { content } = req.body;

      const announcement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!announcement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: announcement.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Parse mentions (@username)
      const mentionRegex = /@(\w+)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        // Find user by name pattern
        const users = await prisma.user.findMany({
          where: {
            name: { contains: match[1], mode: 'insensitive' }
          },
          select: { id: true }
        });
        mentions.push(...users.map(u => u.id));
      }

      const comment = await prisma.comment.create({
        data: {
          announcementId: id,
          authorId: req.user.id,
          content,
          mentions: mentions.length > 0 ? mentions : []
        },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true }
          }
        }
      });

      // Create notifications for mentions
      for (const mentionedUserId of mentions) {
        if (mentionedUserId !== req.user.id) {
          await prisma.notification.create({
            data: {
              userId: mentionedUserId,
              type: 'MENTION',
              content: `${req.user.name} mentioned you in a comment`,
              link: `/workspaces/${announcement.workspaceId}/announcements`
            }
          });

          // Emit to mentioned user
          req.io.to(`user:${mentionedUserId}`).emit('notification:new');
        }
      }

      req.io.to(`workspace:${announcement.workspaceId}`).emit('comment:created', {
        announcementId: id,
        comment
      });

      res.status(201).json({ comment });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }
);

// Delete comment (author or admin)
router.delete(
  '/comments/:commentId',
  [param('commentId').isString()],
  async (req, res) => {
    try {
      const { commentId } = req.params;

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: { announcement: true }
      });

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Check if author or admin
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: comment.announcement.workspaceId
          }
        }
      });

      if (comment.authorId !== req.user.id && (!membership || membership.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await prisma.comment.delete({
        where: { id: commentId }
      });

      req.io.to(`workspace:${comment.announcement.workspaceId}`).emit('comment:deleted', {
        announcementId: comment.announcementId,
        commentId
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
);

module.exports = router;
