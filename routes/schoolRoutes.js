import express from "express";
import Nursery from "../models/Nursery.js";
import Class from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import Member from "../models/Member.js";

const router = express.Router();

// 🔹 Add a Nursery
router.post("/nursery", async (req, res) => {
  try {
    const nursery = new Nursery(req.body);
    await nursery.save();
    res.status(201).json(nursery);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 Add a Class to a Nursery
router.post("/class", async (req, res) => {
  try {
    const newClass = new Class(req.body);
    await newClass.save();

    // Push class into nursery.classes
    const nursery = await Nursery.findById(req.body.nursery);
    nursery.classes.push(newClass._id);
    await nursery.save();

    res.status(201).json(newClass);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 Add a Teacher
router.post("/teacher", async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 Assign a Kid to a Class
router.post("/class/:classId/kids", async (req, res) => {
  try {
    const classObj = await Class.findById(req.params.classId);
    const kidId = req.body.kidId;

    if (!classObj.kids.includes(kidId)) classObj.kids.push(kidId);
    await classObj.save();

    res.json(classObj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
