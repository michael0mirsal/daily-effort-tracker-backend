import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import Family from "./models/Family.js";
import Member from "./models/Member.js";
import Task from "./models/Task.js";
import Routine from "./models/Routine.js";

dotenv.config();

const loadJSON = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
  } catch (err) {
    console.error("Error reading file:", filePath, err);
    return [];
  }
};

async function migrate() {
  try {
    console.log("🚀 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected.");

    // ----------------- Families + Members -----------------
    const familiesPath = path.join("data", "families.json");
    const familiesData = loadJSON(familiesPath);

    console.log(`📦 Found ${familiesData.length} families`);

    for (let f of familiesData) {
      const existing = await Family.findOne({ name: f.name });
      if (existing) {
        console.log(`⚠️ Family already exists: ${f.name} — skipping`);
        continue;
      }

      const family = await Family.create({
        name: f.name,
        dad: f.dad,
        mom: f.mom,
        passhash: f.passhash,
        members: []
      });

      if (f.members && Array.isArray(f.members)) {
        for (let m of f.members) {
          const memberDoc = await Member.create({
            name: m.name,
            role: m.role || "kid",
            family: family._id
          });

          family.members.push(memberDoc._id);
        }
        await family.save();
      }

      console.log(`✅ Migrated family: ${f.name}`);
    }

    // ----------------- Tasks (Efforts) -----------------
    const effortsPath = path.join("data", "efforts.json");
    const effortsData = loadJSON(effortsPath);

    for (let e of effortsData) {
      const member = await Member.findOne({ name: e.name });
      if (!member) continue;

      await Task.create({
        member: member._id,
        date: e.date,
        items: e.items,
        checkedData: e.checkedData || 0
      });
    }

    console.log("✅ Tasks migrated!");

    // ----------------- Routines -----------------
    const routinesPath = path.join("data", "routines.json");
    const routinesData = loadJSON(routinesPath);

    for (let r of routinesData) {
      const member = await Member.findOne({ name: r.name });
      if (!member) continue;

      await Routine.create({
        member: member._id,
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
