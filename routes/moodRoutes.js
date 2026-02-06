import express from "express";
import {
  saveKidMood,
  getMoodsByClassAndDate,
  getMoodByKidAndDate
} from "../controllers/moodController.js";

const router = express.Router();

/**
 * 🧒 Save or update kid mood (one per day)
 * POST /api/mood
 */
router.post("/", saveKidMood);

/**
 * 📅 Get moods by class & date
 * GET /api/mood?classId=xxx&date=yyyy-mm-dd
 */
router.get("/", getMoodsByClassAndDate);
router.get("/kid", getMoodByKidAndDate); // ✅ new route
export default router;
