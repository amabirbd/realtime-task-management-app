const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../utils/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Check workspace membership middleware
const requireMembership = async (req, res, next) => {
  const { workspaceId } = req.body;
  const workspaceIdFromParams = req.params.workspaceId;
  const id = workspaceId || workspaceIdFromParams;

  if (!id) {
    return res.status(400).json({ error: 'Workspace ID required' });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: req.user.id,
        workspaceId: id
      }
    }
  });

  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this workspace' });
  }

  req.membership = membership;
  next();
};

// Get goals for workspace
router.get(
  '/workspace/:workspaceId',
  [param('workspaceId').isString()],
  requireMembership,
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { status } = req.query;

      const where = { workspaceId };
      if (status) where.status = status;

      const goals = await prisma.goal.findMany({
        where,
        include: {
          owner: {
            select: { id: true, name: true, avatarUrl: true }
          },
          milestones: true,
          _count: {
            select: { actionItems: true, milestones: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ goals });
    } catch (error) {
      console.error('Get goals error:', error);
      res.status(500).json({ error: 'Failed to get goals' });
    }
  }
);

// Create goal
router.post(
  '/',
  [
    body('workspaceId').isString(),
    body('title').trim().isLength({ min: 2, max: 200 }),
    body('description').optional().trim(),
    body('dueDate').optional().isISO8601()
  ],
  requireMembership,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workspaceId, title, description, dueDate } = req.body;

      const goal = await prisma.goal.create({
        data: {
          workspaceId,
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : null,
          ownerId: req.user.id
        },
        include: {
          owner: {
            select: { id: true, name: true, avatarUrl: true }
          },
          milestones: true
        }
      });

      // Create activity log
      await prisma.activityLog.create({
        data: {
          goalId: goal.id,
          userId: req.user.id,
          action: 'CREATE',
          details: `Created goal: ${title}`
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId,
          userId: req.user.id,
          action: 'CREATE',
          entityType: 'Goal',
          entityId: goal.id,
          newValue: JSON.stringify(goal)
        }
      });

      console.log(`Emitting goal:created to workspace:${workspaceId}`, goal.id);
      req.io.to(`workspace:${workspaceId}`).emit('goal:created', {
        ...goal,
        createdById: req.user.id
      });

      res.status(201).json({ goal });
    } catch (error) {
      console.error('Create goal error:', error);
      res.status(500).json({ error: 'Failed to create goal' });
    }
  }
);

// Get goal by ID
router.get(
  '/:id',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      const goal = await prisma.goal.findUnique({
        where: { id },
        include: {
          owner: {
            select: { id: true, name: true, avatarUrl: true }
          },
          milestones: {
            orderBy: { createdAt: 'asc' }
          },
          actionItems: {
            include: {
              assignee: {
                select: { id: true, name: true, avatarUrl: true }
              }
            }
          },
          activityLogs: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      });

      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: goal.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      res.json({ goal });
    } catch (error) {
      console.error('Get goal error:', error);
      res.status(500).json({ error: 'Failed to get goal' });
    }
  }
);

// Update goal
router.patch(
  '/:id',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, dueDate, status } = req.body;

      const goal = await prisma.goal.findUnique({
        where: { id }
      });

      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: goal.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const oldGoal = { ...goal };

      const updatedGoal = await prisma.goal.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(status && { status })
        },
        include: {
          owner: {
            select: { id: true, name: true, avatarUrl: true }
          },
          milestones: true
        }
      });

      // Create activity log
      await prisma.activityLog.create({
        data: {
          goalId: id,
          userId: req.user.id,
          action: 'UPDATE',
          details: `Updated goal: ${title || goal.title}`
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: goal.workspaceId,
          userId: req.user.id,
          action: 'UPDATE',
          entityType: 'Goal',
          entityId: id,
          oldValue: JSON.stringify(oldGoal),
          newValue: JSON.stringify(updatedGoal)
        }
      });

      req.io.to(`workspace:${goal.workspaceId}`).emit('goal:updated', updatedGoal);

      res.json({ goal: updatedGoal });
    } catch (error) {
      console.error('Update goal error:', error);
      res.status(500).json({ error: 'Failed to update goal' });
    }
  }
);

