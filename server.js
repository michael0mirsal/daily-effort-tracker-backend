// ======================================================
// ✅ Imports & Setup
// ======================================================
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { connectDB } from "./db.js"; // 🌐 MongoDB connection
import familyRoutes from "./routes/familyRoutes.js"; // 🌳 Family System

// Import MongoDB models
import Family from "./models/Family.js";
import Member from "./models/Member.js";
import Task from "./models/Task.js";
import Routine from "./models/Routine.js";
import mongoose from "mongoose";

mongoose.set("debug", true);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8080; // Railway prefers 8080

// ======================================================
// ✅ Middleware
// ======================================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve welcome page
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "welcome.html"));
});

// ======================================================
// ✅ Family Routes
// ======================================================
app.use("/api/families", familyRoutes);

// ======================================================
// ✅ Effort APIs (MongoDB version)
// ======================================================

// POST /api/efforts
app.post("/api/efforts", async (req, res) => {
  try {
    const { name, date, items, checkedData, family } = req.body;

    // Validation
    if (!name || !date || !Array.isArray(items) || !family) {
      return res.status(400).json({ error: "Invalid data sent to server" });
    }

    // Find family
    const familyDoc = await Family.findOne({ name: family });
    if (!familyDoc) return res.status(404).json({ error: "Family not found" });

    // Find member in family
    const memberDoc = await Member.findOne({ name, family: familyDoc._id });
    if (!memberDoc) return res.status(404).json({ error: "Member not found" });

    // Find existing record
    let taskDoc = await Task.findOne({ member: memberDoc._id, date });

    if (!taskDoc) {
      taskDoc = new Task({
        member: memberDoc._id,
        date,
        items: [],
        checkedData: checkedData || 0
      });
    }

    // Merge items without duplicates
    const existingKeys = new Set(
      taskDoc.items.map(
        it => it.activity.trim().toLowerCase() + "_" + it.timeMin
      )
    );

    // Merge items
items.forEach(newItem => {
  const key = newItem.activity.trim().toLowerCase() + "_" + newItem.timeMin;
  if (!existingKeys.has(key)) {
    taskDoc.items.push({
      activity: newItem.activity,
      timeMin: Number(newItem.timeMin),
      evaluation: Number(newItem.evaluation) || 0,
      note: newItem.note || ""
    });
    existingKeys.add(key);
  }
});

// Update checkedData with sum of evaluations
taskDoc.checkedData = taskDoc.items.reduce(
  (sum, it) => sum + Number(it.evaluation || 0),
  0
);

// Save once
await taskDoc.save();

res.json({
  message: "✅ Effort saved successfully!",
  itemsSaved: taskDoc.items.length,
  starsToday: taskDoc.checkedData
});


  } catch (err) {
    console.error("❌ Server error saving effort:", err);
    res.status(500).json({ error: "Server error saving effort" });
  }
});


