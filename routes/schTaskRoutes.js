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

    if (!date || !data || !classId)
      return res.status(400).json({ error: "Missing date, classId, or data" });

    let results = [];

    for (const entry of data) {
      const { kidId, items } = entry;

      let routine = await SchRoutine.findOne({
        kidmember: kidId,
        date,
        classId
      });

      if (routine) {
        routine.items = items;
        await routine.save();
      } else {
        routine = await SchRoutine.create({
          classId,
          kidmember: kidId,
          date,
          items
        });
      }

      results.push(routine);
    }

    res.json({ success: true, saved: results.length, results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save routine" });
  }
});



router.get("/sch-routine/load", async (req, res) => {
  const { classId, date } = req.query;
  if (!classId || !date) return res.status(400).json({ error: "Missing classId or date" });

  try {
    // 1. Load members + populate names
    const schoolMembers = await SchoolMember.find({ class: classId })
      .populate("member", "name"); // 🔥 include kid name

    const kidIds = schoolMembers.map(m => String(m.member._id));
    const kidMap = {};
    schoolMembers.forEach(m => {
      kidMap[String(m.member._id)] = m.member.name;
    });

    // 2. Filter routines
    const filter = { kidmember: { $in: kidIds } };
    if (date !== "all") filter.date = date;

    const routines = await SchRoutine.find(filter).lean();

    // 3. Normalize routines
    const normalized = routines.map(r => ({
      _id: r._id,
      classId: r.classId,
      kidmember: String(r.kidmember),
      kidName: kidMap[String(r.kidmember)] || "Unknown",
      date: r.date,
      items: r.items || []
    }));

    res.json(normalized);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching routines" });
  }
});



// POST /api/sch-activities
router.post("/sch-activities", async (req, res) => {
  try {
    const { classId, kidId, date, items } = req.body; // use same key as sch-routine

    if (!classId || !kidId || !date || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: "Missing or invalid data" });
    }

    // Validate kidId
    if (!mongoose.Types.ObjectId.isValid(kidId)) {
      return res.status(400).json({ success: false, error: "Invalid kidmember ID" });
    }

    // Find the SchoolMember document
    const memberDoc = await Member.findById(kidId);
    if (!memberDoc) {
      return res.status(404).json({ success: false, error: "Kid member not found" });
    }

    // Check if an activity already exists for this class, member, and date
    let existing = await schActivity.findOne({ classId, kidmember: kidId, date });

    if (existing) {
      // Avoid duplicating items
      const existingKeys = existing.items
        .filter(i => i.activity && i.timeMin !== undefined)
        .map(i => `${i.activity.toLowerCase()}_${i.timeMin}`);

      items.forEach(i => {
        if (!i.activity || i.timeMin === undefined) return;
        const key = `${i.activity.toLowerCase()}_${i.timeMin}`;
        if (!existingKeys.includes(key)) existing.items.push(i);
      });

      await existing.save();
      return res.json({
        success: true,
        message: "Activity updated successfully!",
        data: await existing.populate("kidmember", "name") // populate for frontend
      });
    }

    // Create new document
    const doc = await schActivity.create({
      classId,
      kidmember: memberDoc._id, // always store valid ObjectId
      date,
      items
    });

    await doc.populate("kidmember", "name");

    res.status(201).json({
      success: true,
      message: "Activity saved successfully!",
      data: doc
    });

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
    // Validate and convert to ObjectId
    let classObjId = classId;
    if (mongoose.isValidObjectId(classId)) {
      classObjId = new mongoose.Types.ObjectId(classId);
    }

    const activities = await schActivity.find({ classId: classObjId, date })
      .populate("kidmember", "name");

    res.json(activities);
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




export default router;
