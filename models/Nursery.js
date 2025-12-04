import mongoose from "mongoose";

const nurserySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }]
});

export default mongoose.model("Nursery", nurserySchema);
