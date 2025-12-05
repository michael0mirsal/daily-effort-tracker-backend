import mongoose from "mongoose";

const NurserySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  address: { type: String },     // <--- ADD THIS
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }]
});

export default mongoose.model("Nursery", NurserySchema);
