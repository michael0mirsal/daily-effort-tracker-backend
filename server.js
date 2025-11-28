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

    // ---------------------------
    // 🚫 Prevent past dates
    // ---------------------------
    const todayStr = new Date().toISOString().split("T")[0]; 
    const today = new Date(todayStr);
    const inputDate = new Date(date);

    if (inputDate < today) {
      return res.status(400).json({
        error: "Cannot save effort for past dates."
      });
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

    // Prevent duplicate activities
    // Prevent duplicate activities by name only
const existingActivities = new Set(
  taskDoc.items.map(it => it.activity.trim().toLowerCase())
);

// Merge items
items.forEach(newItem => {
  const activityKey = newItem.activity.trim().toLowerCase();

  if (!existingActivities.has(activityKey)) {
    taskDoc.items.push({
      activity: newItem.activity,
      timeMin: Number(newItem.timeMin),
      evaluation: Number(newItem.evaluation) || 0,
      note: newItem.note || ""
    });

    existingActivities.add(activityKey);
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

    // match string date exactly
    if (date) query.date = date;

    if (name || family) {
      let memberQuery = {};

      if (name) memberQuery.name = name;

      if (family) {
        const familyDoc = await Family.findOne({ name: family });
        if (!familyDoc) return res.json([]);
        memberQuery.family = familyDoc._id;
      }

      const members = await Member.find(memberQuery);
      const memberIds = members.map(m => m._id);
      query.member = { $in: memberIds };
    }

    const results = await Task.find(query).populate("member");
    res.json(results);

  } catch (err) {
    console.error("Search error:", err);
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

    // Prevent past dates
    const todayStr = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'
    if (date < todayStr) {
      return res.status(400).json({ error: "Cannot save routine for past dates." });
    }

    let familyDoc;

    if (mongoose.isValidObjectId(family)) {
      familyDoc = await Family.findById(family);
    } else {
      familyDoc = await Family.findOne({ name: family });
    }

    if (!familyDoc) return res.status(404).json({ error: "Family not found" });

    const memberDoc = await Member.findOne({ name, family: familyDoc._id });
    if (!memberDoc) return res.status(404).json({ error: "Member not found" });

    let routineDoc = await Routine.findOne({ member: memberDoc._id, date });

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

    if (!name || !date || !family) {
      return res.status(400).json({ error: "Missing required query parameters: name, date, family" });
    }

    // Find the family first
    const familyDoc = await Family.findOne({ name: family });
    if (!familyDoc) return res.json([]);

    // Find the member inside that family
    const memberDoc = await Member.findOne({ name, family: familyDoc._id });
    if (!memberDoc) return res.json([]);

    // Search routines only for that member and date
    const routines = await Routine.find({ member: memberDoc._id, date });

    const result = routines.map(r => ({
      name: memberDoc.name,
      family: familyDoc.name,
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

    // Last 7 days including today
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    // Gather all member IDs and map to family info
    const allMemberIds = [];
    const memberMap = {}; // memberId => { familyName }
    families.forEach(family => {
      (family.members || []).forEach(member => {
        allMemberIds.push(member._id);
        memberMap[member._id.toString()] = { familyName: family.name, memberName: member.name };
      });
    });

    // Fetch all tasks and routines for last 7 days in bulk
    const tasks = await Task.find({
      member: { $in: allMemberIds },
      date: { $in: days }
    });

    const routines = await Routine.find({
      member: { $in: allMemberIds },
      date: { $in: days }
    });

    const result = [];

    // Loop through members
    allMemberIds.forEach(memberId => {
      const { familyName, memberName } = memberMap[memberId.toString()];

      const memberTasks = tasks.filter(t => t.member.equals(memberId));
      const memberRoutines = routines.filter(r => r.member.equals(memberId));

      const starsPerDay = days.map(date => {
        const taskDoc = memberTasks.find(t => t.date === date);
        const routineDoc = memberRoutines.find(r => r.date === date);

        let totalStars = 0;
        if (taskDoc) totalStars += taskDoc.checkedData ?? taskDoc.items.reduce((sum, it) => sum + (Number(it.evaluation) || 0), 0);
        if (routineDoc) totalStars += routineDoc.checkedData ?? routineDoc.items.filter(i => i.done).length;

        return { date, stars: totalStars };
      });

      result.push({ name: memberName, family: familyName, starsPerDay });
    });

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
