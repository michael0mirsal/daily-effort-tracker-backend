import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
  date: { type: String, required: true },
  items: [
    {
      section: String,
      task: String,
      done: Boolean,
      evaluation: Number,
      note: String,
    },
  ],
  checkedData: Number,
});

export default mongoose.model("Task", taskSchema);
