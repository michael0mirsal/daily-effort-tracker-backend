import mongoose from "mongoose";

export function requireFamily(req, res, next) {
  const familyId = req.headers["x-family-id"];

  if (!familyId || !mongoose.isValidObjectId(familyId)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.familyId = familyId;
  next();
}
//safety id link family to sch