import mongoose from "mongoose";

const NurserySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Nursery Name
  address: { type: String },                              // Optional
  contactEmail: { type: String, required: true },         // Contact Email
  contactPhone: { type: String, required: true },         // Contact Phone
  passKey: { type: String, required: true },             // Nursery Pass Key
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }]
}, { timestamps: true }); // adds createdAt and updatedAt

export default mongoose.model("Nursery", NurserySchema);
