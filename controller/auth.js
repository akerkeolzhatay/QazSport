import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.js";
import { generateOtp } from "../middlewares/generateOtp.js";
import sendEmail from "../middlewares/email.js";
import ErrorHandler from "../middlewares/error.js";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res, message) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
  };

  res.cookie("token", token, cookieOptions);

  user.password = undefined;
  user.otp = undefined;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: { user },
  });
};

export const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorHandler("Заполните все поля!", 400));
  }

  const passwordRegex = /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[\W_]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return next(new ErrorHandler("Пароль должен содержать не менее 8 символов, как минимум одну букву, цифру и специальный символ!", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler("Электронная почта уже используется!", 400));
  }

  const otp = generateOtp();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    otp,
    otpExpires,
  });

  try {
    await sendEmail({
      email: newUser.email,
      subject: "Email Confirmation",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h1>Email Confirmation</h1>
          <p>Your OTP code:</p>
          <h2>${otp}</h2>
          <p>This code is valid for 10 minutes.</p>
        </div>
      `,
    });

    res.redirect(`/verify-otp?email=${email}`);
  } catch (error) {
    await User.findByIdAndDelete(newUser._id);
    return next(new ErrorHandler("Ошибка отправки письма. Попробуйте еще раз.", 500));
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorHandler("Неправильные учетные данные", 401));
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return next(new ErrorHandler("Неправильные учетные данные", 401));
    }

    req.session.user = { _id: user._id, name: user.name };
    console.log("Пользователь вошел в систему:", req.session.user);

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Ошибка входа:", error);
    next(new ErrorHandler("Ошибка сервера", 500));
  }
};

export const updateUser = async (req, res, next) => {
  const { name, password } = req.body;

  if (!name && !password) {
    return next(new ErrorHandler("Данные для обновления не предоставлены!", 400));
  }

  const updates = {};
  if (name) updates.name = name;
  if (password) updates.password = await bcrypt.hash(password, 10);

  const updatedUser = await User.findByIdAndUpdate(req.userId, updates, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return next(new ErrorHandler("Пользователь не найден!", 404));
  }

  updatedUser.password = undefined;

  res.status(200).json({
    success: true,
    message: "Пользователь успешно обновлен.",
    data: { user: updatedUser },
  });
};

export const deleteUser = async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.userId);

  if (!user) {
    return next(new ErrorHandler("Пользователь не найден!", 404));
  }

  res.status(200).json({
    success: true,
    message: "Пользователь успешно удален.",
  });
};

export const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.query;

  if (!email || !otp) {
    return next(new ErrorHandler("Email и OTP обязательны!", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ErrorHandler("Пользователь не найден!", 404));
  }

  if (user.otp !== otp || user.otpExpires < Date.now()) {
    return next(new ErrorHandler("Неверный или просроченный OTP!", 400));
  }

  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.redirect("/profile");
};

export const resendOtp = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler("Email обязателен для повторной отправки OTP", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorHandler("Пользователь не найден!", 404));
  }

  const newOtp = generateOtp();
  user.otp = newOtp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: user.email,
      subject: "Resend OTP for Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h1>Resend OTP</h1>
          <p>Your new OTP code is:</p>
          <h2>${newOtp}</h2>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Новый OTP отправлен на вашу почту.",
    });
  } catch (error) {
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler("Не удалось отправить OTP. Попробуйте снова.", 500));
  }
};

export const logoutUser = (req, res, next) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Ошибка при выходе:', err);
      return next(new ErrorHandler("Ошибка выхода", 500));
    }
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
    });
    res.clearCookie('token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
    });
    res.redirect('/sign');
  });
};

