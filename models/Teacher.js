import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },                       // Full Name
  role: { type: String, required: true },                       // Role: Teacher, Supervisor, etc.
  email: { type: String, required: true },                      // Email
  phone: { type: String },                                       // Phone
  nursery: { type: mongoose.Schema.Types.ObjectId, ref: "Nursery" },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }]
}, { timestamps: true });

export default mongoose.model("Teacher", teacherSchema);
