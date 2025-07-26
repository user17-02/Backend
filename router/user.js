const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/user');

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
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Login (secured response)
router.post('/login', async (req, res) => {
  const { loginInput, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ email: loginInput }, { username: loginInput }]
    });

    if (!user) return res.status(400).json({ message: "Invalid login" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Incorrect password" });

    // Don't send full user with password
    const { password: _, ...safeUser } = user.toObject();
    res.json({ message: "Login success", user: safeUser });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
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
  } catch {
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
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update profile
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Convert hobbies and interests from comma-separated string to array if needed
    if (typeof updateData.hobbies === 'string') {
      updateData.hobbies = updateData.hobbies.split(',').map(h => h.trim()).filter(h => h);
    }
    if (typeof updateData.interests === 'string') {
      updateData.interests = updateData.interests.split(',').map(i => i.trim()).filter(i => i);
    }

    // Convert partnerPreferences ageRange and heightRange from string to array if needed
    if (updateData.partnerPreferences) {
      if (typeof updateData.partnerPreferences.ageRange === 'string') {
        const nums = updateData.partnerPreferences.ageRange
          .split(/[-,]/)
          .map(n => Number(n.trim()))
          .filter(n => !isNaN(n));
        updateData.partnerPreferences.ageRange = nums;
      }
      if (typeof updateData.partnerPreferences.heightRange === 'string') {
        const nums = updateData.partnerPreferences.heightRange
          .split(/[-,]/)
          .map(n => Number(n.trim()))
          .filter(n => !isNaN(n));
        updateData.partnerPreferences.heightRange = nums;
      }
    }

    // Prevent password update here
    delete updateData.password;

    // Manually update updatedAt
    updateData.updatedAt = Date.now();

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...safeUser } = updated.toObject();
    res.json(safeUser);
  } catch (err) {
    console.error(err);
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
  } catch {
    res.status(500).json({ message: "Error fetching users" });
  }
});

module.exports = router;
