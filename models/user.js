const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"]
  },
  password: { type: String, required: true },

  // Basic profile info
  name: { type: String },
  age: { type: Number, min: 18, max: 100 },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  phone: { type: String },

  // Location
  city: { type: String },
  state: { type: String },
  country: { type: String, default: 'India' },

  // Appearance
  height: { type: Number }, // in cm
  weight: { type: Number }, // optional
  complexion: { type: String, enum: ['Fair', 'Wheatish', 'Dark'] },
  bodyType: { type: String, enum: ['Slim', 'Average', 'Athletic', 'Heavy'] },

  // Religion
  religion: { type: String },
  caste: { type: String },
  motherTongue: { type: String },

  // Marital
  maritalStatus: { type: String, enum: ['Never Married', 'Divorced', 'Widowed', 'Separated'], default: 'Never Married' },
  isDivorced: { type: Boolean, default: false },

  // Career & Education
  qualification: { type: String },
  profession: { type: String },
  company: { type: String },
  income: { type: String },
  educationDetails: { type: String },

  // Lifestyle
  diet: { type: String, enum: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'] },
  smoking: { type: String, enum: ['Yes', 'No', 'Occasionally'] },
  drinking: { type: String, enum: ['Yes', 'No', 'Occasionally'] },

  // Interests & Bio
  hobbies: [String],
  interests: [String],
  aboutMe: { type: String },

  // Partner Preferences
  partnerPreferences: {
    ageRange: { type: [Number], default: [25, 35] }, // [minAge, maxAge]
    heightRange: { type: [Number] },
    maritalStatus: { type: [String] },
    religion: { type: String },
    caste: { type: String },
    education: { type: String },
    profession: { type: String },
    location: { type: String }
  },

  // Image
  image: { type: String }, // stored as base64 or URL

  // App metadata
  type: { type: String, default: "Standard" },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", userSchema);
