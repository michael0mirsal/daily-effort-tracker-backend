// routes/msgRoutes.js
import express from "express";
import mongoose from "mongoose"; 
import Msg from "../models/GeneralMSG.js";
import ClassModel from "../models/Class.js";
import SchoolMember from "../models/sch-Member.js";

const router = express.Router();

// POST /api/msg/send
router.post("/send", async (req, res) => {
  try {
    const {
      senderId,
      senderModel,
      title,
      message,
      classId,
      nurseryId,
      targetSchoolMember,
      targetFamilies,
      priority = "normal",
      attachments = []
    } = req.body;

    // Basic validation
    if (!senderId || !senderModel || !title || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const msg = new Msg({
      sender: senderId,
      senderModel,
      title,
      message,
      classId,
      nurseryId,
      targetSchoolMember,
      targetFamilies,
      priority,
      attachments,
      receivers: []
    });

    // Resolve receivers
    // Resolve receivers
if (targetSchoolMember) {
  // direct individual
  msg.receivers.push({ receiver: targetSchoolMember });
} else if (Array.isArray(targetFamilies) && targetFamilies.length) {
  // family-based: get all children of selected families
  const kids = await SchoolMember
    .find({ family: { $in: targetFamilies } })
    .select("_id");
  kids.forEach(k => msg.receivers.push({ receiver: k._id }));
} else if (classId) {
  if (senderModel === "FamilyMember") {
    // find the child of this family in the class
    const child = await SchoolMember.findOne({ family: senderId, class: classId }).select("_id");
    if (child) msg.receivers.push({ receiver: child._id });
  } else {
    // Teacher/Manager: class-wide
    const cls = await ClassModel.findById(classId).select("members");
    if (!cls) return res.status(404).json({ error: "Class not found" });
    cls.members.forEach(memberId => msg.receivers.push({ receiver: memberId }));
  }
} else if (nurseryId) {
  const members = await SchoolMember.find({ nursery: nurseryId }).select("_id");
  members.forEach(m => msg.receivers.push({ receiver: m._id }));
} else {
  return res.status(400).json({ error: "No valid target specified" });
}


    await msg.save();

    res.json({
      success: true,
      messageId: msg._id,
      receiversCount: msg.receivers.length
    });

  } catch (err) {
    console.error("[MSG] Send failed:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// GET /api/msg/list?classId=...&date=...&type=inbox|sent&userId=...
// GET /api/msg/list?classId=...&date=...&type=inbox|sent&userId=...
router.get("/list", async (req, res) => {
  try {
    const { classId, date, type, userId } = req.query;

    if (!classId) return res.status(400).json({ error: "classId is required" });
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const user = await SchoolMember.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    let filter = { sentAt: { $gte: start, $lte: end } };

    // Include messages for the class
    if (classId) filter.classId = classId;

    if (type === "inbox") {
      if (user.role === "nursery") {
        const nurseryMemberIds = await SchoolMember.find({ nursery: user.nursery }).distinct("_id");
        filter.$or = [
          { "receivers.receiver": { $in: nurseryMemberIds } }
        ];
        if (user.class) filter.$or.push({ classId: user.class });
      } else if (user.role === "family") {
        const childrenIds = await SchoolMember.find({ family: user.member }).distinct("_id");
        filter.$or = [{ "receivers.receiver": { $in: childrenIds } }];
      } else {
        filter.$or = [
          { "receivers.receiver": user._id },
          ...(user.class ? [{ classId: user.class }] : [])
        ];
      }
    } else if (type === "sent") {
      // Sent messages: messages where user is sender
      filter.$or = [{ sender: user._id }];
    }

    const messages = await Msg.find(filter)
      .populate("sender", "name") // populate sender name
      .populate("receivers.receiver", "name") // populate receiver name only
      .lean()
      .sort({ sentAt: -1 }); // newest first

    // Always return an array
    res.json(Array.isArray(messages) ? messages : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});




export default router;
