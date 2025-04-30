import express from "express";
import { registerUser, loginUser, updateUser, deleteUser, verifyOtp, resendOtp } from "../controller/auth.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.put("/update", authMiddleware, updateUser); 
router.delete("/delete", authMiddleware, deleteUser);
router.get("/verify-otp", (req, res) => {
  const { email } = req.query; 
  if (!email) {
      return res.status(400).send("Email is required to verify OTP.");
  }
  res.render("otpVerification", { email });
});

router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp); 
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  req.session = null;
  res.redirect('/login');
});



export default router;
