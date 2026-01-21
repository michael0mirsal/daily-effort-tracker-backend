import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true }, // "2026-01-21"

  nursery: { type: mongoose.Schema.Types.ObjectId, ref: "Nursery", required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },

  schoolMember: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "SchoolMember", 
    required: true 
  },

  // Attendance status
  status: {
    type: String,
    enum: ["present", "absent", "late", "excused", "left_early"],
    default: "absent"
  },

  // Time tracking
  checkInTime: { type: String },   // "08:10"
  leaveTime: { type: String },     // "12:30"

  // Who marked the attendance
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },

  notes: { type: String, default: "" }

}, { timestamps: true });

export default mongoose.model("Attendance", attendanceSchema);
