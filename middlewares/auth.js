// middlewares/requireFamily.js
import jwt from "jsonwebtoken";

export const Familyauth = (req, res, next) => {
  const token = req.cookies?.jwt; // read HttpOnly cookie

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach decoded token to request
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
