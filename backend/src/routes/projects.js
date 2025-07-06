const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Board = require("../models/Board");
const Task = require("../models/Task");

// GET all projects with populated boards
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find()
      .populate({
        path: 'boardsList',
        select: 'name createdAt'
      });
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

// GET boards for a specific project
router.get("/:id/boards", async (req, res) => {
  try {
    const { id: projectId } = req.params;
    
    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Fetch boards with populated columns and tasks
    const boards = await Board.find({ project: projectId })
      .populate({
        path: 'columns',
        populate: {
          path: 'tasks',
          model: 'Task'
        }
      });

    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

// DELETE one project with proper cascade deletion
router.delete("/:id", async (req, res) => {
  const mongoose = require("mongoose");
  const Column = require("../models/Column");
  const session = await mongoose.startSession();
  
  try {
    await session.startTransaction();
    
    const projectId = req.params.id;
    console.log('Deleting project:', projectId);
    
    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    // Find the project first
    const project = await Project.findById(projectId).session(session);
    if (!project) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Cannot find project" });
    }

    console.log('Project found:', project.name);

    // Delete all tasks in this project
    const tasksDeleted = await Task.deleteMany({ project: projectId }, { session });
    console.log('Tasks deleted:', tasksDeleted.deletedCount);

    // Delete all columns in this project's boards
    const columnsDeleted = await Column.deleteMany({
      board: { $in: project.boards }
    }, { session });
    console.log('Columns deleted:', columnsDeleted.deletedCount);

    // Delete all boards in this project
    const boardsDeleted = await Board.deleteMany({ project: projectId }, { session });
    console.log('Boards deleted:', boardsDeleted.deletedCount);

    // Delete the project itself
    await Project.findByIdAndDelete(projectId, { session });
    console.log('Project deleted successfully');

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Project deleted successfully",
      details: {
        tasksDeleted: tasksDeleted.deletedCount,
        columnsDeleted: columnsDeleted.deletedCount,
        boardsDeleted: boardsDeleted.deletedCount
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error deleting project:', err);
    res.status(500).json({
      success: false,
      message: err.message,
      details: err.name || 'Unknown error'
    });
  } finally {
    await session.endSession();
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
