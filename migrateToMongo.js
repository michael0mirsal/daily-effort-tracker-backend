// migrateToMongo.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import Family from "./models/Family.js";
import Member from "./models/Member.js";
import Task from "./models/Task.js";
import Routine from "./models/Routine.js";

dotenv.config();

// Helper to safely load JSON
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return [];
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
  } catch (err) {
    console.error(`❌ Error reading file: ${filePath}`, err);
    return [];
  }
};

async function migrate() {
  try {
    console.log("🚀 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected.");

    // -------------------- Families --------------------
    const familiesPath = path.join(process.cwd(), "data", "families.json");
    const familiesData = loadJSON(familiesPath);

    console.log(`📦 Found ${familiesData.length} families`);

    for (let f of familiesData) {
      const existing = await Family.findOne({ name: f.name });
      if (existing) {
        console.log(`⚠️ Family already exists: ${f.name} — skipping`);
        continue;
      }

      // Create family WITHOUT members first
      const family = await Family.create({
        name: f.name,
        dad: f.dad,
        mom: f.mom,
        passhash: f.passhash,
        members: []
      });

      // Create Member documents and push ObjectId into family.members
      if (Array.isArray(f.members)) {
        for (let m of f.members) {
          const memberDoc = await Member.create({
            name: m.name,
            role: m.role,
            family: family._id
          });
          family.members.push(memberDoc._id);
        }
        await family.save();
      }

      console.log(`✅ Migrated family: ${f.name}`);
    }

    // -------------------- Tasks (Efforts) --------------------
    const effortsPath = path.join(process.cwd(), "data", "efforts.json");
    const effortsData = loadJSON(effortsPath);

    for (let e of effortsData) {
      const memberDoc = await Member.findOne({ name: e.name });
      if (!memberDoc) continue;

      await Task.create({
        member: memberDoc._id,
        date: e.date,
        items: e.items,
        checkedData: e.checkedData || 0
      });
    }

    console.log("✅ Tasks migrated!");

    // -------------------- Routines --------------------
    const routinesPath = path.join(process.cwd(), "data", "routines.json");
    const routinesData = loadJSON(routinesPath);

    for (let r of routinesData) {
      const memberDoc = await Member.findOne({ name: r.name });
      if (!memberDoc) continue;

      await Routine.create({
        member: memberDoc._id,
        date: r.date,
        items: r.items,
        checkedData: r.checkedData || 0
      });
    }

    console.log("✅ Routines migrated!");

    console.log("🎉 FULL Migration Completed!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

migrate();
