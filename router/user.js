const express =require('express');
const router = express.Router();
const User = require('../models/user');
router.get('/',async(req,res) => {
    const user = await User.find();
    console.log(user);
res.json(user);
});
router.post('/',async(request,response)=>

{
    try{
    const userData=new User(request.body);
    const result=await userData.save();
    response.json(result);
}
catch (error) {
    // Check for email format error (regex match)
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return response.status(400).json({ error: messages.join(", ") });
    }

    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return response.status(409).json({ error: "Email already exists" });
    }

    // Other errors
    return response.status(500).json({ error: "Server error" });
  }
});

router.post('/register',async (req,res)=>{
    console.log(req.body);
    const {email,password,name} = req.body;

    if (!email || !password || !name){
        return res.status(400).json({message: "All field are required"});
    }
    try {
        const existingUser = await User.findOne({email});
        if (existingUser){
            return res.status(400).json({message:"user already exists"});
        }
        const newUser = new User ({email,password,name});
        await newUser.save();
        res.status(201).json({message:'user registered successfully'});
    } catch (err) {
        console.error(err);
        res.status(500).json({message:'server error'});
    }
});

router.post('/login', async (req, res) => {
    console.log(req.body);
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // const isMatch = await bcrypt.compare(password, user.password);
const isMatch = password == user.password ? true : false;
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // // Success: Don't send the password in the response
        // const { password: userPassword, ...userData } = user._doc;

        return res.status(200).json({
            message: 'Login successful',
            user: user,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
module.exports=router;