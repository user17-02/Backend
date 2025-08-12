const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/user');

const capitalize = (str) => {
  if (typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Register
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

// Login
router.post('/login', async (req, res) => {
  const { loginInput, password } = req.body;
  try {
    const user = await User.findOne({ $or: [{ email: loginInput }, { username: loginInput }] });
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

// Forgot password
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

// Change password
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

// Get all completed profiles except current user
router.get("/all/:id", async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.params.id }, // exclude current user
      name: { $exists: true, $ne: "" },
      age: { $exists: true, $ne: null },
      city: { $exists: true, $ne: "" },
      height: { $exists: true, $ne: null },
      profession: { $exists: true, $ne: "" },
      image: { $exists: true, $ne: "" }
    });

    console.log(`Found ${users.length} completed profiles (excluding current user)`);

    const safeUsers = users.map(user => {
      const { password, ...rest } = user.toObject();
      return rest;
    });

    res.json(safeUsers);
  } catch (err) {
    console.error(" Error fetching completed profiles:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get a single user by ID
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

// Update user profile
router.put('/:id', async (req, res) => {
  try {
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
        pp.ageRange = pp.ageRange.split(/[-,]/).map(n => Number(n.trim())).filter(n => !isNaN(n));
      }
      if (typeof pp.heightRange === 'string') {
        pp.heightRange = pp.heightRange.split(/[-,]/).map(n => Number(n.trim())).filter(n => !isNaN(n));
      }
      updateData.partnerPreferences = pp;
    }
    updateData.updatedAt = Date.now();

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
      return res.status(400).json({ message: "Validation failed", error: err.message, details: err.errors });
    }
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

// Get all completed profiles
router.get('/', async (req, res) => {
  try {
    const users = await User.find({
      name: { $exists: true, $ne: "" },
      age: { $exists: true },
      city: { $exists: true, $ne: "" },
      image: { $exists: true, $ne: "" }
    });
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  } catch (err) {
    console.error("Fetch complete profiles error:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Filter search
router.get('/filter/search', async (req, res) => {
  try {
    const {
      gender, ageMin, ageMax, heightMin, heightMax,
      profession, religion, caste, state, city
    } = req.query;

    const filter = {
      type: 'user',
      age: { $exists: true, $ne: null },
      height: { $exists: true, $ne: null },
      profession: { $exists: true, $ne: '' },
      city: { $exists: true, $ne: '' }
    };

    if (gender) filter.gender = capitalize(gender);
    if (ageMin || ageMax) {
      filter.age = {};
      if (ageMin) filter.age.$gte = parseInt(ageMin);
      if (ageMax) filter.age.$lte = parseInt(ageMax);
    }
    if (heightMin || heightMax) {
      filter.height = {};
      if (heightMin) filter.height.$gte = parseInt(heightMin);
      if (heightMax) filter.height.$lte = parseInt(heightMax);
    }
    if (profession) filter.profession = new RegExp(profession, 'i');
    if (religion) filter.religion = new RegExp(religion, 'i');
    if (caste) filter.caste = new RegExp(caste, 'i');
    if (state) filter.state = new RegExp(state, 'i');
    if (city) filter.city = new RegExp(city, 'i');

    const users = await User.find(filter);
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  } catch (err) {
    console.error("Filter error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Completed profiles only
router.get('/completed-profiles', async (req, res) => {
  try {
    const users = await User.find({
      type: 'user',
      age: { $exists: true, $ne: null },
      height: { $exists: true, $ne: null },
      profession: { $exists: true, $ne: '' },
      city: { $exists: true, $ne: '' }
    });
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  } catch (err) {
    console.error("Completed profiles fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});





module.exports = router;
 