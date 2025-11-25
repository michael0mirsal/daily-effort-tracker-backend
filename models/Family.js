// models/Family.js
import mongoose from "mongoose";


const familySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  dad: { type: String, required: true },
  mom: { type: String, required: true },
  passhash: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }] // <-- ObjectId refs
});



export default mongoose.model("Family", familySchema);
