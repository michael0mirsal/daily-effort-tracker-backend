// controllers/attendanceController.js
import { io } from "../server.js";
import { markAttendance } from "../services/attendanceService.js";
import { logInfo, logError } from "../utils/logger.js";
import Attendance from "../models/Attendance.js";
import Notification from "../models/Notification.js";
import AttendanceHistory from "../models/AttendanceHistory.js";
import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

// ✅ UPDATE attendance (professional version)
export const updateAttendance = async (req, res) => {
  try {
    const attendanceId = req.params.id;
    const updates = req.body;

    // 1️⃣ Load old attendance
    const oldAttendance = await Attendance.findById(attendanceId);
    if (!oldAttendance) {
      return res.status(404).json({ success: false, message: "Attendance not found" });
    }

    const notifications = [];
    const changes = [];

    // 2️⃣ Track STATUS change
    if (Object.prototype.hasOwnProperty.call(updates, "status") &&
        updates.status !== oldAttendance.status) {
      changes.push({
        field: "status",
        oldValue: oldAttendance.status,
        newValue: updates.status,
      });
      notifications.push({
        type: "STATUS_CHANGED",
        message: `Status changed from "${oldAttendance.status}" to "${updates.status}"`,
      });
    }

    // 3️⃣ Track NOTES change
    if (Object.prototype.hasOwnProperty.call(updates, "notes") &&
        updates.notes !== oldAttendance.notes) {
      changes.push({
        field: "notes",
        oldValue: oldAttendance.notes,
        newValue: updates.notes,
      });
      notifications.push({
        type: "NOTE_CHANGED",
        message: updates.notes
          ? `Note updated: "${updates.notes}"`
          : "Note was cleared",
      });
    }

    // 4️⃣ Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(attendanceId, updates, { new: true });

    // 5️⃣ Save history
    if (changes.length > 0) {
      await AttendanceHistory.create({
        attendance: updatedAttendance._id,
        changedBy: updatedAttendance.markedBy,
        changes,
      });
    }

    // 6️⃣ Save notifications AND emit via Socket.IO
    if (notifications.length > 0) {
      for (const n of notifications) {
        const savedNotification = await Notification.create({
          user: updatedAttendance.schoolMember, // kid / family
          attendance: updatedAttendance._id,
          type: n.type,
          message: n.message,
        });

        // ✅ Emit to the correct socket room (schoolMemberId)
        io.to(updatedAttendance.schoolMember.toString()).emit("notification", savedNotification);

        // ✅ Send web push to all saved subscriptions
    const payload = JSON.stringify({
      title: "Daily Effort Tracker",
      message: n.message,
      url: "/choose.html"
    });

    const subs = await PushSubscription.find({ user: updatedAttendance.schoolMember });
  await Promise.all(subs.map(sub =>
    webpush.sendNotification(sub.toObject(), payload).catch(err => {
      console.error("Push failed, removing subscription:", sub.endpoint, err);
      return PushSubscription.deleteOne({ _id: sub._id });
    })
  ));
      }
    }

    res.status(200).json({
      success: true,
      data: updatedAttendance,
      changesRecorded: changes.length,
      notificationsCreated: notifications.length,
    });

  } catch (err) {
    console.error("Error updating attendance:", err);
    res.status(400).json({ success: false, message: err.message });
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
