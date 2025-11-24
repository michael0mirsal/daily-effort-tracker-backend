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
  // id: { type: Number, required: true }, <-- remove
  name: { type: String, required: true, unique: true },
  dad: { type: String, required: true },
  mom: { type: String, required: true },
  passhash: { type: String, required: true },
  members: { type: [memberSchema], default: [] }
});


export default mongoose.model("Family", familySchema);
