// src/models/PushSubscription.js
import mongoose from "mongoose";

const PushSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
}, { timestamps: true });

export default mongoose.models.PushSubscription || mongoose.model("PushSubscription", PushSubscriptionSchema);

