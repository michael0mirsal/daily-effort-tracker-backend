// models/Family.js
import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    // id: { type: Number, required: true },  <-- remove
    name: { type: String, required: true },
    role: { type: String, default: "kid" }
  },
  { _id: false }
);


const familySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  dad: { type: String, required: true },
  mom: { type: String, required: true },
  passhash: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }] // <-- ObjectId refs
});



export default mongoose.model("Family", familySchema);
