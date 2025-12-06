import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  // 🔹 Basic Info
  fullName: { type: String, required: true },
  gender: { type: String, enum: ["male", "female"], default: "male" },
  age: { type: Number, required: true },
  dateOfBirth: { type: String, default: "" },

  // 🔹 Avatar (Photo URL)
  avatar: { type: String, default: "" },

  // 🔹 Address (Optional)
  address: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    area: { type: String, default: "" }
  },

  // 🔹 Parent 1
  parent1Name: { type: String, default: "" },
  parent1Phone: { type: String, default: "" },
  parent1Email: { type: String, default: "" },

  // 🔹 Parent 2
  parent2Name: { type: String, default: "" },
  parent2Phone: { type: String, default: "" },
  parent2Email: { type: String, default: "" },

  // 🔹 Emergency Contact
  emergencyContactName: { type: String, default: "" },
  emergencyContactPhone: { type: String, default: "" },
  emergencyRelation: { type: String, default: "" },

  // 🔹 Medical Info
  allergies: { type: String, default: "" },
  medications: { type: String, default: "" },
  medicalNotes: { type: String, default: "" },

  // 🔹 Links (Relations)
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true
  },

  nursery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nursery",
    required: true
  },

  family: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Family",
    required: true
  },

  // 🔹 System Role
  role: { type: String, default: "kid" },

  // 🔹 Status (Active / Left / Graduated)
  status: { type: String, default: "active" },

  // 🔹 Free Notes
  notes: { type: String, default: "" }

}, { timestamps: true });

export default mongoose.model("Member", memberSchema);
