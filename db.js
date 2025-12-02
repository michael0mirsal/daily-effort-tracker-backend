import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI =
  process.env.RAILWAY_ENVIRONMENT_NAME === "staging"
    ? process.env.MONGO_URI_STAGING
    : process.env.MONGO_URI_PRODUCTION || process.env.MONGO_URI;

export const connectDB = async () => {
  if (!MONGO_URI) {
    console.error("❌ MongoDB URI is not defined!");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI); // ✅ No deprecated options needed
    console.log(`✅ Connected to MongoDB (${process.env.RAILWAY_ENVIRONMENT_NAME || "local"})`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};
