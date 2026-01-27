// models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: "Attendance" },

    type: {
      type: String,
      enum: ["STATUS_CHANGED", "NOTE_CHANGED"],
    },

    message: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
