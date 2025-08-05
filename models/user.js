// models/user.js
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
  mustChangePassword: { type: Boolean, default: false },

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

  // Legacy/front-end field "job" that syncs into profession
  job: {
    type: String,
    set: function (v) {
      this.profession = v;
      return v;
    }
  },

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
    city:{type:String},
    profession: { type: String },
    location: { type: String },
    job: { type: String } ,
    complexion: { type: String, enum: ['Fair', 'Wheatish', 'Dark'] }// legacy / frontend variant
  },

  // Image
  image: { type: String }, // stored as base64 or URL

  // App metadata
  type: { type: String, default: "Standard" },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook: normalize and sync legacy partnerPreferences.job to profession, update timestamp
userSchema.pre('save', function (next) {
  const capitalize = str => {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  if (this.complexion) this.complexion = capitalize(this.complexion);
  if (this.bodyType) this.bodyType = capitalize(this.bodyType);
  if (this.gender) this.gender = capitalize(this.gender);

  // partnerPreferences.job -> profession if profession missing
  if (this.partnerPreferences) {
    if (this.partnerPreferences.job && !this.partnerPreferences.profession) {
      this.partnerPreferences.profession = this.partnerPreferences.job;
    }
    // Optionally normalize partnerPreferences fields (e.g., profession)
    if (this.partnerPreferences.profession) {
      this.partnerPreferences.profession = capitalize(this.partnerPreferences.profession);
    }
  }

  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", userSchema);
