import express from "express";
import {
  createAttendance,
  getAttendanceByClass,
  updateAttendance,
  deleteAttendance
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/", createAttendance);
router.get("/", getAttendanceByClass); // query params: classId, date
router.put("/:id", updateAttendance);
router.delete("/:id", deleteAttendance);

export default router;
