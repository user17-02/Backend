const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/user');

// Helper to capitalize enum-like strings consistently
const capitalize = (str) => {
  if (typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// ✅ Register
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ email, username, password: hashed });
    await newUser.save();
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Login 
router.post('/login', async (req, res) => {
  const { loginInput, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ email: loginInput }, { username: loginInput }]
    });

    if (!user) return res.status(400).json({ message: "Invalid login" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Incorrect password" });

    const { password: _, ...safeUser } = user.toObject();
    res.json({ message: "Login success", user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Forgot Password (reset to temporary password)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const tempPassword = '123456';
    const hashed = await bcrypt.hash(tempPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: `Temporary password set to '${tempPassword}'. Please login and change it.` });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Route: PUT /api/user/change-password
router.post("/change-password", async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.session?.user?._id; // adjust based on how you're tracking session

  if (!userId) return res.status(401).json({ message: "Not logged in" });

  const hashed = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(userId, {
    password: hashed,
    mustChangePassword: false
  });

  res.status(200).json({ message: "Password changed successfully" });
});

// ✅ Get all users excluding current
router.get('/all/:id', async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.id } });
    const safeUsers = users.map(user => {
      const { password, ...rest } = user.toObject();
      return rest;
    });
    res.json(safeUsers);
  } catch (err) {
    console.error("Get all excluding error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get one user by ID (secured)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Not found" });

    const { password, ...safeUser } = user.toObject();
    res.json(safeUser);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update profile
router.put('/:id', async (req, res) => {
  try {
    console.log("=== Update request ===");
    console.log("User ID:", req.params.id);
    console.log("Raw body:", JSON.stringify(req.body, null, 2));

    const updateData = { ...req.body };

    if (updateData.job) {
      updateData.profession = updateData.job;
      delete updateData.job;
    }
    if (updateData.partnerPreferences?.job) {
      updateData.partnerPreferences.profession = updateData.partnerPreferences.job;
      delete updateData.partnerPreferences.job;
    }

    delete updateData.password;
    delete updateData.name;
    delete updateData.email;

    if (updateData.gender) updateData.gender = capitalize(updateData.gender);
    if (updateData.complexion) updateData.complexion = capitalize(updateData.complexion);
    if (updateData.bodyType) updateData.bodyType = capitalize(updateData.bodyType);

    if (typeof updateData.hobbies === 'string') {
      updateData.hobbies = updateData.hobbies.split(',').map(h => h.trim()).filter(h => h);
    }
    if (typeof updateData.interests === 'string') {
      updateData.interests = updateData.interests.split(',').map(i => i.trim()).filter(i => i);
    }

    if (updateData.partnerPreferences) {
      const pp = { ...updateData.partnerPreferences };

      if (typeof pp.ageRange === 'string') {
        const nums = pp.ageRange.split(/[-,]/).map(n => Number(n.trim())).filter(n => !isNaN(n));
        pp.ageRange = nums;
      }
      if (typeof pp.heightRange === 'string') {
        const nums = pp.heightRange.split(/[-,]/).map(n => Number(n.trim())).filter(n => !isNaN(n));
        pp.heightRange = nums;
      }

      updateData.partnerPreferences = pp;
    }

    updateData.updatedAt = Date.now();

    console.log("Post-mapping updateData:", updateData);

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true, context: 'query' }
    );

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...safeUser } = updated.toObject();
    console.log("Updated user returned:", safeUser);
    res.set('Cache-Control', 'no-store');
    res.json(safeUser);
  } catch (err) {
    console.error("Update failed:", err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation failed", error: err.message, details: err.errors });
    }
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

// ✅ Get users with complete profile only
router.get('/', async (req, res) => {
  try {
    const users = await User.find({
      name: { $exists: true, $ne: "" },
      age: { $exists: true },
      city: { $exists: true, $ne: "" },
      image: { $exists: true, $ne: "" }
    });

    const safeUsers = users.map(user => {
      const { password, ...rest } = user.toObject();
      return rest;
    });

    res.json(safeUsers);
  } catch (err) {
    console.error("Fetch complete profiles error:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Debug endpoint (temporary, remove in production)
router.get('/debug/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json(user);
  } catch (e) {
    console.error("Debug fetch error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
