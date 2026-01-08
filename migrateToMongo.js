import mongoose from "mongoose";

import fs from "fs";
import path from "path";

import Family from "./models/Family.js";
import Member from "./models/Member.js";
import Task from "./models/Task.js";
import Routine from "./models/Routine.js";

 /*
dotenv.config({
 path: process.env.RAILWAY_ENVIRONMENT_NAME === "staging"
    ? ".env.staging"
    : process.env.RAILWAY_ENVIRONMENT_NAME === "production"
      ? ".env.production"
      : ".env.local"
});
// ✅ Debug: check if Mongo URI is loaded
console.log("RAILWAY_ENVIRONMENT_NAME =", process.env.RAILWAY_ENVIRONMENT_NAME);
console.log("MONGO_URI =", process.env.MONGO_URI);


// --- Choose MongoDB URI based on environment ---
const MONGO_URI =
  process.env.RAILWAY_ENVIRONMENT_NAME === "staging"
    ? process.env.MONGO_URI_STAGING
    : process.env.RAILWAY_ENVIRONMENT_NAME === "production"
      ? process.env.MONGO_URI_PRODUCTION
      : process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MongoDB URI is not defined! Check environment variables.");

  process.exit(1);
}
*/
// =============================
// ✅ Load .env for local dev only
// =============================
// Load .env only if not in production
// Only load local .env for development
// 🔹 FIX: Only load dotenv for local development
// Load dotenv only for local dev
if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env.local" });
}

// Choose MongoDB URI
const MONGO_URI = process.env.NODE_ENV === "production"
  ? process.env.MONGO_URI_PRODUCTION
  : process.env.MONGO_URI;

console.log("NODE_ENV =", process.env.NODE_ENV);
console.log("Using Mongo URI:", process.env.NODE_ENV === "production" ? "PRODUCTION" : "LOCAL");

if (!MONGO_URI) {
  console.error("❌ MongoDB URI is not defined!");
  process.exit(1);
}

// Connect once
await mongoose.connect(MONGO_URI);
console.log(`✅ Connected to MongoDB (${process.env.NODE_ENV || "development"})`);




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
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected.");


    // ---------- Families + Members ----------
    const familiesPath = path.join(process.cwd(), "data", "families.json");
    const familiesData = loadJSON(familiesPath);
    console.log(`📦 Found ${familiesData.length} families in JSON`);

    // Map to track members by family name
    const memberMap = new Map();

    for (let f of familiesData) {
      const familyName = f.name.trim();

      // Check if family exists
      let familyDoc = await Family.findOne({ name: familyName });
      if (!familyDoc) {
        familyDoc = await Family.create({
          name: familyName,
          dad: f.dad.trim(),
          mom: f.mom.trim(),
          passhash: f.passhash,
          members: []
        });
        console.log(`✅ Family created: ${familyName}`);
      } else {
        console.log(`⚠️ Family exists: ${familyName}`);
      }

      // Prepare a map for this family's members
      memberMap.set(familyName, new Map());

      if (Array.isArray(f.members)) {
        for (let m of f.members) {
          const memberName = m.name.trim();

          let memberDoc = await Member.findOne({ name: memberName, family: familyDoc._id });
          if (!memberDoc) {
            memberDoc = await Member.create({
              name: memberName,
              role: m.role || "kid",
              family: familyDoc._id
            });
            console.log(`   🔹 Member created: ${memberName} -> Family: ${familyName}`);
          }

          if (!familyDoc.members.includes(memberDoc._id)) {
            familyDoc.members.push(memberDoc._id);
          }

          // Add to map
          memberMap.get(familyName).set(memberName, memberDoc);
        }
        await familyDoc.save();
      }
    }

    // ---------- Tasks / Efforts ----------
    const effortsPath = path.join(process.cwd(), "data", "efforts.json");
    const effortsData = loadJSON(effortsPath);
    console.log(`📘 Migrating efforts (${effortsData.length})`);

    for (let e of effortsData) {
      const familyName = e.family?.trim();
      const memberName = e.name?.trim();

      if (!familyName || !memberName) {
        console.log(`❌ Effort skipped — missing family or name: ${JSON.stringify(e)}`);
        continue;
      }

      const familyMembers = memberMap.get(familyName);
      if (!familyMembers) {
        console.log(`❌ Effort skipped — family not found in map: ${familyName}`);
        continue;
      }

      const memberDoc = familyMembers.get(memberName);
      if (!memberDoc) {
        console.log(`❌ Effort skipped — member not found: ${memberName} in family ${familyName}`);
        continue;
      }

      await Task.create({
        member: memberDoc._id,
        date: e.date,
        items: e.items,
        checkedData: e.checkedData || 0
      });
      console.log(`✅ Effort saved for ${memberName} in family ${familyName}`);
    }

    console.log("✅ Tasks migrated!");

    // ---------- Routines ----------
    const routinesPath = path.join(process.cwd(), "data", "routines.json");
    const routinesData = loadJSON(routinesPath);
    console.log(`🟣 Migrating routines (${routinesData.length})`);

    for (let r of routinesData) {
      const familyName = r.family?.trim();
      const memberName = r.name?.trim();

      if (!familyName || !memberName) {
        console.log(`❌ Routine skipped — missing family or name: ${JSON.stringify(r)}`);
        continue;
      }

      const familyMembers = memberMap.get(familyName);
      if (!familyMembers) {
        console.log(`❌ Routine skipped — family not found in map: ${familyName}`);
        continue;
      }

      const memberDoc = familyMembers.get(memberName);
      if (!memberDoc) {
        console.log(`❌ Routine skipped — member not found: ${memberName} in family ${familyName}`);
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
