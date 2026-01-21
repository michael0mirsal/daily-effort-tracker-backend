import express from "express";
import {
  createAttendance,
  getAttendanceByClass,
  updateAttendance,
  deleteAttendance
} from "../controllers/attendanceController.js";

const router = express.Router();

/* TEST ROUTE */
router.post("/attendance", async (req, res) => {
  console.log("🔥 ATTENDANCE ROUTE HIT");
  console.log("BODY:", req.body);

  res.json({ ok: true });
});

/* REAL ROUTES */
router.post("/", createAttendance);
router.get("/", getAttendanceByClass); // query params: classId, date
router.put("/:id", updateAttendance);
router.delete("/:id", deleteAttendance);

export default router;
