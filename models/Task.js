import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
  date: { type: String, required: true },
  items: [
    {
      activity: String,
      timeMin: Number,
      evaluation: Number,
      note: String
    },
  ],
  checkedData: Number,
});

export default mongoose.model("Task", taskSchema);
