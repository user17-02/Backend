const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Like = require("../models/Like");
const User = require("../models/user");

// Like or Unlike Toggle
router.post("/toggle", async (req, res) => {
  const { likedFrom, likedTo } = req.body;

  try {
    const existing = await Like.findOne({ likedFrom, likedTo });

    if (existing) {
      await Like.deleteOne({ _id: existing._id });
      return res.json({ message: "Unliked successfully", liked: false });
    }

    const newLike = new Like({ likedFrom, likedTo });
    await newLike.save();
    res.status(201).json({ message: "Liked successfully", liked: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  Get all users who liked this user
router.get("/received/:userId", async (req, res) => {
  try {
    const likes = await Like.find({ likedTo: req.params.userId }).populate("likedFrom");
    res.json({ receivedLikes: likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  Get all users that this user has liked
router.get("/sent/:userId", async (req, res) => {
  try {
    const likes = await Like.find({ likedFrom: req.params.userId }).populate("likedTo");
    const likedUsers = likes.map(like => like.likedTo);
    res.json(likedUsers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//  Get just liked user IDs
router.get("/ids/:userId", async (req, res) => {
  try {
    const likes = await Like.find({ likedFrom: req.params.userId });
    const likedIds = likes.map(like => like.likedTo.toString());
    res.json({ likedIds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  Get list of user IDs who liked me
router.get("/liked-me/:userId", async (req, res) => {
  try {
    const likes = await Like.find({ likedTo: req.params.userId });
    const likedByUserIds = likes.map((like) => like.likedFrom.toString());
    res.json({ likedBy: likedByUserIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//  Manual Unlike (optional, since toggle already handles this)
router.delete("/unlike", async (req, res) => {
  const { likedFrom, likedTo } = req.body;

  try {
    const deleted = await Like.findOneAndDelete({ likedFrom, likedTo });

    if (!deleted) {
      return res.status(404).json({ message: "No like found to delete" });
    }

    return res.status(200).json({ message: "Unliked successfully" });
  } catch (error) {
    console.error(" Error in unlike route:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
