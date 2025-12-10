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
    const { kidmember, date } = req.query;

    // Validate required fields
    if (!kidmember) {
      return res.status(400).json({ error: "Missing required parameter: kidmember" });
    }

    // Build query
    const query = { kidmember };

    // If date is NOT "all", add date filter
    if (date && date !== "all") {
      query.date = date;
    }

    // Search routines
    const routines = await Routine.find(query);

    if (!routines.length) {
      return res.status(404).json({ error: "No routines found for this member/date" });
    }

    res.json(routines);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error searching routines" });
  }
});





export default router;
