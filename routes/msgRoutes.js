// routes/msgRoutes.js
import express from "express";
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
      targetFamily,
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
      targetFamily,
      priority,
      attachments,
      receivers: []
    });

    // Resolve receivers
    if (targetSchoolMember) {
      msg.receivers.push({ receiver: targetSchoolMember });
    } else if (Array.isArray(targetFamily) && targetFamily.length) {
      const kids = await SchoolMember.find({ family: { $in: targetFamily } }).select("_id");
      kids.forEach(k => msg.receivers.push({ receiver: k._id }));
    } else if (classId) {
      const cls = await ClassModel.findById(classId).select("members");
      if (!cls) return res.status(404).json({ error: "Class not found" });
      cls.members.forEach(memberId => msg.receivers.push({ receiver: memberId }));
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

router.get("/list", async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId) return res.status(400).json({ error: "classId is required" });

    // Date range
    const start = new Date(date || new Date());
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setHours(23,59,59,999);

    // Find messages for this class and date
    const messages = await Msg.find({
      classId,
      sentAt: { $gte: start, $lte: end }
    })
    .populate("sender") // populate sender for display
    .sort({ sentAt: 1 })
    .lean();

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


export default router;
