import jwt from "jsonwebtoken";
import ErrorHandler from "../middlewares/error.js";

export const authMiddleware = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return next(new ErrorHandler("Аутентификация не удалась!", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return next(new ErrorHandler("Аутентификация не удалась!", 401));
  }
};

export default authMiddleware;
