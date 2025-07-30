// models/notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    type: { type: String, required: true }, // 'message' or 'interest'
    text: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
