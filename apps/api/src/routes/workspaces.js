const express = require('express');
const { body, param, validationResult } = require('express-validator');
const prisma = require('../utils/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all workspaces for current user
router.get('/', async (req, res) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user.id },
      include: {
        workspace: {
          include: {
            owner: {
              select: { id: true, name: true, avatarUrl: true }
            },
            _count: {
              select: { members: true }
            }
          }
        }
      }
    });

    const workspaces = memberships.map(m => ({
      ...m.workspace,
      role: m.role,
      memberCount: m.workspace._count.members
    }));

    res.json({ workspaces });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to get workspaces' });
  }
});

// Create workspace
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim(),
    body('accentColor').optional().isHexColor()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, accentColor } = req.body;

      const workspace = await prisma.$transaction(async (tx) => {
        // Create workspace
        const newWorkspace = await tx.workspace.create({
          data: {
            name,
            description,
            accentColor: accentColor || '#3b82f6',
            ownerId: req.user.id
          }
        });

        // Add creator as admin
        await tx.workspaceMember.create({
          data: {
            userId: req.user.id,
            workspaceId: newWorkspace.id,
            role: 'ADMIN'
          }
        });

        return newWorkspace;
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId: req.user.id,
          action: 'CREATE',
          entityType: 'Workspace',
          entityId: workspace.id,
          newValue: JSON.stringify({ name, description, accentColor })
        }
      });

      res.status(201).json({ workspace });
    } catch (error) {
      console.error('Create workspace error:', error);
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  }
);

// Get workspace by ID
router.get(
  '/:id',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: id
          }
        },
        include: {
          workspace: {
            include: {
              owner: {
                select: { id: true, name: true, avatarUrl: true }
              },
              _count: {
                select: {
                  members: true,
                  goals: true,
                  actionItems: true
                }
              }
            }
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this workspace' });
      }

      const workspace = {
        ...membership.workspace,
        role: membership.role,
        stats: {
          members: membership.workspace._count.members,
          goals: membership.workspace._count.goals,
          actionItems: membership.workspace._count.actionItems
        }
      };

      res.json({ workspace });
    } catch (error) {
      console.error('Get workspace error:', error);
      res.status(500).json({ error: 'Failed to get workspace' });
    }
  }
);

// Update workspace
router.patch(
  '/:id',
  [
    param('id').isString(),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim(),
    body('accentColor').optional().isHexColor()
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, accentColor } = req.body;

      // Check admin permission
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: id
          }
        }
      });

      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin permission required' });
      }

      // Get old values for audit
      const oldWorkspace = await prisma.workspace.findUnique({
        where: { id }
      });

      const workspace = await prisma.workspace.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(accentColor && { accentColor })
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: id,
          userId: req.user.id,
          action: 'UPDATE',
          entityType: 'Workspace',
          entityId: id,
          oldValue: JSON.stringify(oldWorkspace),
          newValue: JSON.stringify(workspace)
        }
      });

      // Emit update
      req.io.to(`workspace:${id}`).emit('workspace:updated', workspace);

      res.json({ workspace });
    } catch (error) {
      console.error('Update workspace error:', error);
      res.status(500).json({ error: 'Failed to update workspace' });
    }
  }
);

// Delete workspace
router.delete(
  '/:id',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check ownership
      const workspace = await prisma.workspace.findUnique({
        where: { id }
      });

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      if (workspace.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Only owner can delete workspace' });
      }

      await prisma.workspace.delete({
        where: { id }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete workspace error:', error);
      res.status(500).json({ error: 'Failed to delete workspace' });
    }
  }
);

// Invite member
router.post(
  '/:id/invite',
  [
    param('id').isString(),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['ADMIN', 'MEMBER'])
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { email, role = 'MEMBER' } = req.body;

      // Check admin permission
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: id
          }
        }
      });

      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin permission required' });
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found with this email' });
      }

      // Check if already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: id
          }
        }
      });

      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member' });
      }

      // Add member
      const newMember = await prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: id,
          role
        },
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true }
          }
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'INVITE',
          content: `You were invited to join a workspace`,
          link: `/workspaces/${id}`
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: id,
          userId: req.user.id,
          action: 'INVITE',
          entityType: 'WorkspaceMember',
          entityId: newMember.id,
          newValue: JSON.stringify({ userId: user.id, role })
        }
      });

      // Emit update
      req.io.to(`workspace:${id}`).emit('member:joined', newMember);

      res.status(201).json({ member: newMember });
    } catch (error) {
      console.error('Invite member error:', error);
      res.status(500).json({ error: 'Failed to invite member' });
    }
  }
);

// Get workspace members
router.get(
  '/:id/members',
  [param('id').isString()],
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check membership
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

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: id },
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true }
          }
        }
      });

      res.json({ members });
    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json({ error: 'Failed to get members' });
    }
  }
);

// Update member role
router.patch(
  '/:id/members/:userId/role',
  [
    param('id').isString(),
    param('userId').isString(),
    body('role').isIn(['ADMIN', 'MEMBER'])
  ],
  async (req, res) => {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;

      // Check admin permission
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: id
          }
        }
      });

      if (!membership || membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin permission required' });
      }

      // Can't change own role
      if (userId === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }

      const updatedMember = await prisma.workspaceMember.update({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId: id
          }
        },
        data: { role },
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true }
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: id,
          userId: req.user.id,
          action: 'UPDATE_ROLE',
          entityType: 'WorkspaceMember',
          entityId: updatedMember.id,
          newValue: JSON.stringify({ role })
        }
      });

      req.io.to(`workspace:${id}`).emit('member:updated', updatedMember);

      res.json({ member: updatedMember });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  }
);

// Remove member
router.delete(
  '/:id/members/:userId',
  [param('id').isString(), param('userId').isString()],
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      // Check admin permission or self-removal
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

      // Allow self-removal or admin removal
      if (userId !== req.user.id && membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin permission required' });
      }

      // Check if trying to remove owner
      const workspace = await prisma.workspace.findUnique({
        where: { id }
      });

      if (workspace.ownerId === userId) {
        return res.status(400).json({ error: 'Cannot remove workspace owner' });
      }

      await prisma.workspaceMember.delete({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId: id
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          workspaceId: id,
          userId: req.user.id,
          action: 'REMOVE',
          entityType: 'WorkspaceMember',
          entityId: userId
        }
      });

      req.io.to(`workspace:${id}`).emit('member:left', { userId });

      res.json({ success: true });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
);

module.exports = router;
