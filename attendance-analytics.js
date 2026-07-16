const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();
showManagerLinksOnly();

const analyticsMessage =
  document.getElementById("analyticsMessage");

const summaryCards =
  document.getElementById("summaryCards");

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "attendanceJsonp_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000);

    const script = document.createElement("script");

    window[callbackName] = function(data) {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.src =
      url +
      "&callback=" +
      encodeURIComponent(callbackName);

    script.onerror = function(event) {
      delete window[callbackName];
      script.remove();
      reject(event);
    };

    document.body.appendChild(script);
  });
}

function countOutcome(rows, outcome) {
  return rows.filter(row =>
    String(row.AppointmentOutcome || "").trim() === outcome
  ).length;
}

async function loadAttendanceAnalytics() {
  analyticsMessage.style.display = "block";
  analyticsMessage.textContent =
    "Loading attendance data...";

  try {
    const rows = await jsonp(
      `${API_URL}?action=getAttendanceAnalytics`
    );

    console.log("Attendance analytics rows:", rows);

    if (rows && rows.success === false) {
      throw new Error(
        rows.message || "Apps Script returned an error."
      );
    }

    if (!Array.isArray(rows)) {
      throw new Error(
        "Attendance Analytics did not return a list of rows."
      );
    }

    const fiscalYear =
      document.getElementById("fiscalYearFilter").value;

    /*
      Fiscal-year filtering will be added next.
      For now, all returned rows are included.
    */
    const filteredRows = [...rows];

    const totalAppointments = filteredRows.length;

    const completed =
      countOutcome(filteredRows, "Completed");

    const absent =
      countOutcome(filteredRows, "Student Absent");

    const studentCancelled =
      countOutcome(filteredRows, "Student Cancelled");

    const schoolCancelled =
      countOutcome(filteredRows, "School Cancelled");

    const schoolClosed =
      countOutcome(filteredRows, "School Closed");

    const technical =
      countOutcome(filteredRows, "Technical Issue");

    const other =
      countOutcome(filteredRows, "Other");

    const completionRate =
      totalAppointments === 0
        ? "0.0"
        : (
            (completed / totalAppointments) *
            100
          ).toFixed(1);

    const absenceRate =
      totalAppointments === 0
        ? "0.0"
        : (
            (absent / totalAppointments) *
            100
          ).toFixed(1);

    analyticsMessage.style.display = "none";

    summaryCards.innerHTML = `
      <div class="dashboard-card">
        <h3>Total Appointments</h3>
        <h1>${totalAppointments}</h1>
      </div>

      <div class="dashboard-card">
        <h3>Completed</h3>
        <h1>${completed}</h1>
      </div>

      <div class="dashboard-card">
        <h3>Student Absent</h3>
        <h1>${absent}</h1>
      </div>

      <div class="dashboard-card">
        <h3>Student Cancelled</h3>
        <h1>${studentCancelled}</h1>
      </div>

      <div class="dashboard-card">
        <h3>School Cancelled</h3>
        <h1>${schoolCancelled}</h1>
      </div>

      <div class="dashboard-card">
        <h3>School Closed</h3>
        <h1>${schoolClosed}</h1>
      </div>

      <div class="dashboard-card">
        <h3>Technical</h3>
        <h1>${technical}</h1>
      </div>

      <div class="dashboard-card">
        <h3>Other</h3>
        <h1>${other}</h1>
      </div>

      <div class="dashboard-card">
        <h3>Completion Rate</h3>
        <h1>${completionRate}%</h1>
      </div>

      <div class="dashboard-card">
        <h3>Absence Rate</h3>
        <h1>${absenceRate}%</h1>
      </div>
    `;

  } catch (error) {
    console.error(
      "Attendance Analytics error:",
      error
    );

    analyticsMessage.style.display = "block";
    analyticsMessage.textContent =
      `Something went wrong: ${
        error.message || "Unknown error"
      }`;
  }
}

loadAttendanceAnalytics();
