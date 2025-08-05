const express = require("express");
const router = express.Router();
const Notification = require("../models/notification");

//  Get all notifications for a user with sender name/image
router.get("/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({ receiver: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("sender", "name image");

    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  Mark all notifications as read for a user
router.put("/mark-read/:userId", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { receiver: req.params.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// routes/notificationRoutes.js
router.delete("/:id", async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
