// models/Family.js
import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    role: { type: String, default: "kid" }
  },
  { _id: false } // <--- This disables MongoDB auto _id for members
);

const familySchema = new mongoose.Schema({
  id: { type: Number, required: true }, // numeric ID like original
  name: { type: String, required: true, unique: true },
  dad: { type: String, required: true },
  mom: { type: String, required: true },
  passhash: { type: String, required: true },
  members: { type: [memberSchema], default: [] }
});

export default mongoose.model("Family", familySchema);
