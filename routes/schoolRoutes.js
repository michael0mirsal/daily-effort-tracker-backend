import express from "express";
import Nursery from "../models/Nursery.js";
import ClassModel from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import Member from "../models/Member.js"; // for linking kids

const router = express.Router();

//////////////////////////
// 🏫 Nursery Routes
//////////////////////////

// GET all nurseries
router.get("/nurseries", async (req, res) => {
  try {
    const nurseries = await Nursery.find();
    res.json(nurseries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new nursery
// POST create a new nursery
// POST create a new nursery
router.post("/nurseries", async (req, res) => {
  try {
    const { name, address, email, phone, passKey } = req.body;

    if (!name || !email || !phone || !passKey) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    const nursery = await Nursery.create({ name, address, email, phone, passKey });
    res.status(201).json(nursery);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



//////////////////////////
// 🏫 Class Routes
//////////////////////////

// GET all classes
router.get("/classes", async (req, res) => {
  try {
    const classes = await ClassModel.find().populate("nursery").populate("teacher").populate("kids");
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new class
// POST create a new class
router.post("/classes", async (req, res) => {
  try {
    const { name, passKey, nurseryId, teacherIds, memberIds } = req.body;

    const classDoc = await ClassModel.create({
      name,
      passKey,
      nursery: nurseryId,
      teachers: teacherIds || [],   // array of Teacher ObjectIds
      members: memberIds || []      // array of Member ObjectIds
    });

    // Link class → nursery
    if (nurseryId) {
      await Nursery.findByIdAndUpdate(nurseryId, {
        $addToSet: { classes: classDoc._id }
      });
    }

    // Link class → teachers
    if (teacherIds && teacherIds.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: teacherIds } },
        { $addToSet: { classes: classDoc._id } }
      );
    }

    res.status(201).json(classDoc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//////////////////////////
// 👩‍🏫 Teacher Routes
//////////////////////////

// GET all teachers
router.get("/teachers", async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new teacher
// POST create a new teacher
// POST create a new teacher (AUTO-LINK)
// POST create a new teacher
router.post("/teachers", async (req, res) => {
  try {
    const { name, role, email, phone, nurseryId, classIds } = req.body;

    const teacher = await Teacher.create({
      name,
      role,
      email,
      phone,
      nursery: nurseryId,
      classes: classIds || []
    });

    // Link teacher → classes
    if (classIds && classIds.length > 0) {
      await ClassModel.updateMany(
        { _id: { $in: classIds } },
        { $addToSet: { teachers: teacher._id } }
      );
    }

    // Link teacher → nursery
    if (nurseryId) {
      await Nursery.findByIdAndUpdate(nurseryId, {
        $addToSet: { workers: teacher._id }
      });
    }

    res.status(201).json({
      message: "Teacher created and linked successfully",
      teacher
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



export default router;
