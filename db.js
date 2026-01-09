import mongoose from "mongoose";
import dotenv from "dotenv";
/*
// Load correct .env file based on environment
dotenv.config({
  path: process.env.RAILWAY_ENVIRONMENT_NAME === "staging"
    ? ".env.staging"
    : process.env.RAILWAY_ENVIRONMENT_NAME === "production"
      ? ".env.production"
      : ".env.local" // default for local development
});

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
    await mongoose.connect(MONGO_URI); // no deprecated options needed
    console.log(`✅ Connected to MongoDB (${process.env.RAILWAY_ENVIRONMENT_NAME || "local"})`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};
*/
// ✅ FIX: Load .env only once, based on NODE_ENV
dotenv.config({
  path: process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "staging"
      ? ".env.staging"
      : ".env.local"
});

// ✅ FIX: Single MONGO_URI selection using NODE_ENV
const MONGO_URI = process.env.NODE_ENV === "production"
  ? process.env.MONGO_URI_PRODUCTION
  : process.env.NODE_ENV === "staging"
    ? process.env.MONGO_URI_STAGING
    : process.env.MONGO_URI;

export const connectDB = async () => {
  if (!MONGO_URI) {
    console.error("❌ MongoDB URI not defined!");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB (${process.env.NODE_ENV || "development"})`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};