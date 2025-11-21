import mongoose from "mongoose";

const familySchema = new mongoose.Schema({
  name: { type: String, required: true },
  dad: String,
  mom: String,
  passhash: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
});

export default mongoose.model("Family", familySchema);
