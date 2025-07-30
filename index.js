const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// MongoDB Models
const Message = require("./models/message");
const Notification = require("./models/notification");

// Routers
const userRouter = require("./router/user");
const requestRouterWithSocket = require("./router/Request")(io);
const messageRouter = require("./router/messageRouter");
const likeRouter = require("./router/LikeRouter");
const notificationRouter = require("./router/notificationRouter");

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose
  .connect("mongodb://localhost:27017/test", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// REST API Routes
app.use("/api/user", userRouter);
app.use("/api/requests", requestRouterWithSocket);
app.use("/api/message", messageRouter);
app.use("/api/likes", likeRouter);
app.use("/api/notifications", notificationRouter);

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  // Join personal room
  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(` User ${userId} joined their personal room`);
  });

  // Send message + notification
  socket.on("sendMessage", async ({ roomId, sender, receiver, text }) => {
    try {
      // Save the message
      const newMessage = await Message.create({ sender, receiver, text });

      // Emit message to receiver's room
      io.to(roomId).emit("receiveMessage", newMessage);

      // Save notification
      await Notification.create({ sender, receiver, type: "message" });

      // Emit new notification
      io.to(receiver).emit("newNotification", {
        sender,
        type: "message",
        text: "📩 You have a new message!",
      });
    } catch (err) {
      console.error(" Error in sendMessage:", err.message);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(" Client disconnected:", socket.id);
  });
});

// Start the server
server.listen(5000, () => {
  console.log(" Server running at http://localhost:5000");
});
