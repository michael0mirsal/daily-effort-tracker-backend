import mongoose from "mongoose";

const WebPushSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
}, { timestamps: true });

// ✅ Reuse existing model if it exists
export default mongoose.models.WebPushSubscription || 
       mongoose.model("WebPushSubscription", WebPushSubscriptionSchema);
       
