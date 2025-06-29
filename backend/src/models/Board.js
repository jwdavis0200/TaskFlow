const mongoose = require("mongoose");

const BoardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide board name"],
    maxlength: 50,
  },
  project: {
    type: mongoose.Types.ObjectId,
    ref: "Project",
    required: [true, "Please provide project ID"],
  },
  columns: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Column",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Board", BoardSchema);
