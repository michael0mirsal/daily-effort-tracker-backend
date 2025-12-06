import mongoose from "mongoose";

const routineSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" },
  date: { type: String, required: true },
  items: [
    {
      section: String,
      task: String,
      done: Boolean,
    },
  ],
  checkedData: Number,
});

export default mongoose.model("Routine", routineSchema);
