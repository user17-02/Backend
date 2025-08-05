// models/notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", //  this is critical
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // (optional but recommended)
      required: true
    },
    type: { type: String, required: true }, // 'message' or 'interest'
    text: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
