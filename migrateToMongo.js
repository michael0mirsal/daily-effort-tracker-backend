import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import Family from "./models/Family.js";
import Member from "./models/Member.js";
import Task from "./models/Task.js";
import Routine from "./models/Routine.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
await mongoose.connect(MONGO_URI);
console.log("MongoDB connected for migration ✔️");

// Helper to read JSON
const loadJSON = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
};


const FAMILIES_FILE = path.join("./data", "families.json");
const familiesData = loadJSON(FAMILIES_FILE);

for (let f of familiesData) {
  const familyDoc = new Family({
    name: f.name,
    dad: f.dad,
    mom: f.mom,
    passhash: f.passhash,
  });
  await familyDoc.save();

  // Add members
  if (f.members && Array.isArray(f.members)) {
    for (let m of f.members) {
      const memberDoc = new Member({
        name: m.name,
        role: m.role || "kid",
        family: familyDoc._id,
      });
      await memberDoc.save();

      // Push member ID into family
      familyDoc.members.push(memberDoc._id);
    }
    await familyDoc.save();
  }
}

console.log("✅ Families and Members migrated!");


const EFFORT_FILE = path.join("./efforts.json");
const effortsData = loadJSON(EFFORT_FILE);

for (let e of effortsData) {
  // Find member by name + family
  const memberDoc = await Member.findOne({ name: e.name }).populate("family");
  if (!memberDoc) continue;

  const taskDoc = new Task({
    member: memberDoc._id,
    date: e.date,
    items: e.items,
    checkedData: e.checkedData || 0,
  });

  await taskDoc.save();
}

console.log("✅ Tasks/Efforts migrated!");


const ROUTINE_FILE = path.join("./routines.json");
const routinesData = loadJSON(ROUTINE_FILE);

for (let r of routinesData) {
  const memberDoc = await Member.findOne({ name: r.name }).populate("family");
  if (!memberDoc) continue;

  const routineDoc = new Routine({
    member: memberDoc._id,
    date: r.date,
    items: r.items,
    checkedData: r.checkedData || 0,
  });

  await routineDoc.save();
}

console.log("✅ Routines migrated!");


console.log("🎉 Migration finished!");
mongoose.disconnect();
