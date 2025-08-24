// router/Request.js
const express = require("express");
const Request = require("../models/request");
const User = require("../models/user");
const Notification = require("../models/notification");

// Export a function that receives `io` and returns the router
module.exports = (io) => {
  const router = express.Router();

  // 📌 Get ALL requests (debugging)
  router.get("/", async (req, res) => {
    try {
      const requests = await Request.find()
        .populate("interestFrom", "name city age height profession image")
        .populate("interestTo", "name city age height profession image");

      res.json(requests);
    } catch (err) {
      console.error("❌ ERROR in GET /api/requests:", err);
      res.status(500).json({ message: "Error fetching requests" });
    }
  });

  // 📌 Send new interest
  router.post("/", async (req, res) => {
    const { interestFrom, interestTo } = req.body;

    try {
      if (!interestFrom || !interestTo) {
        return res.status(400).json({ message: "interestFrom and interestTo are required" });
      }
      if (String(interestFrom) === String(interestTo)) {
        return res.status(400).json({ message: "Cannot send interest to yourself" });
      }

      // Avoid duplicate active/pending requests between the same two users (any direction)
      const existing = await Request.findOne({
        $or: [
          { interestFrom, interestTo, status: { $in: ["pending", "accepted"] } },
          { interestFrom: interestTo, interestTo: interestFrom, status: { $in: ["pending", "accepted"] } },
        ],
      });

      if (existing) {
        return res.status(200).json(existing); // return existing so UI can reflect it
      }

      const newRequest = await Request.create({
        interestFrom,
        interestTo,
        status: "pending",
      });

      // Add sender to likedBy of receiver (if you maintain this field)
      await User.findByIdAndUpdate(interestTo, {
        $addToSet: { likedBy: interestFrom },
      });

      // Save notification
      const notification = await Notification.create({
        sender: interestFrom,
        receiver: interestTo,
        text: "💌 Someone sent you a request!",
        type: "interest",
      });

      // Emit real-time notification
      io.to(String(interestTo)).emit("newNotification", {
        message: notification.text,
        from: String(interestFrom),
        type: notification.type,
        timestamp: notification.createdAt,
      });

      // Return the full request document so frontend can update button/status
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("❌ Error sending interest:", error);
      res.status(500).json({ message: "Error sending interest" });
    }
  });

  // 📌 Update request status (accept or deny)
  router.put("/:id", async (req, res) => {
    try {
      const { status } = req.body;
      if (!["pending", "accepted", "denied"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updated = await Request.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Optional: notify the other user on accept/deny
      let notifyUser = null;
      if (status === "accepted" || status === "denied") {
        // notify the sender if receiver updates, or notify receiver if sender updates (depending on your UI)
        notifyUser = updated.interestFrom;
        await Notification.create({
          sender: updated.interestTo,
          receiver: notifyUser,
          text: status === "accepted" ? "✅ Your request was accepted!" : "❌ Your request was denied.",
          type: "interest",
        });
        io.to(String(notifyUser)).emit("newNotification", {
          sender: String(updated.interestTo),
          type: "interest",
          text: status === "accepted" ? "✅ Your request was accepted!" : "❌ Your request was denied.",
        });
      }

      res.status(200).json(updated);
    } catch (err) {
      console.error("❌ Update error:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // 📌 Get SENT requests by user
  router.get("/sent/:userId", async (req, res) => {
    try {
      const requests = await Request.find({ interestFrom: req.params.userId })
        .populate("interestTo", "name city age height profession image");
      res.json(requests);
    } catch (err) {
      console.error("❌ Sent requests error:", err);
      res.status(500).json({ message: "Error fetching sent requests" });
    }
  });

  // 📌 Get RECEIVED (PENDING) requests by user
  router.get("/received/:userId", async (req, res) => {
    try {
      const requests = await Request.find({
        interestTo: req.params.userId,
        status: "pending",
      }).populate("interestFrom", "name city age height profession image");
      res.json(requests);
    } catch (err) {
      console.error("❌ Received requests error:", err);
      res.status(500).json({ message: "Error fetching received requests" });
    }
  });

  // 📌 Get ACCEPTED requests by user (either direction)
  router.get("/accepted/:userId", async (req, res) => {
    try {
      const requests = await Request.find({
        $or: [
          { interestFrom: req.params.userId, status: "accepted" },
          { interestTo: req.params.userId, status: "accepted" },
        ],
      })
        .populate("interestFrom", "name city age height profession image")
        .populate("interestTo", "name city age height profession image");

      res.json(requests);
    } catch (err) {
      console.error("❌ Accepted requests error:", err);
      res.status(500).json({ message: "Error fetching accepted requests" });
    }
  });

  // 📌 Get DENIED requests by user (either direction) — FIXED
  // ----- Get Denied Requests -----
router.get("/denied/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const requests = await Request.find({
      status: "denied",
      $or: [{ interestFrom: id }, { interestTo: id }],
    })
      .populate("interestFrom", "name age city job image")
      .populate("interestTo", "name age city job image");

    // Process so frontend only gets "the other user"
    const formatted = requests.map((req) => {
      let otherUser;

      if (req.interestFrom._id.toString() === id) {
        // I sent the request, they denied → show interestTo
        otherUser = req.interestTo;
      } else {
        // They sent the request, I denied → show interestFrom
        otherUser = req.interestFrom;
      }

      return {
        _id: req._id,
        status: req.status,
        deniedBy: req.interestTo._id.toString() === id ? "me" : "them",
        user: otherUser,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching denied requests:", err);
    res.status(500).json({ error: "Server error" });
  }
});

  // 📌 Optional: Filter/Search users
  router.get("/search", async (req, res) => {
    try {
      const { age, height, city, job, profession } = req.query;
      const query = {};
      if (age) query.age = Number(age);
      if (height) query.height = Number(height);
      if (city) query.city = city;
      // support both "job" and "profession" query keys
      if (profession) query.profession = profession;
      if (job) query.profession = job;

      const users = await User.find(query);
      res.status(200).json(users);
    } catch (err) {
      console.error("❌ Search error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  return router;
};
