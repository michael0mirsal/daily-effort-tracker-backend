import mongoose from "mongoose";

const kidMoodSchema = new mongoose.Schema({

  // 📅 One mood per kid per day
  date: {
    type: String,               // e.g. "2026-01-30"
    required: true
  },

  // 🏫 Context (same pattern as Attendance)
  nursery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nursery",
    required: true
  },

  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true
  },

  // 👶 The kid (SchoolMember)
  schoolMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SchoolMember",
    required: true
  },

  // 😊 Feeling selection
  mood: {
    type: String,
    enum: [
      "very_happy",
      "happy",
      "okay",
      "sad",
      "very_sad"
    ],
    required: true
  },

  // 🧑 Who recorded it
  recordedBy: {
    type: String,
    enum: ["teacher", "parent", "system"],
    default: "teacher"
  },

  // 📝 Optional note (future-proof)
  note: {
    type: String,
    default: ""
  }

}, { timestamps: true });

/**
 * Prevent duplicate mood for same kid on same day
 */
kidMoodSchema.index(
  { date: 1, schoolMember: 1 },
  { unique: true }
);

export default mongoose.model("KidMood", kidMoodSchema);
