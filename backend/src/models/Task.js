const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please provide task title"],
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  column: {
    type: mongoose.Types.ObjectId,
    ref: "Column",
    required: [true, "Please provide column ID"],
  },
  board: {
    type: mongoose.Types.ObjectId,
    ref: "Board",
    required: [true, "Please provide board ID"],
  },
  project: {
    type: mongoose.Types.ObjectId,
    ref: "Project",
    required: [true, "Please provide project ID"],
  },
  assignedTo: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  dueDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["to-do", "in-progress", "done"],
    default: "to-do",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  timeSpent: { type: Number, default: 0 },
  isRunning: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("Task", TaskSchema);
