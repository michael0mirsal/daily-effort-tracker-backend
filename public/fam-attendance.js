import { submitAttendance } from "./attendanceService.js";

async function markAttendance(status) {
  try {
    const familyMemberId = localStorage.getItem("reportMemberId");
    const schoolMemberId = localStorage.getItem("reportMemberSchoolId");
    const reportClass = JSON.parse(localStorage.getItem("reportClass"));
    const family = JSON.parse(localStorage.getItem("currentFamily"));

    const now = new Date();

    await submitAttendance({
      familyMemberId,
      schoolMemberId,
      nurseryId: reportClass.nurseryId,
      classId: reportClass._id,
      status, // "bus" or "home"
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString("en-US", { hour12: true })
    });

    alert(`✅ Attendance marked as ${status.toUpperCase()}`);
  } catch (err) {
    console.error(err);
    alert("❌ Failed to mark attendance");
  }
}
