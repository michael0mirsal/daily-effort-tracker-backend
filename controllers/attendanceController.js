// controllers/attendanceController.js
import { markAttendance } from "../services/attendanceService.js";
import { logInfo, logError } from "../utils/logger.js";
import Attendance from "../models/Attendance.js";
import Notification from "../models/Notification.js";

// ✅ UPDATE attendance (professional version)
export const updateAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.id;
    const updates = req.body;

    // 1️⃣ Get OLD attendance (required for comparison)
    const oldAttendance = await Attendance.findById(attendanceId);
    if (!oldAttendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    const notifications = [];

    // 2️⃣ Detect STATUS change
    if (
      Object.prototype.hasOwnProperty.call(updates, "status") &&
      updates.status !== oldAttendance.status
    ) {
      notifications.push({
        type: "STATUS_CHANGED",
        message: `Status changed from "${oldAttendance.status}" to "${updates.status}"`,
      });
    }

    // 3️⃣ Detect NOTES change (even empty string)
    if (
      Object.prototype.hasOwnProperty.call(updates, "notes") &&
      updates.notes !== oldAttendance.notes
    ) {
      notifications.push({
        type: "NOTE_CHANGED",
        message: updates.notes
          ? `Note updated: "${updates.notes}"`
          : "Note was cleared",
      });
    }

    // 4️⃣ Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      updates,
      { new: true }
    );

    // 5️⃣ Save notifications (if any)
    for (const n of notifications) {
      await Notification.create({
        user: updatedAttendance.markedBy, // who should receive it
        attendance: updatedAttendance._id,
        type: n.type,
        message: n.message,
      });
    }

    // 6️⃣ Response
    res.status(200).json({
      success: true,
      data: updatedAttendance,
      notificationsCreated: notifications.length,
    });
  } catch (err) {
    logError("Error updating attendance", err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ✅ CREATE Attendance
export const createAttendance = async (req, res) => {
  try {
    logInfo("CREATE Attendance request received", { body: req.body });

    // Call the service
    const attendance = await markAttendance(req.body);

    logInfo("Attendance successfully created", { attendanceId: attendance._id });

    res.status(201).json({ success: true, data: attendance });
  } catch (err) {
    logError("Attendance error", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ GET attendance by class and date
export const getAttendanceByClass = async (req, res) => {
  try {
    const { classId, date } = req.query;

    if (!classId || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing classId or date"
      });
    }

    const attendanceList = await Attendance.find({
      class: classId,
      date
    })
      .populate("schoolMember")
      .populate("markedBy", "name");

    res.status(200).json({
      success: true,
      data: attendanceList
    });
  } catch (err) {
    logError("Error fetching attendance", err);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};



// ✅ DELETE attendance
export const deleteAttendance = async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Attendance deleted" });
  } catch (err) {
    logError("Error deleting attendance", err);
    res.status(400).json({ success: false, message: err.message });
  }
};
