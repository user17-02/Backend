const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  interestFrom: {
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required: true,
  },
  interestTo: {
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true,
  },
  status: {
    type:String,
    enum:["pending","accepted","denied"],
    default:"pending",
  },
  time: {
    type:Date,
    default:Date.now,
  },
    name: String,
  city: String,
  age: Number,
  height: Number,
  job: String,
  time: String,
  type: String,
  image: String,
  badgeColor: String,
   
});

module.exports = mongoose.model('Request',requestSchema);