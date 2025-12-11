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
    const { date, data } = req.body;

    if (!date || !data)
      return res.status(400).json({ error: "Missing date or data" });

    let results = [];

    for (const entry of data) {
      const { kidId, items } = entry;

      let routine = await SchRoutine.findOne({ kidmember: kidId, date });

      if (routine) {
        routine.items = items;
        await routine.save();
      } else {
        routine = await SchRoutine.create({
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
    const members = await SchoolMember.find({ class: classId });
    const memberIds = members.map(m => m._id);

    let filter = { member: { $in: memberIds } };

if (date !== "all") {
  filter.date = date;
}

const routines = await SchRoutine.find(filter);


    res.json(routines);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching routines" });
  }
});






export default router;
