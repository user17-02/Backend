const express = require('express');
const Request = require('../models/Request');
const User = require('../models/user'); // Required for /search

module.exports = (io) => {
  const router = express.Router();

  // ✅ Get all requests
  router.get('/', async (req, res) => {
    try {
      const requests = await Request.find();
      res.json(requests);
    } catch (err) {
      console.error("❌ ERROR in /api/requests:", err);
      res.status(500).json({ message: "Error fetching requests" });
    }
  });

  // ✅ Send new interest + update likedBy + emit notification
  router.post("/", async (req, res) => {
    const { interestFrom, interestTo } = req.body;

    try {
      const newRequest = new Request({
        interestFrom,
        interestTo,
        status: "pending",
      });

      await newRequest.save();

      // ✅ Add sender to likedBy of receiver
      await User.findByIdAndUpdate(interestTo, {
        $addToSet: { likedBy: interestFrom } // avoid duplicates
      });

      // ✅ Emit real-time notification to receiver
      io.to(interestTo).emit("newNotification", {
        message: "Someone sent you a request!",
        from: interestFrom,
        type: "interest",
        timestamp: Date.now()
      });

      res.status(201).json({ message: "Interest sent successfully!" });
    } catch (error) {
      console.error("❌ Error sending interest:", error);
      res.status(500).json({ message: "Error sending interest", error });
    }
  });

  // ✅ Update request status (accept or deny)
  router.put("/:id", async (req, res) => {
    try {
      const updated = await Request.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.status(200).json({ message: `Request ${req.body.status}` });
    } catch (err) {
      console.error("❌ Update error:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // ✅ Optional: Filter/Search users
  router.get('/search', async (req, res) => {
    try {
      const { age, height, city, job } = req.query;
      const query = {};
      if (age) query.age = Number(age);
      if (height) query.height = height;
      if (city) query.city = city;
      if (job) query.job = job;

      const users = await User.find(query);
      res.status(200).json(users);
    } catch (err) {
      console.error("❌ Search error:", err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  return router;
};
