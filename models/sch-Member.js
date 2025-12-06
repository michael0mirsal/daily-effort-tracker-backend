import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  // 🔹 Basic Info
  fullName: { type: String, required: true },
  gender: { type: String, enum: ["male", "female"], default: "male" },
  age: { type: Number, required: true },
  dateOfBirth: { type: String, default: "" },

  // 🔹 Dad Info
  dadName: { type: String, default: "" },
  dadPhone: { type: String, default: "" },
  dadEmail: { type: String, default: "" },

  // 🔹 Mom Info
  momName: { type: String, default: "" },
  momPhone: { type: String, default: "" },
  momEmail: { type: String, default: "" },

  // 🔹 Emergency Contact
  emergencyContactName: { type: String, default: "" },
  emergencyContactPhone: { type: String, default: "" },
  emergencyRelation: { type: String, default: "" },

  // 🔹 Avatar / Profile
  avatar: { type: String, default: "" },
  allergies: { type: String, default: "" },
  medications: { type: String, default: "" },
  medicalNotes: { type: String, default: "" },
  notes: { type: String, default: "" },
  status: { type: String, default: "active" },

  // 🔹 Links
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  nursery: { type: mongoose.Schema.Types.ObjectId, ref: "Nursery", required: true },
  family: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true },

  role: { type: String, default: "kid" }

}, { timestamps: true });

export default mongoose.model("Member", memberSchema);
