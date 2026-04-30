const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../utils/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Get action items for workspace
router.get(
  '/workspace/:workspaceId',
  [param('workspaceId').isString()],
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { status, assigneeId, goalId } = req.query;

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

      const where = { workspaceId };
      if (status) where.status = status;
      if (assigneeId) where.assigneeId = assigneeId;
      if (goalId) where.goalId = goalId;

      const actionItems = await prisma.actionItem.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, name: true, avatarUrl: true }
          },
          goal: {
            select: { id: true, title: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      res.json({ actionItems });
    } catch (error) {
      console.error('Get action items error:', error);
      res.status(500).json({ error: 'Failed to get action items' });
    }
  }
);

// Create action item
router.post(
  '/',
  [
    body('workspaceId').isString(),
    body('title').trim().isLength({ min: 2, max: 200 }),
    body('goalId').optional().isString(),
    body('assigneeId').optional().isString(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId, title, goalId, assigneeId, priority, dueDate } = req.body;

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

      // If goalId provided, verify it belongs to workspace
      if (goalId) {
        const goal = await prisma.goal.findUnique({
          where: { id: goalId }
        });
        if (!goal || goal.workspaceId !== workspaceId) {
          return res.status(400).json({ error: 'Invalid goal' });
        }
      }

      // If assigneeId provided, verify they are member
      if (assigneeId) {
        const assigneeMembership = await prisma.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: assigneeId,
              workspaceId
            }
          }
        });
        if (!assigneeMembership) {
          return res.status(400).json({ error: 'Assignee is not a member' });
        }
      }

      const actionItem = await prisma.actionItem.create({
        data: {
          workspaceId,
          goalId,
          title,
          assigneeId,
          priority: priority || 'MEDIUM',
          dueDate: dueDate ? new Date(dueDate) : null
        },
        include: {
          assignee: {
            select: { id: true, name: true, avatarUrl: true }
          },
          goal: {
            select: { id: true, title: true }
          }
        }
      });

      // Create notification for assignee
      if (assigneeId && assigneeId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: assigneeId,
            type: 'ASSIGNMENT',
            content: `You were assigned: ${title}`,
            link: `/workspaces/${workspaceId}/action-items`
          }
        });

        req.io.to(`user:${assigneeId}`).emit('notification:new');
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId,
          userId: req.user.id,
          action: 'CREATE',
          entityType: 'ActionItem',
          entityId: actionItem.id,
          newValue: JSON.stringify(actionItem)
        }
      });

      req.io.to(`workspace:${workspaceId}`).emit('actionItem:created', actionItem);

      res.status(201).json({ actionItem });
    } catch (error) {
      console.error('Create action item error:', error);
      res.status(500).json({ error: 'Failed to create action item' });
    }
  }
);

// Update action item
router.patch(
  '/:id',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, assigneeId, priority, dueDate, status } = req.body;

      const actionItem = await prisma.actionItem.findUnique({
        where: { id }
      });

      if (!actionItem) {
        return res.status(404).json({ error: 'Action item not found' });
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: actionItem.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // If changing assignee, verify new assignee is member
      if (assigneeId && assigneeId !== actionItem.assigneeId) {
        const assigneeMembership = await prisma.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: assigneeId,
              workspaceId: actionItem.workspaceId
            }
          }
        });
        if (!assigneeMembership) {
          return res.status(400).json({ error: 'New assignee is not a member' });
        }
      }

      const oldActionItem = { ...actionItem };

      const updatedActionItem = await prisma.actionItem.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(assigneeId !== undefined && { assigneeId }),
          ...(priority && { priority }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(status && { status })
        },
        include: {
          assignee: {
            select: { id: true, name: true, avatarUrl: true }
          },
          goal: {
            select: { id: true, title: true }
          }
        }
      });

      // Notify new assignee
      if (assigneeId && assigneeId !== req.user.id && assigneeId !== oldActionItem.assigneeId) {
        await prisma.notification.create({
          data: {
            userId: assigneeId,
            type: 'ASSIGNMENT',
            content: `You were assigned: ${title || actionItem.title}`,
            link: `/workspaces/${actionItem.workspaceId}/action-items`
          }
        });

        req.io.to(`user:${assigneeId}`).emit('notification:new');
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: actionItem.workspaceId,
          userId: req.user.id,
          action: 'UPDATE',
          entityType: 'ActionItem',
          entityId: id,
          oldValue: JSON.stringify(oldActionItem),
          newValue: JSON.stringify(updatedActionItem)
        }
      });

      req.io.to(`workspace:${actionItem.workspaceId}`).emit('actionItem:updated', updatedActionItem);

      res.json({ actionItem: updatedActionItem });
    } catch (error) {
      console.error('Update action item error:', error);
      res.status(500).json({ error: 'Failed to update action item' });
    }
  }
);

// Delete action item
router.delete(
  '/:id',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      const actionItem = await prisma.actionItem.findUnique({
        where: { id }
      });

      if (!actionItem) {
        return res.status(404).json({ error: 'Action item not found' });
      }

      // Check membership (admin or creator)
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: actionItem.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await prisma.actionItem.delete({
        where: { id }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: actionItem.workspaceId,
          userId: req.user.id,
          action: 'DELETE',
          entityType: 'ActionItem',
          entityId: id,
          oldValue: JSON.stringify(actionItem)
        }
      });

      req.io.to(`workspace:${actionItem.workspaceId}`).emit('actionItem:deleted', { id });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete action item error:', error);
      res.status(500).json({ error: 'Failed to delete action item' });
    }
  }
);

// Update status only (for Kanban drag-drop)
router.patch(
  '/:id/status',
  [
    param('id').isString(),
    body('status').isIn(['TODO', 'IN_PROGRESS', 'DONE'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      const actionItem = await prisma.actionItem.findUnique({
        where: { id }
      });

      if (!actionItem) {
        return res.status(404).json({ error: 'Action item not found' });
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: actionItem.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const updatedActionItem = await prisma.actionItem.update({
        where: { id },
        data: { status },
        include: {
          assignee: {
            select: { id: true, name: true, avatarUrl: true }
          },
          goal: {
            select: { id: true, title: true }
          }
        }
      });

      req.io.to(`workspace:${actionItem.workspaceId}`).emit('actionItem:updated', updatedActionItem);

      res.json({ actionItem: updatedActionItem });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
);

module.exports = router;
