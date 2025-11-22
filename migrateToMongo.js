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
      const familyName = f.name.trim();
      const existing = await Family.findOne({ name: familyName });
      if (existing) {
        console.log(`⚠️ Family already exists: ${familyName} — skipping`);
        continue;
      }

      // Create family WITHOUT members first
      const familyDoc = await Family.create({
        name: familyName,
        dad: f.dad.trim(),
        mom: f.mom.trim(),
        passhash: f.passhash,
        members: []
      });

      // Create Member documents and link to family
      if (Array.isArray(f.members)) {
        for (let m of f.members) {
          const memberName = m.name.trim();
          const memberDoc = await Member.create({
            name: memberName,
            role: m.role || "kid",
            family: familyDoc._id
          });
          familyDoc.members.push(memberDoc._id);
          console.log(`   🔹 Member created: ${memberName} -> Family: ${familyName}`);
        }
        await familyDoc.save();
      }

      console.log(`✅ Migrated family: ${familyName}`);
    }

    // ---------- Tasks / Efforts ----------
    const effortsPath = path.join(process.cwd(), "data", "efforts.json");
    const effortsData = loadJSON(effortsPath);
    console.log(`📘 Migrating efforts (${effortsData.length})`);

    for (let e of effortsData) {
      const memberName = e.name.trim();
      const memberDoc = await Member.findOne({ name: memberName });
      if (!memberDoc) {
        console.log(`❌ Effort skipped — Member not found: ${memberName}`);
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
      if (!r.family) {
        console.log(`❌ Routine skipped — Family not specified: ${r.name}`);
        continue;
      }

      const familyName = r.family.trim();
      const familyDoc = await Family.findOne({ name: familyName });
      if (!familyDoc) {
        console.log(`❌ Routine skipped — Family not found: ${familyName}`);
        continue;
      }

      const memberName = r.name.trim();
      const memberDoc = await Member.findOne({ name: memberName, family: familyDoc._id });
      if (!memberDoc) {
        console.log(`❌ Routine skipped — Member not found: ${memberName} in family ${familyName}`);
        continue;
      }

      await Routine.create({
        member: memberDoc._id,
        date: r.date,
        items: r.items,
        checkedData: r.checkedData || 0
      });

      console.log(`✅ Routine saved for ${memberName} in family ${familyName}`);
    }

    console.log("🎉 FULL Migration Completed Successfully!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

migrate();
