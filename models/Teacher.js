import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String },
  nursery: { type: mongoose.Schema.Types.ObjectId, ref: "Nursery" },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }]
});

export default mongoose.model("Teacher", teacherSchema);
