import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nursery: { type: mongoose.Schema.Types.ObjectId, ref: "Nursery" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  kids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }]
});

export default mongoose.model("Class", classSchema);
