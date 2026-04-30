const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || 'demo';
const defaultAvatarUrl = `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/user-png-33842_pcvh30`;

async function main() {
  console.log('Seeding database...');

  // Create demo users
  const passwordHash = await bcrypt.hash('demo123', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@fredocloud.com' },
    update: { avatarUrl: defaultAvatarUrl },
    create: {
      email: 'demo@fredocloud.com',
      passwordHash,
      name: 'Demo User',
      avatarUrl: defaultAvatarUrl
    }
  });

  const teamMember = await prisma.user.upsert({
    where: { email: 'teammate@fredocloud.com' },
    update: { avatarUrl: defaultAvatarUrl },
    create: {
      email: 'teammate@fredocloud.com',
      passwordHash,
      name: 'Team Member',
      avatarUrl: defaultAvatarUrl
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fredocloud.com' },
    update: { avatarUrl: defaultAvatarUrl },
    create: {
      email: 'admin@fredocloud.com',
      passwordHash,
      name: 'Admin User',
      avatarUrl: defaultAvatarUrl
    }
  });

  console.log('Created users:', { demoUser: demoUser.id, teamMember: teamMember.id, admin: admin.id });

  // Create demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'demo-workspace-001' },
    update: {},
    create: {
      id: 'demo-workspace-001',
      name: 'Demo Workspace',
      description: 'A demo workspace to explore the features',
      accentColor: '#3b82f6',
      ownerId: admin.id
    }
  });

  console.log('Created workspace:', workspace.id);

  // Add members to workspace
  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: admin.id,
        workspaceId: workspace.id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      workspaceId: workspace.id,
      role: 'ADMIN'
    }
  });

  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: demoUser.id,
        workspaceId: workspace.id
      }
    },
    update: {},
    create: {
      userId: demoUser.id,
      workspaceId: workspace.id,
      role: 'MEMBER'
    }
  });

  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: teamMember.id,
        workspaceId: workspace.id
      }
    },
    update: {},
    create: {
      userId: teamMember.id,
      workspaceId: workspace.id,
      role: 'MEMBER'
    }
  });

  console.log('Added members to workspace');

  // Create demo goals
  const goal1 = await prisma.goal.create({
    data: {
      workspaceId: workspace.id,
      title: 'Launch Product v1.0',
      description: 'Complete the first major release of our product',
      ownerId: admin.id,
      dueDate: new Date('2024-06-01'),
      status: 'ACTIVE'
    }
  });

  const goal2 = await prisma.goal.create({
    data: {
      workspaceId: workspace.id,
      title: 'Grow User Base',
      description: 'Reach 10,000 active users by end of Q2',
      ownerId: demoUser.id,
      dueDate: new Date('2024-05-31'),
      status: 'ACTIVE'
    }
  });

  const goal3 = await prisma.goal.create({
    data: {
      workspaceId: workspace.id,
      title: 'Improve Documentation',
      description: 'Update and expand product documentation',
      ownerId: teamMember.id,
      dueDate: new Date('2024-04-15'),
      status: 'COMPLETED'
    }
  });

  console.log('Created goals:', { goal1: goal1.id, goal2: goal2.id, goal3: goal3.id });

  // Create milestones
  await prisma.milestone.createMany({
    data: [
      { goalId: goal1.id, title: 'Design complete', progressPercent: 100 },
      { goalId: goal1.id, title: 'Development phase', progressPercent: 60 },
      { goalId: goal1.id, title: 'Testing', progressPercent: 20 },
      { goalId: goal2.id, title: 'Marketing campaign', progressPercent: 40 },
      { goalId: goal3.id, title: 'API docs', progressPercent: 100 }
    ]
  });

  console.log('Created milestones');

  // Create action items
  await prisma.actionItem.createMany({
    data: [
      {
        workspaceId: workspace.id,
        goalId: goal1.id,
        title: 'Finalize UI mockups',
        assigneeId: demoUser.id,
        priority: 'HIGH',
        dueDate: new Date('2024-03-15'),
        status: 'DONE'
      },
      {
        workspaceId: workspace.id,
        goalId: goal1.id,
        title: 'Implement authentication',
        assigneeId: admin.id,
        priority: 'URGENT',
        dueDate: new Date('2024-03-20'),
        status: 'IN_PROGRESS'
      },
      {
        workspaceId: workspace.id,
        goalId: goal1.id,
        title: 'Write unit tests',
        assigneeId: teamMember.id,
        priority: 'MEDIUM',
        dueDate: new Date('2024-03-25'),
        status: 'TODO'
      },
      {
        workspaceId: workspace.id,
        goalId: goal2.id,
        title: 'Social media campaign',
        assigneeId: demoUser.id,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS'
      }
    ]
  });

  console.log('Created action items');

  // Create announcements
  const announcement1 = await prisma.announcement.create({
    data: {
      workspaceId: workspace.id,
      authorId: admin.id,
      content: '<p>Welcome to the Demo Workspace! This is a place to collaborate and track our progress.</p>',
      isPinned: true
    }
  });

  const announcement2 = await prisma.announcement.create({
    data: {
      workspaceId: workspace.id,
      authorId: admin.id,
      content: '<p>Q1 goals have been updated. Please check your assigned action items.</p>',
      isPinned: false
    }
  });

  console.log('Created announcements:', { announcement1: announcement1.id, announcement2: announcement2.id });

  // Add reactions
  await prisma.reaction.createMany({
    data: [
      { announcementId: announcement1.id, userId: demoUser.id, emoji: '👍' },
      { announcementId: announcement1.id, userId: teamMember.id, emoji: '🎉' },
      { announcementId: announcement2.id, userId: demoUser.id, emoji: '✅' }
    ]
  });

  console.log('Created reactions');

  // Add comments
  await prisma.comment.createMany({
    data: [
      {
        announcementId: announcement1.id,
        authorId: demoUser.id,
        content: 'Looking forward to working with everyone!',
        mentions: []
      },
      {
        announcementId: announcement2.id,
        authorId: teamMember.id,
        content: 'I will update my tasks by EOD.',
        mentions: []
      }
    ]
  });

  console.log('Created comments');

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: admin.id,
        action: 'CREATE',
        entityType: 'Workspace',
        entityId: workspace.id,
        newValue: JSON.stringify({ name: workspace.name })
      },
      {
        workspaceId: workspace.id,
        userId: admin.id,
        action: 'INVITE',
        entityType: 'WorkspaceMember',
        entityId: demoUser.id,
        newValue: JSON.stringify({ email: demoUser.email, role: 'MEMBER' })
      }
    ]
  });

  console.log('Created audit logs');

  console.log('\n=====================================');
  console.log('Seeding completed successfully!');
  console.log('=====================================');
  console.log('Demo accounts:');
  console.log('  Email: demo@fredocloud.com');
  console.log('  Email: teammember@fredocloud.com');
  console.log('  Email: admin@fredocloud.com');
  console.log('  Password for all: demo123');
  console.log('=====================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
