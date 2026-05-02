const { get } = require("../db");

async function getMembership(projectId, userId) {
  return get(
    `SELECT project_members.*, projects.owner_id
     FROM project_members
     INNER JOIN projects ON projects.id = project_members.project_id
     WHERE project_members.project_id = ? AND project_members.user_id = ?`,
    [projectId, userId]
  );
}

async function projectMemberRequired(req, res, next) {
  const projectId = Number(req.params.projectId || req.body.projectId);
  if (!projectId) {
    res.status(400).json({ message: "projectId is required." });
    return;
  }

  const membership = await getMembership(projectId, req.user.id);
  if (!membership) {
    res.status(403).json({ message: "Access denied for this project." });
    return;
  }

  req.projectMembership = membership;
  next();
}

async function projectAdminRequired(req, res, next) {
  const projectId = Number(req.params.projectId || req.body.projectId);
  if (!projectId) {
    res.status(400).json({ message: "projectId is required." });
    return;
  }

  const membership = await getMembership(projectId, req.user.id);
  if (!membership || membership.role !== "admin") {
    res.status(403).json({ message: "Admin access required for this project." });
    return;
  }

  req.projectMembership = membership;
  next();
}

module.exports = {
  projectMemberRequired,
  projectAdminRequired,
};
