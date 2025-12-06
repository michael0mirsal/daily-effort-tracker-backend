import express from "express";
import Nursery from "../models/Nursery.js";
import ClassModel from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import SchoolMember from "../models/sch-Member.js";
import License from '../models/License.js';

const router = express.Router();

//////////////////////////
// 🏫 Nursery Routes
// Validate License (before showing signup form)
router.post('/validate-license', async (req, res) => {
  try {
    const { license } = req.body;

    if (!license) return res.status(400).json({ message: 'License is required' });

    // Normalize license
    const licenseKey = license.toUpperCase();

    const licenseDoc = await License.findOne({ key: licenseKey });

    if (!licenseDoc) return res.status(400).json({ message: 'Invalid license' });
    if (licenseDoc.used) return res.status(400).json({ message: 'License already used' });

    // ✅ Do NOT mark as used yet; mark after nursery signs up
    res.json({ message: 'License valid' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// GET all nurseries
router.get("/nurseries", async (req, res) => {
  try {
    const nurseries = await Nursery.find()
      .populate({
        path: "classes",
        populate: {
          path: "teachers members",
          select: "fullName role age gender"
        }
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
    const { name, address, email, phone, passKey, license } = req.body;

    // 1️⃣ Check required fields
    if (!name || !email || !phone || !passKey || !license) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 2️⃣ Validate license
    const licenseKey = license.toUpperCase();
    const licenseDoc = await License.findOne({ key: licenseKey });

    if (!licenseDoc) {
      return res.status(400).json({ error: "Invalid license" });
    }
    if (licenseDoc.used) {
      return res.status(400).json({ error: "License already used" });
    }

    // 3️⃣ Create the nursery
    const newNursery = await Nursery.create({
      name,
      address,
      email,
      phone,
      passKey
    });

    // 4️⃣ Mark license as used
    licenseDoc.used = true;
    licenseDoc.assignedTo = newNursery._id;
    await licenseDoc.save();

    res.status(201).json({ nursery: newNursery, message: "Nursery registered successfully!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

//////////////////////////
// 🎓 Class Routes
//////////////////////////

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

// CREATE class
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

    // link: nursery -> class
    if (nurseryId) {
      await Nursery.findByIdAndUpdate(nurseryId, {
        $addToSet: { classes: classDoc._id }
      });
    }

    // link: teachers -> class
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

// CREATE teacher
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

    // link teacher → classes
    if (classIds?.length) {
      await ClassModel.updateMany(
        { _id: { $in: classIds } },
        { $addToSet: { teachers: teacher._id } }
      );
    }

    // link teacher → nursery
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
// 🧒 School Member Routes
//////////////////////////

// GET all kids
router.get("/schoolMembers", async (req, res) => {
  try {
    const members = await SchoolMember.find()
      .populate("class", "name passKey")
      .populate("nursery", "name email phone")
      .populate("family", "dad mom");

    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE kid
router.post("/schoolMembers", async (req, res) => {
  try {
    const kid = await SchoolMember.create(req.body);

    // link: kid -> class.members
    if (req.body.class) {
      await ClassModel.findByIdAndUpdate(req.body.class, {
        $addToSet: { members: kid._id }
      });
    }

    res.status(201).json({
      message: "School Member created successfully",
      kid
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
