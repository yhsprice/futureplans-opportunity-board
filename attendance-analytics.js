const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();
showManagerLinksOnly();

const analyticsMessage =
  document.getElementById("analyticsMessage");

async function loadAttendanceAnalytics() {
  analyticsMessage.textContent =
    "Loading attendance data...";

  try {
    const response = await fetch(
      `${API_URL}?action=getAttendanceAnalytics`
    );

    const rows = await response.json();

    console.log("Attendance analytics rows:", rows);

    if (!Array.isArray(rows)) {
      throw new Error(
        "Attendance Analytics did not return a list of rows."
      );
    }

    analyticsMessage.textContent =
      `${rows.length} attendance record(s) loaded.`;

  } catch (error) {
    console.error(
      "Attendance Analytics error:",
      error
    );

    analyticsMessage.textContent =
      "Something went wrong loading attendance data.";
  }
}

loadAttendanceAnalytics();
