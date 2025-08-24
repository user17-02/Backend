const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const auth = require("../middleware/auth");

const router = express.Router();

// 🔹 Test Register (doesn't affect existing register)
router.post("/test-register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, "mysecretkey", { expiresIn: "1h" });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Test Login
router.post("/test-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, "mysecretkey", { expiresIn: "1h" });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get("/protected", auth, (req, res) => {
  res.json({ message: "You have access!", user: req.user });
});

module.exports = router;
