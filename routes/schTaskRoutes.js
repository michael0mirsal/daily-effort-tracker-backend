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


router.post("/save", async (req, res) => {
  try {
    const { date, data } = req.body;

    if (!date || !data)
      return res.status(400).json({ error: "Missing date or data." });

    /*
      data = [
        {
          kidId: "...",
          items: [
            { section: "morning", task: "Wake up early", done: true },
            ...
          ]
        },
        ...
      ]
    */

    let results = [];

    for (const entry of data) {
      const { kidId, items } = entry;

      // Check existing routine for same date + kid
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

    res.json({ success: true, count: results.length, results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save routines." });
  }
});



export default router;
