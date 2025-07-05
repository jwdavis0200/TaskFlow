const express = require("express");
const router = express.Router();
const Board = require("../models/Board");
const Column = require("../models/Column");
const Task = require("../models/Task");

// GET all boards
router.get("/", async (req, res) => {
  try {
    console.log("Fetching boards with manual column population...");
    const boards = await Board.find();
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

// CREATE one board
router.post("/", async (req, res) => {
  const board = new Board({
    name: req.body.name,
    project: req.body.projectId, // Map projectId to project field
  });
  try {
    const newBoard = await board.save();

    // Create default columns for the new board
    const defaultColumns = [
      { name: "To Do", board: newBoard._id },
      { name: "In Progress", board: newBoard._id },
      { name: "Done", board: newBoard._id },
    ];

    const createdColumns = await Column.insertMany(defaultColumns);

    // Update the board with the column references
    newBoard.columns = createdColumns.map((col) => col._id);
    await newBoard.save();

    // Return the board with populated columns
    const populatedBoard = await Board.findById(newBoard._id).populate(
      "columns"
    );
    res.status(201).json(populatedBoard);
  } catch (err) {
    res.status(400).json({ message: err.message });
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

// DELETE one board
router.delete("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (board == null) {
      return res.status(404).json({ message: "Cannot find board" });
    }
    await board.remove();
    res.json({ message: "Deleted Board" });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
