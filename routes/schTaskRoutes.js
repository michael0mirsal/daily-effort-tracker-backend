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

router.get("/search", async (req, res) => {
  try {
    const { schmember, date } = req.query;

    if (!schmember) {
      return res.status(400).json({ msg: "schmember is required" });
    }

    let routines;

    if (date === "all") {
      // return all routines for this member
      routines = await Routine.find({ schmember }).sort({ date: -1 });
    } else if (date) {
      // return specific routine for the given date
      routines = await Routine.findOne({ schmember, date });
    } else {
      return res.status(400).json({ msg: "date is required" });
    }

    res.json(routines || []);
  } catch (err) {
    console.error("Search routine error:", err);
    res.status(500).json({ msg: "Server error searching routines" });
  }
});





export default router;
