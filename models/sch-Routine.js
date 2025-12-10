import mongoose from "mongoose";

const routineSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolMember", required: true },

  date: { type: String, required: true }, // "2025-01-03"

  items: [
    {
      section: { type: String, required: true },
      task: { type: String, required: true },
      done: { type: Boolean, default: false }
    }
  ]
});

export default mongoose.model("Sch-Routine", routineSchema);
