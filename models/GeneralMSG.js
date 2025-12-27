import mongoose from "mongoose";

const MsgSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'senderModel', 
    required: true 
  },
  senderModel: { 
    type: String, 
    required: true, 
    enum: ['FamilyMember', 'SchoolMember', 'Teacher', 'StaffMember'] 
  },

  // Optional automatic targets
  targetSchoolMember: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolMember' },
  targetFamily: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family' }],

  // Receivers array (auto-populated if targetSchoolMember/targetFamily/classId/nurseryId is set)
  receivers: [{
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolMember' },
    read: { type: Boolean, default: false },
    readAt: { type: Date }
  }],

  title: { type: String, required: true },
  message: { type: String, required: true },

  // Optional attachments
  attachments: [{
    url: { type: String },
    type: { type: String, enum: ['image', 'pdf', 'doc', 'other'], default: 'other' },
    name: { type: String }
  }],

  // Class-wide message
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },

  // Nursery-wide message
  nurseryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nursery' },

  // Priority for urgent messages
  priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },

  // Timestamps
  sentAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }

}, { timestamps: true });

export default mongoose.model("Msg", MsgSchema);
