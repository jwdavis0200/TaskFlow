const express = require("express");
const router = express.Router();
const Task = require("../models/Task");

// GET all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET one task
router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task == null) {
      return res.status(404).json({ message: "Cannot find task" });
    }
    res.json(task);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// CREATE one task
router.post("/", async (req, res) => {
  const task = new Task({
    title: req.body.title,
    description: req.body.description,
    project: req.body.projectId, // Map projectId to project field
    board: req.body.boardId, // Map boardId to board field
    column: req.body.columnId, // Map columnId to column field
    dueDate: req.body.dueDate,
    priority: req.body.priority,
  });
  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE one task
router.patch("/:id", async (req, res) => {
  try {
    console.log("Backend PATCH /:id - Request received", {
      taskId: req.params.id,
      body: req.body,
    });

    const task = await Task.findById(req.params.id);
    if (task == null) {
      console.log("Backend PATCH /:id - Task not found");
      return res.status(404).json({ message: "Cannot find task" });
    }

    console.log("Backend PATCH /:id - Original task", {
      id: task._id,
      status: task.status,
      column: task.column,
    });

    if (req.body.title != null) {
      task.title = req.body.title;
    }
    if (req.body.description != null) {
      task.description = req.body.description;
    }
    if (req.body.boardId != null) {
      task.board = req.body.boardId;
    }
    if (req.body.columnId != null) {
      task.column = req.body.columnId;
    }
    if (req.body.column != null) {
      task.column = req.body.column;
    }
    if (req.body.dueDate != null) {
      task.dueDate = req.body.dueDate;
    }
    if (req.body.status != null) {
      task.status = req.body.status;
    }
    if (req.body.priority != null) {
      task.priority = req.body.priority;
    }
    if (req.body.timeSpent != null) {
      task.timeSpent = req.body.timeSpent;
    }
    if (req.body.isRunning != null) {
      task.isRunning = req.body.isRunning;
    }
    if (req.body.isCompleted != null) {
      task.isCompleted = req.body.isCompleted;
    }

    const updatedTask = await task.save();
    console.log("Backend PATCH /:id - Updated task", {
      id: updatedTask._id,
      status: updatedTask.status,
      column: updatedTask.column,
    });

    res.json(updatedTask);
  } catch (err) {
    console.error("Backend PATCH /:id - Error:", err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE one task
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (task == null) {
      return res.status(404).json({ message: "Cannot find task" });
    }
    res.json({ message: "Deleted Task" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
