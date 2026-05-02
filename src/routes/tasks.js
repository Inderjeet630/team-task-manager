const express = require("express");
const { z } = require("zod");
const { all, get, run } = require("../db");
const { authRequired } = require("../middleware/auth");
const { projectAdminRequired, projectMemberRequired } = require("../middleware/projectAccess");

const router = express.Router();

const createTaskSchema = z.object({
  title: z.string().min(2).max(180),
  description: z.string().max(500).optional().default(""),
  assignedTo: z.number().int().positive().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional().default("todo"),
  dueDate: z.string().nullable().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(2).max(180).optional(),
  description: z.string().max(500).optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  dueDate: z.string().nullable().optional(),
});

router.use(authRequired);

router.get("/project/:projectId", projectMemberRequired, async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const tasks = await all(
      `SELECT tasks.*, users.name AS assigned_to_name
       FROM tasks
       LEFT JOIN users ON users.id = tasks.assigned_to
       WHERE tasks.project_id = ?
       ORDER BY tasks.created_at DESC`,
      [projectId]
    );
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

router.post("/project/:projectId", projectAdminRequired, async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    const { title, description, assignedTo = null, status, dueDate = null } = parsed.data;
    if (assignedTo) {
      const membership = await get(
        "SELECT id FROM project_members WHERE project_id = ? AND user_id = ?",
        [projectId, assignedTo]
      );
      if (!membership) {
        res.status(400).json({ message: "Assigned user is not a project member." });
        return;
      }
    }

    const result = await run(
      `INSERT INTO tasks (project_id, title, description, assigned_to, status, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, title, description, assignedTo, status, dueDate, req.user.id]
    );

    const task = await get("SELECT * FROM tasks WHERE id = ?", [result.lastID]);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

router.patch("/:taskId", async (req, res, next) => {
  try {
    const taskId = Number(req.params.taskId);
    const task = await get("SELECT * FROM tasks WHERE id = ?", [taskId]);
    if (!task) {
      res.status(404).json({ message: "Task not found." });
      return;
    }

    const membership = await get(
      "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
      [task.project_id, req.user.id]
    );
    if (!membership) {
      res.status(403).json({ message: "You are not a member of this project." });
      return;
    }

    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    if (membership.role !== "admin") {
      const allowedForMember = ["status"];
      const attempted = Object.keys(parsed.data);
      const forbidden = attempted.some((key) => !allowedForMember.includes(key));
      if (forbidden) {
        res.status(403).json({ message: "Members can only update task status." });
        return;
      }
    }

    const nextTask = {
      title: parsed.data.title ?? task.title,
      description: parsed.data.description ?? task.description,
      assigned_to:
        Object.prototype.hasOwnProperty.call(parsed.data, "assignedTo")
          ? parsed.data.assignedTo
          : task.assigned_to,
      status: parsed.data.status ?? task.status,
      due_date:
        Object.prototype.hasOwnProperty.call(parsed.data, "dueDate")
          ? parsed.data.dueDate
          : task.due_date,
    };

    if (nextTask.assigned_to) {
      const assignedMember = await get(
        "SELECT id FROM project_members WHERE project_id = ? AND user_id = ?",
        [task.project_id, nextTask.assigned_to]
      );
      if (!assignedMember) {
        res.status(400).json({ message: "Assigned user is not a project member." });
        return;
      }
    }

    await run(
      `UPDATE tasks
       SET title = ?, description = ?, assigned_to = ?, status = ?, due_date = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nextTask.title,
        nextTask.description,
        nextTask.assigned_to,
        nextTask.status,
        nextTask.due_date,
        taskId,
      ]
    );

    const updated = await get("SELECT * FROM tasks WHERE id = ?", [taskId]);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get("/my/dashboard", async (req, res, next) => {
  try {
    const tasks = await all(
      `SELECT tasks.*, projects.name AS project_name
       FROM tasks
       INNER JOIN projects ON projects.id = tasks.project_id
       INNER JOIN project_members ON project_members.project_id = projects.id
       WHERE project_members.user_id = ?
       ORDER BY tasks.updated_at DESC`,
      [req.user.id]
    );

    const now = new Date();
    const summary = {
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "todo").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      done: tasks.filter((task) => task.status === "done").length,
      overdue: tasks.filter(
        (task) => task.due_date && task.status !== "done" && new Date(task.due_date) < now
      ).length,
    };

    res.json({ summary, tasks });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
