const mongoose = require("mongoose");
const Board = require("./src/models/Board");
const Column = require("./src/models/Column");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/taskflow", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function seedColumns() {
  try {
    console.log("Starting to seed columns...");

    // Find all boards that don't have columns
    const boards = await Board.find();
    console.log(`Found ${boards.length} boards`);

    for (const board of boards) {
      if (!board.columns || board.columns.length === 0) {
        console.log(`Adding columns to board: ${board.name} (${board._id})`);

        // Create default columns
        const defaultColumns = [
          { name: "To Do", board: board._id },
          { name: "In Progress", board: board._id },
          { name: "Done", board: board._id },
        ];

        const createdColumns = await Column.insertMany(defaultColumns);
        console.log(`Created ${createdColumns.length} columns`);

        // Update the board with column references
        board.columns = createdColumns.map((col) => col._id);
        await board.save();
        console.log(`Updated board ${board.name} with column references`);
      } else {
        console.log(
          `Board ${board.name} already has ${board.columns.length} columns`
        );
      }
    }

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding columns:", error);
    process.exit(1);
  }
}

seedColumns();
