const mongoose =require('mongoose');
const userschema = new mongoose.Schema({
   name :{
    type:String,
    required:[true,"Name is required"]
   },
   email :{
    type:String,
    required:[true,"Email is required"],
    unique:true,
    match: [ /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid email address"]
    },
    password: {
        type:String,
        required : [true,"password is required"]
    }

   
});


 

module.exports =mongoose.model("users",userschema);