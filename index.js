const express = require ('express');
const app = express();
const cors = require("cors");
const userrouter=require('./router/user');
const mongoose = require('mongoose');
app.use(cors());
mongoose.connect("mongodb://localhost:27017/test",{})
.then(()=> console.log("success"))
.catch(error=> console.error("error"));
app.use(express.json());

app.use("/api/user",userrouter);


const PORT = 5000;
app.listen(PORT,()=>{
    console.log(`Server is running on http://localhost:${PORT}`);
});