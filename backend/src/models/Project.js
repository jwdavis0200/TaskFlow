const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide project name"],
    maxlength: 50,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  owner: {
    type: mongoose.Types.ObjectId,
    ref: "User", // Assuming a User model will be created later
    // Temporarily remove required constraint
  },
  members: [
    {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  ],
  boards: [{
    type: mongoose.Types.ObjectId,
    ref: "Board",
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual populate for boards
ProjectSchema.virtual('boardsList', {
  ref: 'Board',
  localField: '_id',
  foreignField: 'project'
});

ProjectSchema.set('toJSON', { virtuals: true });
ProjectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Project", ProjectSchema);
