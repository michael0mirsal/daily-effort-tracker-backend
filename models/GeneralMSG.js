import mongoose from "mongoose";

const MsgSchema = new mongoose.Schema({
  // Sender polymorphic
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: "senderModel", 
    required: true 
  },
  senderModel: { 
    type: String, 
    required: true, 
    enum: ["Supervisor", "Teacher", "Manager" , "FamilyMember"] 
  },

  // Optional direct targets
  targetSchoolMember: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolMember" },
  targetFamilies: [{ type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember" }],

  // Actual receivers (auto-populated)
  receivers: [{
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolMember" },
    read: { type: Boolean, default: false },
    readAt: { type: Date }
  }],

  // Message content
  title: { type: String, required: true },
  message: { type: String, required: true },

  // Attachments
  attachments: [{
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "pdf", "doc", "other"], default: "other" },
    name: { type: String }
  }],

  // Optional scopes
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },       // Class-wide message
  nurseryId: { type: mongoose.Schema.Types.ObjectId, ref: "Nursery" },   // Nursery-wide message

  // Priority
  priority: { type: String, enum: ["normal", "high", "urgent"], default: "normal" },

  // Sent timestamp
  sentAt: { type: Date, default: Date.now }

}, { 
  timestamps: true
});

// ===== Custom validation =====
// Ensure at least one target exists
MsgSchema.pre("validate", function(next) {
  if (
    !this.targetSchoolMember &&
    (!this.targetFamilies || this.targetFamilies.length === 0) &&
    !this.classId &&
    !this.nurseryId
  ) {
    return next(new Error("Message must have at least one target: targetSchoolMember, targetFamilies, classId, or nurseryId."));
  }
  next();
});

export default mongoose.model("Msg", MsgSchema);
