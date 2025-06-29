const mongoose = require("mongoose");

const ColumnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide column name"],
    maxlength: 50,
  },
  board: {
    type: mongoose.Types.ObjectId,
    ref: "Board",
    required: [true, "Please provide board ID"],
  },
  tasks: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Task",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Column", ColumnSchema);
