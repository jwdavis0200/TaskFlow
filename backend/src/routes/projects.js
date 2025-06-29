const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Task = require("../models/Task");

// GET all projects
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET one project
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (project == null) {
      return res.status(404).json({ message: "Cannot find project" });
    }
    res.json(project);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// CREATE one project
router.post("/", async (req, res) => {
  const project = new Project({
    name: req.body.name,
    description: req.body.description,
  });
  try {
    const newProject = await project.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE one project
router.patch("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (project == null) {
      return res.status(404).json({ message: "Cannot find project" });
    }
    if (req.body.name != null) {
      project.name = req.body.name;
    }
    if (req.body.description != null) {
      project.description = req.body.description;
    }
    const updatedProject = await project.save();
    res.json(updatedProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE one project
router.delete("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (project == null) {
      return res.status(404).json({ message: "Cannot find project" });
    }
    await project.remove();
    res.json({ message: "Deleted Project" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Nested routes for tasks within projects/boards/columns
// GET tasks for a specific column
router.get(
  "/:projectId/boards/:boardId/columns/:columnId/tasks",
  async (req, res) => {
    try {
      const { projectId, boardId, columnId } = req.params;
      const tasks = await Task.find({
        project: projectId,
        board: boardId,
        column: columnId,
      });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// CREATE task for a specific column
router.post(
  "/:projectId/boards/:boardId/columns/:columnId/tasks",
  async (req, res) => {
    try {
      const { projectId, boardId, columnId } = req.params;
      const task = new Task({
        title: req.body.title,
        description: req.body.description,
        project: projectId,
        board: boardId,
        column: columnId,
        dueDate: req.body.dueDate,
        priority: (req.body.priority || "Medium").toLowerCase(),
        status: (req.body.status || "To Do").toLowerCase().replace(/\s+/g, "-"),
      });

      const newTask = await task.save();
      res.status(201).json(newTask);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// UPDATE task for a specific column
router.put(
  "/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId",
  async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = await Task.findById(taskId);

      if (!task) {
        return res.status(404).json({ message: "Cannot find task" });
      }

      // Update task fields
      if (req.body.title != null) task.title = req.body.title;
      if (req.body.description != null) task.description = req.body.description;
      if (req.body.dueDate != null) task.dueDate = req.body.dueDate;
      if (req.body.priority != null) task.priority = req.body.priority;
      if (req.body.status != null) task.status = req.body.status;
      if (req.body.columnId != null) task.column = req.body.columnId;
      if (req.body.timeSpent != null) task.timeSpent = req.body.timeSpent;
      if (req.body.isRunning != null) task.isRunning = req.body.isRunning;
      if (req.body.isCompleted != null) task.isCompleted = req.body.isCompleted;

      const updatedTask = await task.save();
      res.json(updatedTask);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// DELETE task for a specific column
router.delete(
  "/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId",
  async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = await Task.findById(taskId);

      if (!task) {
        return res.status(404).json({ message: "Cannot find task" });
      }

      await task.deleteOne();
      res.json({ message: "Deleted Task" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
