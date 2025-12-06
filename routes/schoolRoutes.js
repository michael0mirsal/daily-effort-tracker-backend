import express from "express";
import Nursery from "../models/Nursery.js";
import ClassModel from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import SchoolMember from "../models/sch-Member.js";

const router = express.Router();

//////////////////////////
// 🏫 Nursery Routes
//////////////////////////

// GET all nurseries
router.get("/nurseries", async (req, res) => {
  try {
    const nurseries = await Nursery.find()
      .populate({
        path: "classes",
        populate: { path: "teachers members", select: "fullName role age phone" }
      })
      .populate("workers", "name role email phone classes");

    res.json(nurseries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create nursery
router.post("/nurseries", async (req, res) => {
  try {
    const { name, address, email, phone, passKey } = req.body;

    if (!name || !email || !phone || !passKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const nursery = await Nursery.create({
      name,
      address,
      email,
      phone,
      passKey
    });

    res.status(201).json(nursery);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//////////////////////////
// 🎓 Class Routes
//////////////////////////

// GET all classes
router.get("/classes", async (req, res) => {
  try {
    const classes = await ClassModel.find()
      .populate("nursery", "name email phone passKey")
      .populate("teachers", "name role email phone")
      .populate("members", "fullName age gender");

    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE new class
router.post("/classes", async (req, res) => {
  try {
    const { name, passKey, nurseryId, teacherIds, memberIds } = req.body;

    const classDoc = await ClassModel.create({
      name,
      passKey,
      nursery: nurseryId,
      teachers: teacherIds || [],
      members: memberIds || []
    });

    // link class → nursery
    if (nurseryId) {
      await Nursery.findByIdAndUpdate(nurseryId, {
        $addToSet: { classes: classDoc._id }
      });
    }

    // link class → teachers
    if (teacherIds?.length) {
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

router.get("/teachers", async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .populate("classes", "name passKey")
      .populate("nursery", "name email phone");

    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

    // Add teacher → classes
    if (classIds?.length) {
      await ClassModel.updateMany(
        { _id: { $in: classIds } },
        { $addToSet: { teachers: teacher._id } }
      );
    }

    // Add teacher → nursery
    if (nurseryId) {
      await Nursery.findByIdAndUpdate(nurseryId, {
        $addToSet: { workers: teacher._id }
      });
    }

    res.status(201).json({
      message: "Teacher created successfully",
      teacher
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//////////////////////////
// 🧒 Member (Kid) Routes
//////////////////////////

// GET all members
router.get("/members", async (req, res) => {
  try {
    const members = await Member.find()
      .populate("class", "name passKey")
      .populate("nursery", "name email phone")
      .populate("family", "fatherName motherName");

    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE kid member
router.post("/members", async (req, res) => {
  try {
    const kid = await Member.create(req.body);

    // add kid → class.members
    if (req.body.class) {
      await ClassModel.findByIdAndUpdate(req.body.class, {
        $addToSet: { members: kid._id }
      });
    }

    res.status(201).json({
      message: "Member created successfully",
      kid
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
