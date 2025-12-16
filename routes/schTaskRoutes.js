import express from "express";
import Nursery from "../models/Nursery.js";
import ClassModel from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import SchoolMember from "../models/sch-Member.js";
import License from '../models/License.js';
import Family from "../models/Family.js";
import Member from "../models/Member.js"; 
import SchRoutine from "../models/sch-Routine.js"; 
import schactivity from "../models/sch-activity.js"; 
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
    const { classId, kidmember, date, items } = req.body;

    if (!classId || !kidmember || !date || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing or invalid data" });
    }

    let existing = await SchActivity.findOne({ classId, kidmember, date });

    if (existing) {
      const existingKeys = existing.items
        .filter(i => i.activity && i.timeMin !== undefined)
        .map(i => `${i.activity.toLowerCase()}_${i.timeMin}`);

      items.forEach(i => {
        if (!i.activity || i.timeMin === undefined) return;

        const key = `${i.activity.toLowerCase()}_${i.timeMin}`;
        if (!existingKeys.includes(key)) {
          existing.items.push(i);
        }
      });

      await existing.save();
      return res.json(existing);
    }

    const doc = await SchActivity.create({
      classId,
      kidmember,
      date,
      items
    });

    res.status(201).json(doc);

  } catch (err) {
    console.error("❌ sch-activities error:", err.message);
    res.status(500).json({ error: err.message });
  }
});







export default router;
