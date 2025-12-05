import mongoose from "mongoose";

const NurserySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },   // Nursery Name
  email: { type: String, required: true },                // Contact Email (matches front-end)
  phone: { type: String, required: true },                // Contact Phone (matches front-end)
  passKey: { type: String, required: true },              // Nursery Pass Key
  address: { type: String },                              // Optional
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }], // Classes in this nursery
  workers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }] // Teachers/Staff
}, { timestamps: true }); // adds createdAt and updatedAt

export default mongoose.model("Nursery", NurserySchema);