// GET /api/efforts/search
app.get("/api/efforts/search", async (req, res) => {
  try {
    const { name, date, family } = req.query;
    let query = {};
    if (date) query.date = date;

    let memberIds;
    if (name || family) {
      let memberQuery = {};
      if (name) memberQuery.name = name;
      if (family) {
        const familyDoc = await Family.findOne({ name: family });
        if (!familyDoc) return res.json([]);
        memberQuery.family = familyDoc._id;
      }
      const members = await Member.find(memberQuery);
      memberIds = members.map(m => m._id);
      query.member = { $in: memberIds };
    }

    const tasks = await Task.find(query).populate("member", "name family");
    const result = tasks.map(t => ({
      name: t.member.name,
      family: t.member.family.name || family,
      date: t.date,
      items: t.items,
      checkedData: t.checkedData
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error searching efforts" });
  }
});

// PATCH /api/efforts/updateEvaluation
app.patch("/api/efforts/updateEvaluation", async (req, res) => {
  try {
    const { name, date, index, evaluation } = req.body;
    if (!name || !date || index === undefined) return res.status(400).json({ message: "Missing fields." });

    const memberDoc = await Member.findOne({ name });
    if (!memberDoc) return res.status(404).json({ message: "Member not found." });

    const taskDoc = await Task.findOne({ member: memberDoc._id, date });
    if (!taskDoc) return res.status(404).json({ message: "Task not found." });
    if (!taskDoc.items[index]) return res.status(400).json({ message: "Invalid index." });

    taskDoc.items[index].evaluation = evaluation;
    await taskDoc.save();

    res.json({ message: "✅ Evaluation updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating evaluation." });
  }
});

// ======================================================
// ✅ Routine APIs (MongoDB version)
// ======================================================

// POST /api/routines/save
app.post("/api/routines/save", async (req, res) => {
  try {
    const { name, date, items, family, checkedData } = req.body;

    if (!name || !date || !Array.isArray(items) || !family)
      return res.status(400).json({ error: "Invalid routine data" });

    let familyDoc;

    // Allow name OR ID
    if (mongoose.isValidObjectId(family)) {
      familyDoc = await Family.findById(family);
    } else {
      familyDoc = await Family.findOne({ name: family });
    }

    if (!familyDoc)
      return res.status(404).json({ error: "Family not found" });

    const memberDoc = await Member.findOne({
  name,
  family: familyDoc._id   // let Mongoose cast automatically
});



    if (!memberDoc)
      return res.status(404).json({ error: "Member not found" });

    let routineDoc = await Routine.findOne({
      member: memberDoc._id,
      date,
    });

    if (routineDoc) {
      routineDoc.items = items;
      routineDoc.checkedData = checkedData || 0;
    } else {
      routineDoc = new Routine({
        member: memberDoc._id,
        date,
        items,
        checkedData: checkedData || 0,
      });
    }

    await routineDoc.save();

    res.json({ message: "✅ Routine saved!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error saving routine" });
  }
});


// GET /api/routines/search
app.get("/api/routines/search", async (req, res) => {
  try {
    const { name, date, family } = req.query;
    let query = {};
    if (date) query.date = date;

    let memberIds;
    if (name || family) {
      let memberQuery = {};
      if (name) memberQuery.name = name;
      if (family) {
        const familyDoc = await Family.findOne({ name: family });
        if (!familyDoc) return res.json([]);
        memberQuery.family = familyDoc._id;
      }
      const members = await Member.find(memberQuery);
      memberIds = members.map(m => m._id);
      query.member = { $in: memberIds };
    }

    const routines = await Routine.find(query).populate("member", "name family");
    const result = routines.map(r => ({
      name: r.member.name,
      family: r.member.family.name || family,
      date: r.date,
      items: r.items,
      checkedData: r.checkedData
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error searching routines" });
  }
});

// ======================================================
// ✅ Weekly stars summary (MongoDB version)
// ======================================================
app.get("/api/kidsStars/week", async (req, res) => {
  try {
    const families = await Family.find().populate("members");
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const result = [];

    for (const family of families) {
      const allMembers = [family.dad, family.mom, ...(family.members || [])].filter(Boolean);

      for (const memberName of allMembers) {
        const memberDoc = await Member.findOne({ name: memberName, family: family._id });
        if (!memberDoc) continue;

        const starsPerDay = [];
        for (const date of days) {
          const taskDoc = await Task.findOne({ member: memberDoc._id, date });
          const routineDoc = await Routine.findOne({ member: memberDoc._id, date });

          let totalStars = 0;
          if (taskDoc?.items?.length) totalStars += taskDoc.items.reduce((sum, it) => sum + (Number(it.evaluation) || 0), 0);
          if (routineDoc?.items?.length) totalStars += routineDoc.items.filter(i => i.done).length;

          starsPerDay.push({ date, stars: totalStars });
        }

        result.push({ name: memberName, family: family.name, starsPerDay });
      }
    }

    res.json(result);
  } catch (err) {
    console.error("❌ Error in /api/kidsStars/week:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// ✅ Health check
// ======================================================
app.get("/api/test", (req, res) => res.json({ message: "✅ Server is alive!" }));

// ======================================================
// ✅ Start server
// ======================================================
// Connect MongoDB and start server
await connectDB();

console.log("📡 Environment PORT =", process.env.PORT);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running → http://0.0.0.0:${PORT}`);
});

// ======================================================
// ✅ Helper
// ======================================================
function calculateStars(items) {
  return items.reduce((sum, item) => sum + (Number(item.evaluation) || 0), 0);
}
