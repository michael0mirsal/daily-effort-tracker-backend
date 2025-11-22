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

// Load JSON safely
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return [];
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

    // ---------- Families + Members ----------
    const familiesPath = path.join(process.cwd(), "data", "families.json");
    const familiesData = loadJSON(familiesPath);

    console.log(`📦 Found ${familiesData.length} families in JSON`);

    for (let f of familiesData) {
      // Prevent duplicates
      const existing = await Family.findOne({ name: f.name });
      if (existing) {
        console.log(`⚠️ Family already exists: ${f.name} — skipping`);
        continue;
      }

      // Create family with no members yet
      const familyDoc = await Family.create({
        name: f.name,
        dad: f.dad,
        mom: f.mom,
        passhash: f.passhash,
        members: []
      });

      // Create member documents
      if (Array.isArray(f.members)) {
        for (let m of f.members) {
          const memberDoc = await Member.create({
            name: m.name,
            role: m.role || "kid",
            family: familyDoc._id
          });

          // Link member ObjectId into family.members
          familyDoc.members.push(memberDoc._id);
        }
        await familyDoc.save();
      }

      console.log(`✅ Migrated family: ${f.name}`);
    }

    // ---------- Tasks / Efforts ----------
    const effortsPath = path.join(process.cwd(), "data", "efforts.json");
    const effortsData = loadJSON(effortsPath);

    console.log(`📘 Migrating efforts (${effortsData.length})`);

    for (let e of effortsData) {
      const memberDoc = await Member.findOne({ name: e.name });

      if (!memberDoc) {
        console.log(`❌ Effort skipped — Member not found: ${e.name}`);
        continue;
      }

      await Task.create({
        member: memberDoc._id,
        date: e.date,
        items: e.items,
        checkedData: e.checkedData || 0
      });
    }

    console.log("✅ Tasks migrated!");

    // ---------- Routines ----------
    const routinesPath = path.join(process.cwd(), "data", "routines.json");
    const routinesData = loadJSON(routinesPath);

    console.log(`🟣 Migrating routines (${routinesData.length})`);

    for (let r of routinesData) {
      const memberDoc = await Member.findOne({ name: r.name });

      if (!memberDoc) {
        console.log(`❌ Routine skipped — Member not found: ${r.name}`);
        continue;
      }

      await Routine.create({
        member: memberDoc._id,
        date: r.date,
        items: r.items,
        checkedData: r.checkedData || 0
      });
    }

    console.log("✅ Routines migrated!");

    console.log("🎉 FULL Migration Completed Successfully!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

migrate();
