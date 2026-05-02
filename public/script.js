const output = document.getElementById("output");
const tokenKey = "ttm_token";

function getToken() {
  return localStorage.getItem(tokenKey);
}

function write(data) {
  output.textContent = JSON.stringify(data, null, 2);
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, { ...options, headers });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw json;
  return json;
}

function value(id) {
  return document.getElementById(id).value.trim();
}

document.getElementById("signupBtn").onclick = async () => {
  try {
    const data = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: value("name"),
        email: value("email"),
        password: value("password"),
      }),
    });
    localStorage.setItem(tokenKey, data.token);
    write(data);
  } catch (error) {
    write(error);
  }
};

document.getElementById("loginBtn").onclick = async () => {
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: value("email"),
        password: value("password"),
      }),
    });
    localStorage.setItem(tokenKey, data.token);
    write(data);
  } catch (error) {
    write(error);
  }
};

document.getElementById("meBtn").onclick = async () => {
  try {
    write(await api("/api/auth/me"));
  } catch (error) {
    write(error);
  }
};

document.getElementById("createProjectBtn").onclick = async () => {
  try {
    const data = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: value("projectName"),
        description: value("projectDescription"),
      }),
    });
    write(data);
  } catch (error) {
    write(error);
  }
};

document.getElementById("listProjectsBtn").onclick = async () => {
  try {
    write(await api("/api/projects"));
  } catch (error) {
    write(error);
  }
};

document.getElementById("addMemberBtn").onclick = async () => {
  try {
    const projectId = value("memberProjectId");
    const data = await api(`/api/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({
        email: value("memberEmail"),
        role: value("memberRole"),
      }),
    });
    write(data);
  } catch (error) {
    write(error);
  }
};

document.getElementById("listMembersBtn").onclick = async () => {
  try {
    const projectId = value("memberProjectId");
    write(await api(`/api/projects/${projectId}/members`));
  } catch (error) {
    write(error);
  }
};

document.getElementById("createTaskBtn").onclick = async () => {
  try {
    const projectId = value("taskProjectId");
    const assignedTo = value("taskAssignedTo");
    const data = await api(`/api/tasks/project/${projectId}`, {
      method: "POST",
      body: JSON.stringify({
        title: value("taskTitle"),
        description: value("taskDescription"),
        assignedTo: assignedTo ? Number(assignedTo) : null,
        dueDate: value("taskDueDate") || null,
      }),
    });
    write(data);
  } catch (error) {
    write(error);
  }
};

document.getElementById("listTasksBtn").onclick = async () => {
  try {
    const projectId = value("taskProjectId");
    write(await api(`/api/tasks/project/${projectId}`));
  } catch (error) {
    write(error);
  }
};

document.getElementById("updateTaskBtn").onclick = async () => {
  try {
    const taskId = value("updateTaskId");
    const data = await api(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: value("updateStatus"),
      }),
    });
    write(data);
  } catch (error) {
    write(error);
  }
};

document.getElementById("dashboardBtn").onclick = async () => {
  try {
    write(await api("/api/tasks/my/dashboard"));
  } catch (error) {
    write(error);
  }
};
