const express = require("express");
const { z } = require("zod");
const { all, get, run } = require("../db");
const { authRequired } = require("../middleware/auth");
const { projectAdminRequired, projectMemberRequired } = require("../middleware/projectAccess");

const router = express.Router();

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(400).optional().default(""),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

router.use(authRequired);

router.get("/", async (req, res, next) => {
  try {
    const projects = await all(
      `SELECT projects.id, projects.name, projects.description, projects.created_at, project_members.role
       FROM projects
       INNER JOIN project_members ON project_members.project_id = projects.id
       WHERE project_members.user_id = ?
       ORDER BY projects.created_at DESC`,
      [req.user.id]
    );
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    const { name, description } = parsed.data;
    const projectResult = await run(
      "INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)",
      [name, description, req.user.id]
    );

    await run("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'admin')", [
      projectResult.lastID,
      req.user.id,
    ]);

    const project = await get("SELECT * FROM projects WHERE id = ?", [projectResult.lastID]);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

router.get("/:projectId", projectMemberRequired, async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const project = await get("SELECT * FROM projects WHERE id = ?", [projectId]);
    const members = await all(
      `SELECT project_members.role, users.id, users.name, users.email
       FROM project_members
       INNER JOIN users ON users.id = project_members.user_id
       WHERE project_members.project_id = ?`,
      [projectId]
    );

    res.json({ ...project, members });
  } catch (error) {
    next(error);
  }
});

router.post("/:projectId/members", projectAdminRequired, async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    const { email, role } = parsed.data;
    const user = await get("SELECT id, name, email FROM users WHERE email = ?", [email]);
    if (!user) {
      res.status(404).json({ message: "No user found with this email." });
      return;
    }

    await run(
      "INSERT OR REPLACE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
      [projectId, user.id, role]
    );

    res.json({ message: "Member added/updated.", member: { ...user, role } });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      res.status(409).json({ message: "Member already exists in this project." });
      return;
    }
    next(error);
  }
});

router.get("/:projectId/members", projectMemberRequired, async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const members = await all(
      `SELECT project_members.role, users.id, users.name, users.email
       FROM project_members
       INNER JOIN users ON users.id = project_members.user_id
       WHERE project_members.project_id = ?`,
      [projectId]
    );
    res.json(members);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
