require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const projectRoutes = require("./routes/projects");
const boardRoutes = require("./routes/boards");
const taskRoutes = require("./routes/tasks");
const authMiddleware = require("./middleware/auth");
const pushService = require("./services/pushService");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:4173",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Connect to MongoDB
const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/taskflow";
mongoose
  .connect(mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Public route for VAPID public key
app.get("/api/vapidPublicKey", (req, res) => {
  res.send(pushService.publicVapidKey);
});

// Route for subscribing to push notifications
app.post("/api/subscribe", async (req, res) => {
  const subscription = req.body;
  console.log("Subscription received:", subscription);
  try {
    await pushService.sendPushNotification(subscription, {
      title: "Welcome!",
      body: "You are now subscribed to notifications.",
    });
    res.status(201).json({ message: "Subscription successful" });
  } catch (error) {
    console.error("Error in subscription:", error);
    res.status(500).json({ message: "Failed to subscribe" });
  }
});

// Use routes (temporarily disable auth for development)
app.use("/api/projects", projectRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/tasks", taskRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
