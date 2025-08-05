// messageRoutes.js
const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const Notification = require("../models/notification"); //  import Notification model

//  Save new message AND create notification
router.post("/", async (req, res) => {
  try {
    const message = new Message(req.body);
    const saved = await message.save();

    //  Create notification for new message
    const notification = new Notification({
      sender: req.body.sender,
      receiver: req.body.receiver,
      type: "message",
      text: "📩 You have a new message.",
    });
    await notification.save();

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  Get all messages between two users
router.get("/:senderId/:receiverId", async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.senderId, receiver: req.params.receiverId },
        { sender: req.params.receiverId, receiver: req.params.senderId },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  Mark all messages from sender to receiver as seen
router.put("/mark-seen", async (req, res) => {
  const { sender, receiver } = req.body;

  try {
    const result = await Message.updateMany(
      { sender, receiver, seen: false },
      { $set: { seen: true } }
    );

    res.json({
      success: true,
      message: "Messages marked as seen",
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("Error marking messages as seen:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
