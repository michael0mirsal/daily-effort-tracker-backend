import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
schoolMember: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolMember", required: true },

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
/* 🔐 INDEXES — HERE IS THE ANSWER */
activitySchema.index(
  { schoolMember: 1, date: 1 },
  { unique: true }              // prevent duplicate day records per kid
);

activitySchema.index(
  { classId: 1, date: 1 }       // fast load by class + date
);

export default mongoose.model("sch-Activity", activitySchema);
