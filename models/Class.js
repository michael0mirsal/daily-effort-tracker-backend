import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },                        // Class Name
  passKey: { type: String, required: true },                     // Class Pass Key
  nursery: { type: mongoose.Schema.Types.ObjectId, ref: "Nursery" },
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "SchoolMember" }]
}, { timestamps: true });

export default mongoose.model("Class", classSchema);