// Delete goal
router.delete(
  '/:id',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      const goal = await prisma.goal.findUnique({
        where: { id }
      });

      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      // Check membership (admin or owner)
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: goal.workspaceId
          }
        }
      });

      if (!membership || (membership.role !== 'ADMIN' && goal.ownerId !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await prisma.goal.delete({
        where: { id }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: goal.workspaceId,
          userId: req.user.id,
          action: 'DELETE',
          entityType: 'Goal',
          entityId: id,
          oldValue: JSON.stringify(goal)
        }
      });

      req.io.to(`workspace:${goal.workspaceId}`).emit('goal:deleted', { id });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete goal error:', error);
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  }
);

// Add milestone
router.post(
  '/:id/milestones',
  [
    param('id').isString(),
    body('title').trim().isLength({ min: 2, max: 200 }),
    body('progressPercent').optional().isInt({ min: 0, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { title, progressPercent = 0 } = req.body;

      const goal = await prisma.goal.findUnique({
        where: { id }
      });

      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: goal.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const milestone = await prisma.milestone.create({
        data: {
          goalId: id,
          title,
          progressPercent
        }
      });

      // Create activity log
      await prisma.activityLog.create({
        data: {
          goalId: id,
          userId: req.user.id,
          action: 'MILESTONE_ADD',
          details: `Added milestone: ${title}`
        }
      });

      req.io.to(`workspace:${goal.workspaceId}`).emit('milestone:created', milestone);

      res.status(201).json({ milestone });
    } catch (error) {
      console.error('Create milestone error:', error);
      res.status(500).json({ error: 'Failed to create milestone' });
    }
  }
);

// Update milestone
router.patch(
  '/milestones/:milestoneId',
  [param('milestoneId').isString()],
  async (req, res) => {
    try {
      const { milestoneId } = req.params;
      const { title, progressPercent, isCompleted } = req.body;

      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: { goal: true }
      });

      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: milestone.goal.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const nextProgressPercent = isCompleted !== undefined
        ? (isCompleted ? 100 : 0)
        : progressPercent;

      const updatedMilestone = await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          ...(title && { title }),
          ...(nextProgressPercent !== undefined && { progressPercent: nextProgressPercent })
        }
      });

      const milestones = await prisma.milestone.findMany({
        where: { goalId: milestone.goalId }
      });
      const allMilestonesComplete = milestones.length > 0 && milestones.every(m => m.progressPercent === 100);

      const updatedGoal = await prisma.goal.update({
        where: { id: milestone.goalId },
        data: {
          status: allMilestonesComplete ? 'COMPLETED' : 'ACTIVE'
        },
        include: {
          owner: {
            select: { id: true, name: true, avatarUrl: true }
          },
          milestones: true
        }
      });

      // Create activity log
      await prisma.activityLog.create({
        data: {
          goalId: milestone.goalId,
          userId: req.user.id,
          action: 'MILESTONE_UPDATE',
          details: `Updated milestone: ${title || milestone.title}`
        }
      });

      req.io.to(`workspace:${milestone.goal.workspaceId}`).emit('milestone:updated', updatedMilestone);
      req.io.to(`workspace:${milestone.goal.workspaceId}`).emit('goal:updated', updatedGoal);

      res.json({ milestone: updatedMilestone, goal: updatedGoal });
    } catch (error) {
      console.error('Update milestone error:', error);
      res.status(500).json({ error: 'Failed to update milestone' });
    }
  }
);

// Delete milestone
router.delete(
  '/milestones/:milestoneId',
  [param('milestoneId').isString()],
  async (req, res) => {
    try {
      const { milestoneId } = req.params;

      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: { goal: true }
      });

      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: milestone.goal.workspaceId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await prisma.milestone.delete({
        where: { id: milestoneId }
      });

      req.io.to(`workspace:${milestone.goal.workspaceId}`).emit('milestone:deleted', { id: milestoneId });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete milestone error:', error);
      res.status(500).json({ error: 'Failed to delete milestone' });
    }
  }
);

module.exports = router;
