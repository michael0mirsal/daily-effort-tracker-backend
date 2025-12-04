import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: "kid" },
  age: { type: Number, default: null },        // optional
  family: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true },
  avatar: { type: String, default: '' }, // <-- new field
}, { timestamps: true });

export default mongoose.model("Member", memberSchema);
