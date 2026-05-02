# Team Task Manager (Full-Stack)

Full-stack app for:
- authentication (signup/login)
- project and team management
- task assignment and status tracking
- dashboard with task summary and overdue count
- role-based access control (`admin`, `member`)

## Tech Stack
- Backend: Node.js + Express
- Database: SQLite (file-based SQL)
- Validation: Zod
- Auth: JWT + bcrypt
- Frontend: Vanilla HTML/CSS/JS (served by Express)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example`:
   ```env
   PORT=3000
   JWT_SECRET=replace_with_secure_secret
   DB_PATH=./data/team-task-manager.db
   ```
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open:
   - `http://localhost:3000`

## API Overview

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)

### Projects
- `GET /api/projects`
- `POST /api/projects` (creates project + creator as admin)
- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/members` (admin only)

### Tasks
- `GET /api/tasks/project/:projectId`
- `POST /api/tasks/project/:projectId` (admin only)
- `PATCH /api/tasks/:taskId`
  - admin: can edit all task fields
  - member: can edit only `status`
- `GET /api/tasks/my/dashboard`

## RBAC Rules
- Project `admin`:
  - add/update members in project
  - create tasks
  - update all task fields
- Project `member`:
  - view project and tasks
  - update only task status

## Railway Deployment (Mandatory Requirement)
1. Push this project to GitHub.
2. In Railway, create a new project from the repo.
3. Set environment variables:
   - `JWT_SECRET` (required)
   - `PORT` (optional; Railway provides one)
   - `DB_PATH=./data/team-task-manager.db`
4. Deploy.  
   `railway.json` uses:
   - start command: `npm start`
   - health check: `/health`

Note: SQLite stores data on disk in the container. For persistent production data, attach a managed DB (e.g. PostgreSQL) and migrate schema accordingly.
