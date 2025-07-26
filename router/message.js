// router/message.js
const express = require("express");
const router = express.Router();
const Message = require("../models/message");

// ✅ Save new message
router.post("/", async (req, res) => {
  const { sender, receiver, text } = req.body;
  try {
    const newMessage = new Message({ sender, receiver, text });
    await newMessage.save();
    res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    res.status(500).json({ error: "Failed to save message" });
  }
});

// ✅ Get all messages between two users
router.get("/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const messages = await Message.find({
      $or: [ 
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
