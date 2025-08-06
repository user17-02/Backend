const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/user');

// Capitalizes first letter of enum-like strings
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

// ✅ Forgot password
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

// ✅ Change password
router.put('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get all users except current user
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

// ✅ Get a single user by ID
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

// ✅ Update user profile
router.put('/:id', async (req, res) => {
  try {
    console.log("=== Update request ===");
    console.log("User ID:", req.params.id);
    console.log("Raw body:", JSON.stringify(req.body, null, 2));

    const updateData = { ...req.body };

    // Remap job → profession
    if (updateData.job) {
      updateData.profession = updateData.job;
      delete updateData.job;
    }

    if (updateData.partnerPreferences?.job) {
      updateData.partnerPreferences.profession = updateData.partnerPreferences.job;
      delete updateData.partnerPreferences.job;
    }

    // Prevent updating sensitive fields
    delete updateData.password;
    delete updateData.name;
    delete updateData.email;

    // Normalize enums
    if (updateData.gender) updateData.gender = capitalize(updateData.gender);
    if (updateData.complexion) updateData.complexion = capitalize(updateData.complexion);
    if (updateData.bodyType) updateData.bodyType = capitalize(updateData.bodyType);

    // Handle hobbies/interests
    if (typeof updateData.hobbies === 'string') {
      updateData.hobbies = updateData.hobbies.split(',').map(h => h.trim()).filter(h => h);
    }

    if (typeof updateData.interests === 'string') {
      updateData.interests = updateData.interests.split(',').map(i => i.trim()).filter(i => i);
    }

    // Handle partner preferences
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

    if (!updated) return res.status(404).json({ message: "User not found" });

    const { password, ...safeUser } = updated.toObject();
    res.set('Cache-Control', 'no-store');
    res.json(safeUser);
  } catch (err) {
    console.error("Update failed:", err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: "Validation failed",
        error: err.message,
        details: err.errors
      });
    }
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

// ✅ Get all users with completed profile
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



module.exports = router;
