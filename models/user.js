const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String },
  username: { type: String },
  email: { type: String },
  password: { type: String },
  age: { type: Number },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  height: { type: Number },
  weight: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  complexion: { type: String, enum: ['Fair', 'Wheatish', 'Dark'] },
  bodyType: { type: String },
  profession: { type: String },
  qualification: { type: String },
  company: { type: String },
  income: { type: Number },
  educationDetails: { type: String },
  religion: { type: String },
  caste: { type: String },
  motherTongue: { type: String },
  maritalStatus: { type: String },
  isDivorced: { type: Boolean, default: false },
  diet: { type: String },
  smoking: { type: String },
  drinking: { type: String },
  hobbies: {
    type: [String],
    default: []
  },
  interests: {
    type: [String],
    default: []
  },
  aboutMe: { type: String },
  image: { type: String },
  type: { type: String, default: 'user' },

  partnerPreferences: {
    ageRange: {
      type: [Number],
      default: []
    },
    heightRange: {
      type: [Number],
      default: []
    },
    maritalStatus: {
      type: [String],
      default: []
    },
    religion: {
      type: String,
      default: 'Any'
    },
    caste: {
      type: String,
      default: 'No caste'
    },
    education: {
      type: String,
      default: 'Any'
    },
    city: {
      type: String
    },
    profession: {
      type: String,
      default: 'Any'
    },
    location: {
      type: String
    },
    job: {
      type: String
    },
    complexion: {
      type: String,
      enum: ['Fair', 'Wheatish', 'Dark', 'Any'],
      default: 'Any'
    }
  }
}, { timestamps: true }); // ✅ auto-manages createdAt/updatedAt

module.exports = mongoose.model('User', userSchema);
