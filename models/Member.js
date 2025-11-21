import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: "kid" }, // kid, teacher, etc.
  family: { type: mongoose.Schema.Types.ObjectId, ref: "Family" },
});

export default mongoose.model("Member", memberSchema);
