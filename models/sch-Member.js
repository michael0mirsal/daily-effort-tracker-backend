import mongoose from "mongoose";

const schoolMemberSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true }, // link to Family
  member: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true }, // basic personal info

  nursery: { type: mongoose.Schema.Types.ObjectId, ref: "Nursery", required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },

  // ✅ Extra info filled in manually
  dadPhone: { type: String },
  dadEmail: { type: String },
  momPhone: { type: String },
  momEmail: { type: String },
  emergencyContactName: { type: String },
  emergencyContactPhone: { type: String },
  emergencyContactRelation: { type: String },

  role: { type: String, default: "kid" },
  status: { type: String, default: "active" },
  notes: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("SchoolMember", schoolMemberSchema);
