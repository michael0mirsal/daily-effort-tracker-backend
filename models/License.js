import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  used: { type: Boolean, default: false },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Nursery', default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('License', licenseSchema);
