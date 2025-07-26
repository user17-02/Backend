const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Import Models
const Message = require("./models/message");

// Import Routers
const userRouter = require("./router/user");
const requestRouter = require("./router/Request");
const messageRouter = require("./router/message");
const likeRouter = require("./router/LikeRouter"); // 🔄 Case-sensitive: use exact filename

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/test", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Socket.io Setup
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  socket.on("join", (roomId) => {
    socket.join(roomId);
    console.log(`✅ Socket ${socket.id} joined room: ${roomId}`);
  });

  socket.on("sendMessage", async ({ roomId, sender, receiver, text }) => {
    try {
      const newMessage = await Message.create({ sender, receiver, text });
      io.to(roomId).emit("receiveMessage", newMessage);
    } catch (err) {
      console.error("❌ Error saving message:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// Routes
app.use("/api/user", userRouter);
app.use("/api/requests", requestRouter);
app.use("/api/message", messageRouter);
app.use("/api/likes", likeRouter); // ✅ Mounting the LikeRouter here

// Start Server
server.listen(5000, () => {
  console.log("🚀 Server is running at http://localhost:5000");
});

