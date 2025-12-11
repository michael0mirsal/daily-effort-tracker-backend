import express from "express";
import Nursery from "../models/Nursery.js";
import ClassModel from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import SchoolMember from "../models/sch-Member.js";
import License from '../models/License.js';
import Family from "../models/Family.js";
import Member from "../models/Member.js"; 
import SchRoutine from "../models/sch-Routine.js"; 
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



router.get("/routines/class", async (req, res) => {
  const { classId, date } = req.query;
  if (!classId || !date) return res.status(400).json({ error: "Missing classId or date" });

  try {
    // 1. Get all members in the class
    const members = await SchoolMember.find({ class: classId });

    // 2. Get kid IDs (from member field)
    const kidIds = members.map(m => m.member);

    let filter = { kidmember: { $in: kidIds } };

    if (date !== "all") {
      filter.date = date;
    }

    // 3. Fetch routines
    const routines = await SchRoutine.find(filter);
    res.json(routines);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching routines" });
  }
});







export default router;
