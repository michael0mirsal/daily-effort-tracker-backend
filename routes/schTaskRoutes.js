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


router.post("/routines/add", async (req, res) => {
  try {
    const { memberId, section, task, date } = req.body;

    let routine = await SchRoutine.findOne({ member: memberId, date });

    if (!routine) {
      routine = new SchRoutine({
        member: memberId,
        date,
        items: []
      });
    }

    routine.items.push({
      section,
      task,
      done: false
    });

    await routine.save();

    res.json({ message: "Routine saved!", routine });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});



export default router;
