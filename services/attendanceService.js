import Attendance from "../models/Attendance.js";

export const markAttendance = async ({ schoolMember, classId, date, status, checkInTime, leaveTime, markedBy, notes }) => {
  return await Attendance.create({
    schoolMember,
    class: classId,
    date,
    status,
    checkInTime,
    leaveTime,
    markedBy,
    notes
  });
};

export const fetchAttendance = async (classId, date) => {
  return await Attendance.find({ class: classId, date })
    .populate("schoolMember", "name")
    .populate("markedBy", "name");
};
