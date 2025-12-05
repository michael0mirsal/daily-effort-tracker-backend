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
// GET all nurseries with related classes and workers
router.get("/nurseries", async (req, res) => {
  try {
    const nurseries = await Nursery.find()
      .populate({
        path: "classes",
        populate: { path: "teachers members", select: "name role email phone" } // populate teachers & members
      })
      .populate("workers", "name role email phone classes"); // populate nursery workers

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
// GET all classes with related data
router.get("/classes", async (req, res) => {
  try {
    const classes = await ClassModel.find()
      .populate("nursery", "name email phone passKey") // nursery info
      .populate("teachers", "name role email phone")   // class teachers
      .populate("members", "name age");               // members/kids (adjust fields as needed)

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
// GET all teachers with classes and nursery
router.get("/teachers", async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .populate("classes", "name passKey")           // classes assigned to teacher
      .populate("nursery", "name email phone");      // nursery info

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
