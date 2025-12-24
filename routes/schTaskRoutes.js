import mongoose from "mongoose";
import express from "express";
import Nursery from "../models/Nursery.js";
import ClassModel from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import SchoolMember from "../models/sch-Member.js";
import License from '../models/License.js';
import Family from "../models/Family.js";
import Member from "../models/Member.js"; 
import SchRoutine from "../models/sch-Routine.js"; 
import schActivity from "../models/sch-activity.js"; 
import crypto from "crypto";


const router = express.Router();




router.post("/sch-routine/save", async (req, res) => {
  try {
    const { date, classId, data } = req.body;

    if (!date || !data || !classId) {
      return res.status(400).json({ error: "Missing date, classId, or data" });
    }

    // Convert classId to ObjectId
    const classObjectId = new mongoose.Types.ObjectId(classId);

    let results = [];

    for (const entry of data) {
  const { schoolMemberId, items } = entry;

  if (!schoolMemberId) continue;
  if (!mongoose.Types.ObjectId.isValid(schoolMemberId)) continue;

  const schoolMemberObjectId = new mongoose.Types.ObjectId(schoolMemberId);

  let routine = await SchRoutine.findOne({
    schoolMember: schoolMemberObjectId,
    date,
    classId: classObjectId
  });

  if (routine) {
    routine.items = items;
    await routine.save();
  } else {
    routine = await SchRoutine.create({
      classId: classObjectId,
      schoolMember: schoolMemberObjectId,
      date,
      items
    });
  }

  results.push(routine);
}


    res.json({ success: true, saved: results.length, results });

  } catch (err) {
    console.error("Error saving routines:", err);
    res.status(500).json({ error: "Failed to save routine" });
  }
});





// GET /api/sch-routine/load
router.get("/sch-routine/load", async (req, res) => {
  const { classId, date } = req.query;

  // 1️⃣ Validate input
  if (!classId || !date) {
    return res.status(400).json({
      success: false,
      error: "Missing classId or date"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid classId"
    });
  }

  try {
    // 2️⃣ Build filter
    const filter = { classId };

    if (date !== "all") {
      filter.date = date;
    }

    // 3️⃣ Load routines with deep populate
    const routines = await SchRoutine.find(filter)
      .populate({
        path: "schoolMember",
        populate: {
          path: "member",
          select: "name"
        }
      })
      .lean();

    // 4️⃣ Normalize response
    const normalized = routines.map(r => ({
      _id: r._id,
      classId: r.classId,
      schoolMemberId: r.schoolMember?._id || null,
      kidName: r.schoolMember?.member?.name || null,
      date: r.date,
      items: r.items || []
    }));

    res.json(normalized);

  } catch (err) {
    console.error("Load routines error:", err);
    res.status(500).json({
      success: false,
      error: "Server error fetching routines"
    });
  }
});





// POST /api/sch-activities
router.post("/sch-activities", async (req, res) => {
  try {
    const { classId, schoolMemberId, date, items } = req.body;

    if (!classId || !schoolMemberId || !date || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: "Missing or invalid data" });
    }

    if (!mongoose.Types.ObjectId.isValid(schoolMemberId)) {
      return res.status(400).json({ success: false, error: "Invalid schoolMember ID" });
    }

    const schoolMember = await SchoolMember.findById(schoolMemberId);
    if (!schoolMember) {
      return res.status(404).json({ success: false, error: "School member not found" });
    }

    let existing = await schActivity.findOne({
      classId,
      schoolMember: schoolMemberId,
      date
    });

    if (existing) {
      const existingKeys = existing.items
        .filter(i => i.activity && i.timeMin !== undefined)
        .map(i => `${i.activity.toLowerCase()}_${i.timeMin}`);

      items.forEach(i => {
        if (!i.activity || i.timeMin === undefined) return;
        const key = `${i.activity.toLowerCase()}_${i.timeMin}`;
        if (!existingKeys.includes(key)) existing.items.push(i);
      });

      await existing.save();
      await existing.populate({
        path: "schoolMember",
        populate: { path: "member", select: "name" }
      });

      return res.json({ success: true, message: "Activity updated successfully!", data: existing });
    }

    const doc = await schActivity.create({
      classId,
      schoolMember: schoolMemberId,
      date,
      items
    });

    await doc.populate({
      path: "schoolMember",
      populate: { path: "member", select: "name" }
    });

    res.status(201).json({ success: true, message: "Activity saved successfully!", data: doc });

  } catch (err) {
    console.error("❌ sch-activities error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



// GET /api/sch-activities?classId=...&date=YYYY-MM-DD
router.get("/sch-activities", async (req, res) => {
  const { classId, date } = req.query;

  if (!classId || !date) {
    return res.status(400).json({ success: false, error: "Missing classId or date" });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, error: "Invalid classId" });
    }

    const activities = await schActivity.find({ classId, date })
      .populate({
        path: "schoolMember",
        populate: { path: "member", select: "name" }
      });

    const normalized = activities.map(a => ({
      _id: a._id,
      classId: a.classId,
      schoolMemberId: a.schoolMember?._id || null,
      kidName: a.schoolMember?.member?.name || "Unknown",
      date: a.date,
      items: a.items || []
    }));

    res.json(normalized);

  } catch (err) {
    console.error("Load activities error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


// ----------------------
// PATCH /api/sch-activities/updateEvaluation
// ----------------------
router.patch("/sch-activities/updateEvaluation", async (req, res) => {
  const { member, date, index, evaluation } = req.body;

  if (!member || !date || index === undefined || evaluation === undefined) {
    return res.status(400).json({ success: false, error: "Missing parameters" });
  }

  try {
    // Validate member ObjectId
    let memberObjId = member;
    if (mongoose.isValidObjectId(member)) {
      memberObjId = new mongoose.Types.ObjectId(member);
    }

    const doc = await schActivity.findOne({ kidmember: memberObjId, date });

    if (!doc) return res.status(404).json({ success: false, error: "Activity not found" });
    if (!doc.items[index]) return res.status(404).json({ success: false, error: "Item not found" });

    doc.items[index].evaluation = evaluation;
    await doc.save();

    res.json({ success: true, message: "Evaluation updated" });
  } catch (err) {
    console.error("Update evaluation error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/sch-members?ids=id1,id2,id3
router.get("/sch-members", async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: "Missing ids" });

    const idArray = ids.split(",").filter(id => mongoose.isValidObjectId(id));

    const members = await SchoolMember.find({ _id: { $in: idArray } })
      .populate("member", "name")
      .lean();

    const result = members.map(m => ({
      _id: m._id,
      name: m.member?.name || "Unknown"
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ /sch-members error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/teachers?ids=...
router.get("/teachers", async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: "Missing ids" });

    const idArray = ids.split(",").filter(id => mongoose.Types.ObjectId.isValid(id));

    const teachers = await Teacher.find({ _id: { $in: idArray } }).lean();

    res.json(teachers); // each teacher has at least _id and name
  } catch (err) {
    console.error("❌ Failed to load teachers", err);
    res.status(500).json({ error: "Server error" });
  }
});



export default router;
