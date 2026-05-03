# Collaborative Team Hub

A full-stack team collaboration platform built with Next.js 14, Express.js, PostgreSQL, and Socket.io. Deployed on Railway.

## 🚀 Live Demo

- **Live App:** [https://fredocloudweb-production.up.railway.app](https://fredocloudweb-production.up.railway.app)
- **API:** [https://fredocloudapi-production.up.railway.app](https://fredocloudapi-production.up.railway.app)
- **API Docs:** [https://fredocloudapi-production.up.railway.app/api/docs](https://fredocloudapi-production.up.railway.app/api/docs)

**Demo Accounts:**
- `demo@fredocloud.com` / `demo123`
- `admin@fredocloud.com` / `demo123`
- `teammember@fredocloud.com` / `demo123`

## 📁 Project Structure

```
fredocloud/
├── apps/
│   ├── api/                 # Express.js backend
│   │   ├── src/
│   │   │   ├── routes/      # API routes
│   │   │   ├── middleware/  # Auth & validation
│   │   │   ├── utils/       # DB, JWT, Cloudinary
│   │   │   ├── sockets/     # Socket.io handlers
│   │   │   └── index.js     # Server entry
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/                 # Next.js 14 frontend
│       ├── src/
│       │   ├── app/         # App Router
│       │   ├── components/  # UI components
│       │   ├── stores/      # Zustand stores
│       │   ├── hooks/       # Custom hooks
│       │   └── lib/         # Utilities
│       └── package.json
├── packages/
│   ├── shared/              # Shared utilities
│   ├── ui/                  # Shared UI components
│   └── eslint-config/       # Shared ESLint config
├── turbo.json               # Turborepo config
└── package.json             # Root workspace config
```

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js + Express.js
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access + refresh tokens in httpOnly cookies)
- **Real-time:** Socket.io
- **File Storage:** Cloudinary
- **Validation:** express-validator
- **Docs:** Swagger/OpenAPI

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** JavaScript
- **Styling:** Tailwind CSS + CSS Variables
- **State:** Zustand
- **HTTP:** Axios
- **UI Components:** Radix UI + shadcn/ui patterns
- **Real-time:** Socket.io Client
- **Charts:** Recharts
- **Editor:** React-Quill

### DevOps
- **Monorepo:** Turborepo
- **Deployment:** Railway (frontend + backend as separate services)
- **Database:** Railway PostgreSQL plugin

## ✨ Features

### Core Features
- ✅ **Authentication:** Email/password with JWT (httpOnly cookies)
- ✅ **Workspaces:** Create, manage, and switch workspaces
- ✅ **Member Management:** Invite by email, assign roles (Admin/Member)
- ✅ **Goals & Milestones:** Create goals with milestones and progress tracking
- ✅ **Announcements:** Rich-text posts with reactions and comments
- ✅ **Action Items:** Kanban board and list views, priority levels
- ✅ **Workspace Docs:** Real-time collaborative document editing with live cursors
- ✅ **Real-time Updates:** Live updates via Socket.io
- ✅ **Analytics Dashboard:** Stats and charts (Recharts)
- ✅ **CSV Export:** Export workspace data

### Advanced Features (Implemented)
1. **Real-time Workspace Docs Collaboration:** Multiple users can edit workspace documents simultaneously with live cursors, user presence, and document sync events using Socket.io
2. **Optimistic UI:** Actions reflect instantly before server confirmation, with graceful rollback on error

### Bonus Features (Implemented)
- 🌓 **Dark/Light Theme:** System preference detection with next-themes
- 📚 **Swagger API Docs:** Available at `/api/docs`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Cloudinary account (optional, for image uploads)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd fredocloud
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**

**Backend (apps/api/.env):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/fredocloud
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLIENT_URL=http://localhost:3000
PORT=4000
```

**Frontend (apps/web/.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

4. **Set up the database:**
```bash
cd apps/api
npx prisma generate
npx prisma db push
npx prisma db seed
```

5. **Run the development servers:**

From the root directory:
```bash
npm run dev
```

Or individually:
```bash
# Backend
cd apps/api && npm run dev

# Frontend
cd apps/web && npm run dev
```

6. **Open the app:**
- Frontend: http://localhost:3000
- API: http://localhost:4000
- API Docs: http://localhost:4000/api/docs

## 🔐 Authentication

The app uses JWT tokens stored in httpOnly cookies:
- **Access Token:** 15 minutes, sent in cookies
- **Refresh Token:** 7 days, sent in cookies
- **Auto-refresh:** Frontend automatically refreshes expired tokens

## 📝 API Reference

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `PATCH /api/v1/auth/profile` - Update profile (with avatar)

### Workspaces
- `GET /api/v1/workspaces` - List user's workspaces
- `POST /api/v1/workspaces` - Create workspace
- `GET /api/v1/workspaces/:id` - Get workspace details
- `PATCH /api/v1/workspaces/:id` - Update workspace
- `DELETE /api/v1/workspaces/:id` - Delete workspace
- `POST /api/v1/workspaces/:id/invite` - Invite member
- `GET /api/v1/workspaces/:id/members` - List members
- `PATCH /api/v1/workspaces/:id/members/:userId/role` - Update member role
- `DELETE /api/v1/workspaces/:id/members/:userId` - Remove member

### Goals
- `GET /api/v1/goals/workspace/:workspaceId` - List goals
- `POST /api/v1/goals` - Create goal
- `GET /api/v1/goals/:id` - Get goal with milestones
- `PATCH /api/v1/goals/:id` - Update goal
- `DELETE /api/v1/goals/:id` - Delete goal
- `POST /api/v1/goals/:id/milestones` - Add milestone
- `PATCH /api/v1/goals/milestones/:id` - Update milestone
- `DELETE /api/v1/goals/milestones/:id` - Delete milestone

### Announcements
- `GET /api/v1/announcements/workspace/:workspaceId` - List announcements
- `POST /api/v1/announcements` - Create announcement (Admin only)
- `PATCH /api/v1/announcements/:id` - Update announcement
- `DELETE /api/v1/announcements/:id` - Delete announcement
- `POST /api/v1/announcements/:id/react` - Add/remove reaction
- `POST /api/v1/announcements/:id/comments` - Add comment
- `DELETE /api/v1/announcements/comments/:id` - Delete comment

### Action Items
- `GET /api/v1/action-items/workspace/:workspaceId` - List action items
- `POST /api/v1/action-items` - Create action item
- `PATCH /api/v1/action-items/:id` - Update action item
- `PATCH /api/v1/action-items/:id/status` - Update status (for Kanban)
- `DELETE /api/v1/action-items/:id` - Delete action item

### Analytics
- `GET /api/v1/analytics/workspace/:id/dashboard` - Dashboard stats
- `GET /api/v1/analytics/workspace/:id/export?type=goals|action-items|members|audit-log` - Export CSV

## 🎯 Advanced Features Implemented

### 1. Real-time Workspace Docs Collaboration
- Uses Socket.io to sync workspace document edits in real-time
- Live colored cursors show which teammate is editing and where they are typing
- User presence shows active editors inside a document
- Document rooms are isolated per workspace document
- Sync request/response events keep late joiners aligned with the latest content

### 2. Optimistic UI
- All mutations show immediate feedback
- Rollback gracefully on error with toast notifications
- Loading states don't block UI

## 🎨 Design Decisions

- **No TypeScript:** As per requirements, the entire project uses JavaScript
- **Minimal UI:** Clean, functional interface using Tailwind CSS
- **No Redux:** Zustand for simple state management
- **shadcn/ui patterns:** Component structure inspired by shadcn but built manually
- **Server-side auth:** JWT in httpOnly cookies for security


## ⚠️ Known Limitations

- Email notifications require SMTP configuration
- Offline support is not implemented
- PWA features not implemented
- No automated tests (would add with more time)

## 📄 License

MIT License - Built for the Fredocloud technical assessment.

## 👥 Author

Built as a technical assessment for Fredocloud.
