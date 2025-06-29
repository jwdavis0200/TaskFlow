const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/taskflow";

async function updateTasks() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const Task = mongoose.model("Task");
    const result = await Task.updateMany(
      { status: "todo" },
      { $set: { status: "to-do" } }
    );

    console.log(`Updated ${result.nModified} tasks from "todo" to "to-do"`);
    mongoose.connection.close();
  } catch (error) {
    console.error("Error updating tasks:", error);
    process.exit(1);
  }
}

updateTasks();
