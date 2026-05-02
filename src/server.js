require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { initDb } = require("./db");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ message: "API route not found." });
    return;
  }
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error." });
});

async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set. Create a .env file.");
  }
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Startup failed:", error.message);
  process.exit(1);
});
