import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
SchoolMember: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolMember", required: true },

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

export default mongoose.model("sch-Activity", activitySchema);
