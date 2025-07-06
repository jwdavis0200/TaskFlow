const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Board = require("../models/Board");
const Column = require("../models/Column");
const Project = require("../models/Project");
const Task = require("../models/Task");

// GET all boards
router.get("/", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      // If no projectId is provided, it's a bad request.
      return res.status(400).json({ message: "A projectId is required to fetch boards." });
    }
    console.log(`Fetching boards for project ${projectId} with manual column population...`);
    const boards = await Board.find({ project: projectId });
    console.log("Boards found:", boards.length);

    // Manually populate columns and tasks for each board
    const boardsWithColumns = await Promise.all(
      boards.map(async (board) => {
        const columns = await Column.find({ board: board._id });
        console.log(
          `Board ${board.name} has ${columns.length} columns:`,
          columns.map((c) => c.name)
        );

        // Populate tasks for each column
        const columnsWithTasks = await Promise.all(
          columns.map(async (column) => {
            const tasks = await Task.find({ column: column._id });
            console.log(`Column ${column.name} has ${tasks.length} tasks`);
            return {
              ...column.toObject(),
              tasks: tasks,
            };
          })
        );

        return {
          ...board.toObject(),
          columns: columnsWithTasks,
        };
      })
    );

    res.json(boardsWithColumns);
  } catch (err) {
    console.error("Error fetching boards:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET one board
router.get("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id).populate("columns");
    if (board == null) {
      return res.status(404).json({ message: "Cannot find board" });
    }
    res.json(board);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Enhanced CREATE board with Project.boards array update
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { name, projectId } = req.body;
    
    console.log('Creating board with:', { name, projectId });
    
    if (!name || !projectId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Name and projectId are required' });
    }

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    // Check if project exists
    const project = await Project.findById(projectId).session(session);
    if (!project) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('Project found:', project.name);

    const board = new Board({
      name,
      project: projectId, // Map projectId to project field
    });

    const newBoard = await board.save({ session });
    console.log('Board saved:', newBoard._id);

    // Create default columns for the new board
    const defaultColumns = [
      { name: "To Do", board: newBoard._id },
      { name: "In Progress", board: newBoard._id },
      { name: "Done", board: newBoard._id },
    ];

    const createdColumns = await Column.insertMany(defaultColumns, { session });
    newBoard.columns = createdColumns.map((col) => col._id);
    await newBoard.save({ session });

    console.log('Default columns created:', createdColumns.length);

    // Update Project.boards array
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $push: { boards: newBoard._id } },
      { session, new: true }
    );

    console.log('Project updated, boards count:', updatedProject.boards.length);

    await session.commitTransaction();

    const populatedBoard = await Board.findById(newBoard._id).populate("columns");
    res.status(201).json(populatedBoard);
  } catch (err) {
    await session.abortTransaction();
    console.error('Error creating board:', err);
    res.status(400).json({
      message: err.message,
      details: err.name || 'Unknown error'
    });
  } finally {
    session.endSession();
  }
});

// UPDATE one board
router.patch("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (board == null) {
      return res.status(404).json({ message: "Cannot find board" });
    }
    if (req.body.name != null) {
      board.name = req.body.name;
    }
    const updatedBoard = await board.save();
    res.json(updatedBoard);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE one board with proper cleanup
router.delete("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.startTransaction();
    
    const boardId = req.params.id;
    console.log('Deleting board:', boardId);
    
    // Validate boardId
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid board ID' });
    }

    // Find the board first
    const board = await Board.findById(boardId).session(session);
    if (!board) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Cannot find board" });
    }

    console.log('Board found:', board.name, 'Project:', board.project);

    // Delete all tasks in this board's columns
    const tasksDeleted = await Task.deleteMany({ board: boardId }, { session });
    console.log('Tasks deleted:', tasksDeleted.deletedCount);

    // Delete all columns in this board
    const columnsDeleted = await Column.deleteMany({ board: boardId }, { session });
    console.log('Columns deleted:', columnsDeleted.deletedCount);

    // Remove board from project's boards array
    const updatedProject = await Project.findByIdAndUpdate(
      board.project,
      { $pull: { boards: boardId } },
      { session, new: true }
    );

    if (updatedProject) {
      console.log('Project updated, remaining boards:', updatedProject.boards.length);
    }

    // Delete the board itself
    await Board.findByIdAndDelete(boardId, { session });
    console.log('Board deleted successfully');

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Board deleted successfully",
      details: {
        tasksDeleted: tasksDeleted.deletedCount,
        columnsDeleted: columnsDeleted.deletedCount
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error deleting board:', err);
    res.status(500).json({
      success: false,
      message: err.message,
      details: err.name || 'Unknown error'
    });
  } finally {
    await session.endSession();
  }
});

// Nested route for tasks within a specific project/board/column
router.get("/:boardId/columns/:columnId/tasks", async (req, res) => {
  try {
    const { boardId, columnId } = req.params;
    
    // Find tasks that belong to the specific column
    const tasks = await Task.find({
      board: boardId,
      column: columnId
    });
    
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
