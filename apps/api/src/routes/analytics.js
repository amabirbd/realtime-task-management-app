const express = require('express');
const { param } = require('express-validator');
const prisma = require('../utils/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Date helpers
const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const endOfWeek = (date) => {
  const start = startOfWeek(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
};

const subWeeks = (date, weeks) => {
  const d = new Date(date);
  d.setDate(d.getDate() - weeks * 7);
  return d;
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

router.use(authenticate);

// Get dashboard stats
router.get(
  '/workspace/:workspaceId/dashboard',
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

      // Total goals
      const totalGoals = await prisma.goal.count({
        where: { workspaceId }
      });

      // Completed goals
      const completedGoals = await prisma.goal.count({
        where: { workspaceId, status: 'COMPLETED' }
      });

      // Goals completed this week
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      const completedThisWeek = await prisma.goal.count({
        where: {
          workspaceId,
          status: 'COMPLETED',
          updatedAt: {
            gte: weekStart,
            lte: weekEnd
          }
        }
      });

      // Overdue goals
      const overdueGoals = await prisma.goal.count({
        where: {
          workspaceId,
          status: { not: 'COMPLETED' },
          dueDate: { lt: new Date() }
        }
      });

      // Total action items
      const totalActionItems = await prisma.actionItem.count({
        where: { workspaceId }
      });

      // Completed action items
      const completedActionItems = await prisma.actionItem.count({
        where: { workspaceId, status: 'DONE' }
      });

      // Overdue action items
      const overdueActionItems = await prisma.actionItem.count({
        where: {
          workspaceId,
          status: { not: 'DONE' },
          dueDate: { lt: new Date() }
        }
      });

      // Goal completion chart data (last 4 weeks)
      const completionData = [];
      for (let i = 3; i >= 0; i--) {
        const weekStartDate = startOfWeek(subWeeks(new Date(), i));
        const weekEndDate = endOfWeek(subWeeks(new Date(), i));
        
        const completed = await prisma.goal.count({
          where: {
            workspaceId,
            status: 'COMPLETED',
            updatedAt: {
              gte: weekStartDate,
              lte: weekEndDate
            }
          }
        });

        const created = await prisma.goal.count({
          where: {
            workspaceId,
            createdAt: {
              gte: weekStartDate,
              lte: weekEndDate
            }
          }
        });

        completionData.push({
          week: formatDate(weekStartDate),
          completed,
          created
        });
      }

      // Priority distribution
      const priorityDistribution = await prisma.actionItem.groupBy({
        by: ['priority'],
        where: { workspaceId },
        _count: { priority: true }
      });

      // Status distribution
      const statusDistribution = await prisma.actionItem.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { status: true }
      });

      res.json({
        stats: {
          totalGoals,
          completedGoals,
          completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
          completedThisWeek,
          overdueGoals,
          totalActionItems,
          completedActionItems,
          overdueActionItems
        },
        charts: {
          goalCompletion: completionData,
          priorityDistribution: priorityDistribution.map(p => ({
            priority: p.priority,
            count: p._count.priority
          })),
          statusDistribution: statusDistribution.map(s => ({
            status: s.status,
            count: s._count.status
          }))
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
  }
);

// Export workspace data as CSV
router.get(
  '/workspace/:workspaceId/export',
  [param('workspaceId').isString()],
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { type = 'all' } = req.query;

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

      let csv = '';

      if (type === 'all' || type === 'goals') {
        const goals = await prisma.goal.findMany({
          where: { workspaceId },
          include: {
            owner: { select: { name: true, email: true } },
            milestones: true
          }
        });

        csv += 'Goals\n';
        csv += 'ID,Title,Description,Owner,Status,Due Date,Milestones Count,Created At\n';
        
        for (const goal of goals) {
          csv += `"${goal.id}","${goal.title}","${goal.description || ''}","${goal.owner.name}","${goal.status}","${goal.dueDate || ''}",${goal.milestones.length},"${goal.createdAt}"\n`;
        }

        csv += '\n';
      }

      if (type === 'all' || type === 'action-items') {
        const items = await prisma.actionItem.findMany({
          where: { workspaceId },
          include: {
            assignee: { select: { name: true, email: true } },
            goal: { select: { title: true } }
          }
        });

        csv += 'Action Items\n';
        csv += 'ID,Title,Goal,Assignee,Priority,Status,Due Date,Created At\n';
        
        for (const item of items) {
          csv += `"${item.id}","${item.title}","${item.goal?.title || 'N/A'}","${item.assignee?.name || 'Unassigned'}","${item.priority}","${item.status}","${item.dueDate || ''}","${item.createdAt}"\n`;
        }

        csv += '\n';
      }

      if (type === 'all' || type === 'members') {
        const members = await prisma.workspaceMember.findMany({
          where: { workspaceId },
          include: {
            user: { select: { name: true, email: true } }
          }
        });

        csv += 'Members\n';
        csv += 'ID,Name,Email,Role,Joined At\n';
        
        for (const member of members) {
          csv += `"${member.id}","${member.user.name}","${member.user.email}","${member.role}","${member.joinedAt}"\n`;
        }

        csv += '\n';
      }

      if (type === 'audit-log') {
        // Admin only
        if (membership.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Admin permission required' });
        }

        const logs = await prisma.auditLog.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
          take: 1000
        });

        csv += 'Audit Log\n';
        csv += 'ID,User ID,Action,Entity Type,Entity ID,Old Value,New Value,Created At\n';
        
        for (const log of logs) {
          csv += `"${log.id}","${log.userId || 'System'}","${log.action}","${log.entityType}","${log.entityId}","${(log.oldValue || '').replace(/"/g, '""')}","${(log.newValue || '').replace(/"/g, '""')}","${log.createdAt}"\n`;
        }
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="workspace-${workspaceId}-${type}-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  }
);

module.exports = router;
