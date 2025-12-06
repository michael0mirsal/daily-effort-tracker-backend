import mongoose from "mongoose";

const schoolMemberSchema = new mongoose.Schema({
  // 🔹 Reference to FamilyMember (one source of truth for personal info)
  familyMember: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },

  // 🔹 Nursery/Class info
  nursery: { type: mongoose.Schema.Types.ObjectId, ref: "Nursery", required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },

  // 🔹 Role / Status / Notes
  role: { type: String, default: "kid" },
  status: { type: String, default: "active" },
  notes: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("SchoolMember", schoolMemberSchema);
