import express from "express";
import Nursery from "../models/Nursery.js";
import ClassModel from "../models/Class.js";
import Teacher from "../models/Teacher.js";
import SchoolMember from "../models/sch-Member.js";
import License from '../models/License.js';
import Family from "../models/Family.js";
import Member from "../models/Member.js"; 
import crypto from "crypto";


const router = express.Router();

function generateLicenseKey() {
  const blocks = [];

  for (let i = 0; i < 4; i++) {
    blocks.push(crypto.randomBytes(2).toString("hex").toUpperCase());
  }

  return `NURSERY-${blocks.join("-")}`;
}
//////////////Family---------------------------------data-----------------------ner----------------
router.get("/families", async (req, res) => {
  const families = await Family.find().populate("members");
  res.json(families);
});


router.get("/families/:id", async (req, res) => {
  try {
    const family = await Family.findById(req.params.id).populate("members");
    if (!family) return res.status(404).json({ message: "Family not found" });
    res.json(family);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});







/////////////////////ner-----------------------data----------------------------------------------
// UPDATE NURSERY
router.put("/nurseries/:id", async (req, res) => {
  try {
    const nurseryId = req.params.id;

    const updatedNursery = await Nursery.findByIdAndUpdate(
      nurseryId,
      {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        passKey: req.body.passKey,
        manager: req.body.manager,
        managerPassKey: req.body.managerPassKey
      },
      { new: true }
    );

    if (!updatedNursery) {
      return res.status(404).json({ success: false, message: "Nursery not found" });
    }

    res.json({
      success: true,
      message: "Nursery updated successfully",
      nursery: updatedNursery
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/nurseries/:id/dashboard", async (req, res) => {
  try {
    const nurseryId = req.params.id;
    const nursery = await Nursery.findById(nurseryId)
      .populate("classes")
      .populate("workers");

    if (!nursery) return res.status(404).json({ success: false, message: "Nursery not found" });

    res.json({
      success: true,
      nursery: {
        id: nursery._id,
        name: nursery.name,
        email: nursery.email,
        phone: nursery.phone,
        passKey: nursery.passKey,
        manager: nursery.manager,
        managerPassKey: nursery.managerPassKey,
        classes: nursery.classes || [],
        workers: nursery.workers || []
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// LOGIN route
// LOGIN route
// POST /api/school/signin
router.post("/school/signin", async (req, res) => {
  try {
    const { name, nurseryName, role, passKey } = req.body;

    // 1️⃣ Check required fields
    if (!name || !nurseryName || !role || !passKey) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    let user;

    // 2️⃣ Role-based authentication
    if (role === "admin" || role === "manager") {
      // Admin/Manager → check managerPassKey in nursery
      const nursery = await Nursery.findOne({ name: nurseryName });
      if (!nursery) return res.status(404).json({ success: false, message: "Nursery not found" });

      if (passKey !== nursery.managerPassKey) {
        return res.status(401).json({ success: false, message: "Invalid manager/admin credentials" });
      }

      user = {
        name,
        role,
        nurseryId: nursery._id,
        nurseryName: nursery.name,
        manager: nursery.manager,
        managerPassKey: nursery.managerPassKey
      };
    } 
    else if (role === "teacher") {
      // Teacher → check nursery passKey
      user = await Teacher.findOne({ name }).populate("nursery", "name passKey");
      if (!user || user.nursery.name !== nurseryName || user.nursery.passKey !== passKey) {
        return res.status(401).json({ success: false, message: "Invalid teacher credentials" });
      }

      user = {
        _id: user._id,
        name: user.name,
        role,
        nurseryId: user.nursery._id,
        nurseryName: user.nursery.name
      };
    } 
    else if (role === "supervisor") {
      // Parent → check nursery passKey via family
      user = await Teacher.findOne({ name }).populate("nursery", "name passKey");
      if (!user || user.nursery.name !== nurseryName || user.nursery.passKey !== passKey) {
        return res.status(401).json({ success: false, message: "Invalid teacher credentials" });
      }

      user = {
        _id: user._id,
        name: user.name,
        role,
        nurseryId: user.nursery._id,
        nurseryName: user.nursery.name
      };
    } 
    else {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    // 3️⃣ Return user info
    return res.json({ success: true, user });

  } catch (err) {
    console.error("Sign-in error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});




// Create license key (Admin)
router.post("/admin/create-license", async (req, res) => {
  try {
    const key = generateLicenseKey();

    const license = await License.create({
      key,
      used: false,
      assignedTo: null
    });

    res.status(201).json({ success: true, key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error creating license" });
  }
});
// 🏫 Nursery Routes
// Validate License (before showing signup form)
router.post('/nursery/validate-license', async (req, res) => {
  try {
    const { license } = req.body;

    if (!license) return res.status(400).json({ message: 'License is required' });

    // Normalize license
    const licenseKey = license.trim().toUpperCase();
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
    const { name, address, email, phone, passKey, license, manager, managerPassKey  } = req.body;

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
      manager,
      managerPassKey,
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
/*
CLASSES (nested under nursery)
--------------------- */
router.get("/nurseries/:id/classes", async (req, res) => {
  try {
    const classes = await ClassModel.find({ nursery: req.params.id });
    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/nurseries/:id/classes", async (req, res) => {
  try {
    const { name, passKey } = req.body;
    const nurseryId = req.params.id;

    const cls = await ClassModel.create({ name, passKey, nursery: nurseryId });

    // link to nursery
    await Nursery.findByIdAndUpdate(nurseryId, { $addToSet: { classes: cls._id } });

    res.status(201).json({ success: true, class: cls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/nurseries/:nurseryId/classes/:classId", async (req, res) => {
  try {
    const { nurseryId, classId } = req.params;

    // 1️⃣ Find the class
    const cls = await ClassModel.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: "Class not found" });

    // 2️⃣ Find all teachers assigned to this class
    const teachersToDelete = await Teacher.find({ classes: classId });

    // 3️⃣ Delete each teacher and remove from nursery
    for (const teacher of teachersToDelete) {
      await Teacher.findByIdAndDelete(teacher._id);
      await Nursery.findByIdAndUpdate(nurseryId, { $pull: { workers: teacher._id } });
    }

    // 4️⃣ Delete the class
    await ClassModel.findByIdAndDelete(classId);

    // 5️⃣ Remove class from nursery
    await Nursery.findByIdAndUpdate(nurseryId, { $pull: { classes: classId } });

    res.json({ success: true, message: "Class and all assigned teachers deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/nurseries/:nurseryId/classes/:classId", async (req, res) => {
  try {
    const { name, passKey } = req.body;
    const { classId } = req.params;

    const updatedClass = await ClassModel.findByIdAndUpdate(
      classId,
      { name, passKey },
      { new: true }
    );

    if (!updatedClass) return res.status(404).json({ success: false, message: "Class not found" });

    res.json({ success: true, class: updatedClass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


/* ---------------------
   TEACHERS (nested under nursery)
--------------------- */
router.get("/nurseries/:id/teachers", async (req, res) => {
  try {
    const teachers = await Teacher.find({ nursery: req.params.id });
    res.json({ success: true, teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add teacher
router.post("/nurseries/:id/teachers", async (req, res) => {
  try {
    const nurseryId = req.params.id;
    const { name, role, email, phone, assignedClass } = req.body;

    // 1️⃣ Duplicate protection
    const existing = await Teacher.findOne({
      nursery: nurseryId,
      $or: [
        { name: new RegExp(`^${name}$`, "i") },
        { email: email.toLowerCase() },
        { phone }
      ]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Teacher already exists (same name, email, or phone)."
      });
    }

    // 2️⃣ Validate assigned class exists (if provided)
    if (assignedClass) {
      const cls = await ClassModel.findById(assignedClass);
      if (!cls) {
        return res.status(400).json({ success: false, message: "Assigned class does not exist" });
      }
    }

    // 3️⃣ Create teacher
    const teacher = await Teacher.create({
      name,
      role,
      email: email.toLowerCase(),
      phone,
      nursery: nurseryId,
      classes: assignedClass ? [assignedClass] : []
    });

    // link teacher to nursery
    await Nursery.findByIdAndUpdate(nurseryId, { $addToSet: { workers: teacher._id } });

    // link teacher to class
    if (assignedClass) {
      await ClassModel.findByIdAndUpdate(assignedClass, { $addToSet: { teachers: teacher._id } });
    } else {
      return res.status(400).json({ success: false, message: "Teacher must be assigned to a class" });
    }

    res.status(201).json({ success: true, teacher });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// PUT assign class to teacher
// UPDATE TEACHER
// UPDATE TEACHER
router.put("/nurseries/:nurseryId/teachers/:teacherId", async (req, res) => {
  try {
    const { nurseryId, teacherId } = req.params;
    const { name, role, email, phone, assignedClass } = req.body;

    // 1️⃣ Duplicate protection during update
    const duplicate = await Teacher.findOne({
      nursery: nurseryId,
      _id: { $ne: teacherId },
      $or: [
        { name: new RegExp(`^${name}$`, "i") },
        { email: email.toLowerCase() },
        { phone }
      ]
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Another teacher already uses this name, email, or phone."
      });
    }

    const updateData = {
      name,
      role,
      email: email.toLowerCase(),
      phone,
      classes: assignedClass ? [assignedClass] : []
    };

    const updated = await Teacher.findOneAndUpdate(
      { _id: teacherId, nursery: nurseryId },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.json({ success: false, message: "Teacher not found" });
    }

    res.json({ success: true, teacher: updated });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});




router.delete("/nurseries/:nurseryId/teachers/:teacherId", async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.teacherId);
    await Nursery.findByIdAndUpdate(req.params.nurseryId, { $pull: { workers: req.params.teacherId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

//////////////////////////
// 🧒 School Member Routes
//////////////////////////

// GET all kids
// GET one school member by ID

// GET classes assigned to a teacher
router.get("/teachers/:id/classes", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate("classes");
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    res.json({ success: true, classes: teacher.classes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get("/schoolMembers/:id", async (req, res) => {
  try {
    const member = await SchoolMember.findById(req.params.id)
      .populate("class", "name passKey")
      .populate("nursery", "name email phone")
      .populate("family", "dad mom")
      .populate("member");

    if (!member) {
      return res.status(404).json({ error: "School member not found" });
    }

    res.json(member);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/schoolMembers/check", async (req, res) => {
  try {
    const { family, member, nursery, class: classId } = req.body;
    const existing = await SchoolMember.findOne({ family, member, nursery, class: classId });

    if (existing) {
      return res.status(409).json({ success: false, message: "Kid already assigned to this class" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
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

// GET all members inside one class
router.get("/members/class/:classId", async (req, res) => {
  try {
    const classId = req.params.classId;

    const members = await SchoolMember.find({ class: classId })
      .populate("member") // kid info (name, age, etc)
      .populate("family"); // dad, mom, etc

    res.json(members);

  } catch (err) {
    console.error("Error loading class members:", err);
    res.status(500).json({ message: "Server error loading class members" });
  }
});


export default router;
