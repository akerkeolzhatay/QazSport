import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true},
  otp: { type: String }, 
  otpExpires: { type: Date },
  role: {
    type: String,
    default: 'user'
}
});

export const User = mongoose.model("User", userSchema);