const express = require("express");
const router = express.Router();

// Models
const User = require("../models/user");
const Request = require("../models/request"); // interest/request model


// Helper: sanitize user object

function sanitizeUser(userDoc) {
  if (!userDoc) return null;
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;
  delete user.password;
  return user;
}

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalInterests = await Request.countDocuments();
    const acceptedRequests = await Request.countDocuments({ status: "accepted" });
    const deniedRequests = await Request.countDocuments({ status: "denied" });

    res.json({
      totalUsers,
      totalInterests,
      acceptedRequests,
      deniedRequests,
    });
  } catch (err) {
    console.error("Admin /stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/users

router.get("/users", async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const filter = {};

    if (search) {
      const r = new RegExp(search, "i");
      filter.$or = [{ name: r }, { username: r }, { email: r }];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    const safe = users.map(sanitizeUser);
    res.json(safe);
  } catch (err) {
    console.error("Admin GET /users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/users/:id
router.put("/users/:id", async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.password) delete updateData.password;

    if (updateData.gender && typeof updateData.gender === "string") {
      updateData.gender = updateData.gender.charAt(0).toUpperCase() + updateData.gender.slice(1).toLowerCase();
    }
    if (updateData.complexion && typeof updateData.complexion === "string") {
      updateData.complexion = updateData.complexion.charAt(0).toUpperCase() + updateData.complexion.slice(1).toLowerCase();
    }

    const updated = await User.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true, context: "query" });
    if (!updated) return res.status(404).json({ message: "User not found" });

    res.json(sanitizeUser(updated));
  } catch (err) {
    console.error("Admin PUT /users/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/users/:id

router.delete("/users/:id", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Admin DELETE /users/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// GET /api/admin/interests

router.get("/interests", async (req, res) => {
  try {
    const statusRaw = (req.query.status || "").trim();
    const filter = {};
    if (statusRaw) {
      filter.status = statusRaw.toLowerCase();
    }

    const interests = await Request.find(filter)
      .populate("interestFrom", "name username email city image")
      .populate("interestTo", "name username email city image")
      .sort({ time: -1 });

    res.json(interests);
  } catch (err) {
    console.error("Admin GET /interests error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// PUT /api/admin/interests/:id

router.put("/interests/:id", async (req, res) => {
  try {
    const status = (req.body.status || "").toLowerCase();
    if (!["pending", "accepted", "denied"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await Request.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: "Interest not found" });

    res.json({ message: `Interest ${status}`, interest: updated });
  } catch (err) {
    console.error("Admin PUT /interests/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// DELETE /api/admin/interests/:id

router.delete("/interests/:id", async (req, res) => {
  try {
    const deleted = await Request.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Interest not found" });
    res.json({ message: "Interest deleted" });
  } catch (err) {
    console.error("Admin DELETE /interests/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
