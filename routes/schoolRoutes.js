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
router.post("/nurseries", async (req, res) => {
  try {
    const { name, address } = req.body;
    const nursery = await Nursery.create({ name, address });
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
router.post("/classes", async (req, res) => {
  try {
    const { name, nurseryId, teacherId, kidIds } = req.body;
    const classDoc = await ClassModel.create({
      name,
      nursery: nurseryId,
      teacher: teacherId,
      kids: kidIds // array of Member ObjectIds
    });
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
router.post("/teachers", async (req, res) => {
  try {
    const { name, subject } = req.body;
    const teacher = await Teacher.create({ name, subject });
    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
