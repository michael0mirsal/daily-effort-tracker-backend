import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema({
  id: Number,
  name: String,
  role: String
});

const FamilySchema = new mongoose.Schema({
  id: Number,
  name: { type: String, required: true, unique: true },
  dad: String,
  mom: String,
  passhash: String,
  members: [MemberSchema]  // embedded array like original JSON
});

export default mongoose.model("Family", FamilySchema);
