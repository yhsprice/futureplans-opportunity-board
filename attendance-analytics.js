const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();
showManagerLinksOnly();

/* =========================================================
   PAGE ELEMENTS
========================================================= */

const analyticsMessage =
  document.getElementById("analyticsMessage");

const summaryCards =
  document.getElementById("summaryCards");

const fiscalYearFilter =
  document.getElementById("fiscalYearFilter");

const regionFilter =
  document.getElementById("regionFilter");

const countyFilter =
  document.getElementById("countyFilter");

const locationFilter =
  document.getElementById("locationFilter");

const outcomeBreakdown =
  document.getElementById("outcomeBreakdown");

const reasonBreakdown =
  document.getElementById("reasonBreakdown");

const locationSummary =
  document.getElementById("locationSummary");

const attendanceTableBody =
  document.getElementById("attendanceTableBody");

/* =========================================================
   STORED PAGE DATA
========================================================= */

let allAttendanceRows = [];
let reportingLocations = [];

/* =========================================================
   JSONP
========================================================= */

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

/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseRecordDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(value) {
  const date = parseRecordDate(value);

  if (!date) {
    return "";
  }

  return date.toLocaleDateString();
}

function formatPercent(numerator, denominator) {
  if (!denominator) {
    return "0.0%";
  }

  return (
    (numerator / denominator) *
    100
  ).toFixed(1) + "%";
}

function getRowLocationName(row) {
  return cleanText(
    row.Location ||
    row.School ||
    row["School / Agency"] ||
    row["School/Agency"] ||
    row.SchoolName ||
    row["Location Name"] ||
    row.Account ||
    row.Agency
  );
}

function getRowCoachName(row) {
  return cleanText(
    row.CoachName ||
    row.UserName ||
    row.Name ||
    row.Coach
  );
}

function getRowHours(row) {
  const value = Number(
    row.PayHours ||
    row.Hours ||
    row.RevolutionTier ||
    row.PayTime ||
    0
  );

  return isNaN(value) ? 0 : value;
}

function getOutcome(row) {
  const savedOutcome = cleanText(
    row.AppointmentOutcome ||
    row.Outcome
  );

  if (savedOutcome) {
    return savedOutcome;
  }

  const historicalText = cleanText(
    [
      row.CancellationReason,
      row.OutcomeDetails,
      row.Notes
    ].join(" ")
  ).toLowerCase();

  if (
    historicalText.includes("no show") ||
    historicalText.includes("no-show") ||
    historicalText.includes("noshow")
  ) {
    return "Cancel-No Show";
  }

  /*
    Older records without any cancellation wording
    are treated as completed.
  */
  return "Completed";
}

function getReason(row) {
  return cleanText(
    row.CancellationReason ||
    row.OutcomeReason ||
    row.Reason
  );
}

function getDetails(row) {
  return cleanText(
    row.OutcomeDetails ||
    row.Details ||
    row.Notes
  );
}

/* =========================================================
   REPORTING LOCATION MATCHING
========================================================= */

function getLocationAliases(location) {
  const aliases = cleanText(location.Aliases)
    .split("|")
    .map(alias => cleanText(alias))
    .filter(Boolean);

  return [
    cleanText(location.DisplayName),
    ...aliases
  ];
}

function findReportingLocation(rawLocationName) {
  const normalizedRaw =
    normalizeText(rawLocationName);

  if (!normalizedRaw) {
    return null;
  }

  return reportingLocations.find(location => {
    return getLocationAliases(location)
      .some(alias =>
        normalizeText(alias) === normalizedRaw
      );
  }) || null;
}

function enrichAttendanceRows(rows) {
  return rows.map(row => {
    const rawLocation =
      getRowLocationName(row);

    const matchedLocation =
      findReportingLocation(rawLocation);

    return {
      ...row,

      ReportLocationID:
        matchedLocation
          ? cleanText(matchedLocation.LocationID)
          : "",

      ReportLocation:
        matchedLocation
          ? cleanText(matchedLocation.DisplayName)
          : rawLocation || "Unmapped Location",

      ReportCounty:
        matchedLocation
          ? cleanText(matchedLocation.County)
          : "Unmapped",

      ReportRegion:
        matchedLocation
          ? cleanText(matchedLocation.Region)
          : "Unmapped",

      ReportLocationType:
        matchedLocation
          ? cleanText(matchedLocation.LocationType)
          : ""
    };
  });
}

/* =========================================================
   FISCAL YEAR
========================================================= */

function getFiscalYearStart(date) {
  const month = date.getMonth();
  const year = date.getFullYear();

  return month >= 6
    ? year
    : year - 1;
}

function populateFiscalYears(rows) {
  const fiscalYears = new Set();

  rows.forEach(row => {
    const date =
      parseRecordDate(row.Date);

    if (date) {
      fiscalYears.add(
        getFiscalYearStart(date)
      );
    }
  });

  const currentDate = new Date();
  const currentFiscalYear =
    getFiscalYearStart(currentDate);

  fiscalYears.add(currentFiscalYear);

  const sortedYears =
    [...fiscalYears]
      .sort((a, b) => b - a);

  fiscalYearFilter.innerHTML =
    sortedYears
      .map(year => {
        const selected =
          year === currentFiscalYear
            ? "selected"
            : "";

        return `
          <option value="${year}" ${selected}>
            FY ${year}–${year + 1}
          </option>
        `;
      })
      .join("");
}

function filterByFiscalYear(rows) {
  const fiscalYear =
    Number(fiscalYearFilter.value);

  const startDate =
    new Date(
      fiscalYear,
      6,
      1,
      0,
      0,
      0
    );

  const endDate =
    new Date(
      fiscalYear + 1,
      5,
      30,
      23,
      59,
      59
    );

  return rows.filter(row => {
    const rowDate =
      parseRecordDate(row.Date);

    return (
      rowDate &&
      rowDate >= startDate &&
      rowDate <= endDate
    );
  });
}

/* =========================================================
   DROPDOWN HELPERS
========================================================= */

function uniqueSorted(values) {
  return [...new Set(
    values
      .map(value => cleanText(value))
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(b)
  );
}

function setDropdownOptions(
  element,
  values,
  allLabel,
  currentValue = ""
) {
  const options = [
    `<option value="">${allLabel}</option>`,
    ...values.map(value =>
      `<option value="${escapeHtml(value)}">
        ${escapeHtml(value)}
      </option>`
    )
  ];

  element.innerHTML =
    options.join("");

  if (values.includes(currentValue)) {
    element.value = currentValue;
  }
}

function populateRegionFilter() {
  const currentValue =
    regionFilter.value;

  const fiscalRows =
    filterByFiscalYear(
      allAttendanceRows
    );

  const regions =
    uniqueSorted(
      fiscalRows.map(row =>
        row.ReportRegion
      )
    );

  setDropdownOptions(
    regionFilter,
    regions,
    "All Regions",
    currentValue
  );
}

function populateCountyFilter() {
  const currentValue =
    countyFilter.value;

  const selectedRegion =
    regionFilter.value;

  let rows =
    filterByFiscalYear(
      allAttendanceRows
    );

  if (selectedRegion) {
    rows = rows.filter(row =>
      row.ReportRegion === selectedRegion
    );
  }

  const counties =
    uniqueSorted(
      rows.map(row =>
        row.ReportCounty
      )
    );

  setDropdownOptions(
    countyFilter,
    counties,
    "All Counties",
    currentValue
  );
}

function populateLocationFilter() {
  const currentValue =
    locationFilter.value;

  const selectedRegion =
    regionFilter.value;

  const selectedCounty =
    countyFilter.value;

  let rows =
    filterByFiscalYear(
      allAttendanceRows
    );

  if (selectedRegion) {
    rows = rows.filter(row =>
      row.ReportRegion === selectedRegion
    );
  }

  if (selectedCounty) {
    rows = rows.filter(row =>
      row.ReportCounty === selectedCounty
    );
  }

  const locations =
    uniqueSorted(
      rows.map(row =>
        row.ReportLocation
      )
    );

  setDropdownOptions(
    locationFilter,
    locations,
    "All Locations",
    currentValue
  );
}

/* =========================================================
   FILTER CURRENT RECORDS
========================================================= */

function getFilteredRows() {
  let rows =
    filterByFiscalYear(
      allAttendanceRows
    );

  rows = rows.filter(row => {
  const payRule = cleanText(row.PayRule);
  const programType = cleanText(row.ProgramType);
  const school = cleanText(row.School);

  const isMeetingOrTraining =
    programType === "Meeting" ||
    programType === "Professional Development" ||
    payRule === "Meeting" ||
    payRule === "Prof Development";

  return !isMeetingOrTraining && school !== "";
});

  rows = rows.filter(row => {
  const payRule = cleanText(row.PayRule);
  const programType = cleanText(row.ProgramType);

  return (
    payRule === "Regular Coaching" ||
    programType === "Youth" ||
    programType === "Adult"
  );
});

  const selectedRegion =
    regionFilter.value;

  const selectedCounty =
    countyFilter.value;

  const selectedLocation =
    locationFilter.value;

  if (selectedRegion) {
    rows = rows.filter(row =>
      row.ReportRegion === selectedRegion
    );
  }

  if (selectedCounty) {
    rows = rows.filter(row =>
      row.ReportCounty === selectedCounty
    );
  }

  if (selectedLocation) {
    rows = rows.filter(row =>
      row.ReportLocation === selectedLocation
    );
  }

  return rows;
}

/* =========================================================
   SUMMARY CALCULATIONS
========================================================= */

function countOutcome(rows, outcome) {
  return rows.filter(row =>
    getOutcome(row) === outcome
  ).length;
}

function getSummary(rows) {
  const totalAppointments =
    rows.length;

  const cancelNoShow =
  countOutcome(
    rows,
    "Cancel-No Show"
  );

  const completed =
    countOutcome(
      rows,
      "Completed"
    );

  const studentAbsent =
    countOutcome(
      rows,
      "Student Absent"
    );

  const studentCancelled =
    countOutcome(
      rows,
      "Student Cancelled"
    );

  const schoolCancelled =
    countOutcome(
      rows,
      "School Cancelled"
    );

  const schoolClosed =
    countOutcome(
      rows,
      "School Closed"
    );

  const technicalIssue =
    countOutcome(
      rows,
      "Technical Issue"
    );

  const other =
    countOutcome(
      rows,
      "Other"
    );

  const cancellationTotal =
    studentCancelled +
    schoolCancelled;

  const attendanceIssues =
  totalAppointments -
  completed;

  const totalHours =
    rows.reduce(
      (total, row) =>
        total + getRowHours(row),
      0
    );

  return {
    totalAppointments,
    completed,
    studentAbsent,
    cancelNoShow,
    studentCancelled,
    schoolCancelled,
    schoolClosed,
    technicalIssue,
    other,
    cancellationTotal,
    attendanceIssues,
    totalHours,

    completionRate:
      formatPercent(
        completed,
        totalAppointments
      ),

    absenceRate:
      formatPercent(
        studentAbsent,
        totalAppointments
      ),

    cancellationRate:
      formatPercent(
        cancellationTotal,
        totalAppointments
      )
  };
}

/* =========================================================
   KPI CARDS
========================================================= */

function renderSummaryCards(rows) {
  const summary =
    getSummary(rows);

  summaryCards.innerHTML = `
    <div class="dashboard-card">
      <h3>Total Appointments</h3>
      <h1>${summary.totalAppointments}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Completed</h3>
      <h1>${summary.completed}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Attendance Issues</h3>
      <h1>${summary.attendanceIssues}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Student Absent</h3>
      <h1>${summary.studentAbsent}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Cancel-No Show</h3>
      <h1>${summary.cancelNoShow}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Student Cancelled</h3>
      <h1>${summary.studentCancelled}</h1>
    </div>

    <div class="dashboard-card">
      <h3>School Cancelled</h3>
      <h1>${summary.schoolCancelled}</h1>
    </div>

    <div class="dashboard-card">
      <h3>School Closed</h3>
      <h1>${summary.schoolClosed}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Technical Issue</h3>
      <h1>${summary.technicalIssue}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Other</h3>
      <h1>${summary.other}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Completion Rate</h3>
      <h1>${summary.completionRate}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Absence Rate</h3>
      <h1>${summary.absenceRate}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Cancellation Rate</h3>
      <h1>${summary.cancellationRate}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Total Hours</h3>
      <h1>${summary.totalHours.toFixed(2)}</h1>
    </div>
  `;
}

/* =========================================================
   OUTCOME BREAKDOWN
========================================================= */

function groupByOutcome(rows) {
  const totals = {};

  rows.forEach(row => {
    const outcome =
      getOutcome(row);

    totals[outcome] =
      (totals[outcome] || 0) + 1;
  });

  return totals;
}

function renderOutcomeBreakdown(rows) {
  const totals =
    groupByOutcome(rows);

  const outcomes = [
    "Completed",
    "Student Absent",
    "Cancel-No Show",
    "Student Cancelled",
    "School Cancelled",
    "School Closed",
    "Technical Issue",
    "Other"
  ];

  outcomeBreakdown.innerHTML = `
    <table class="modern-table">
      <thead>
        <tr>
          <th>Outcome</th>
          <th>Total</th>
          <th>Percent</th>
        </tr>
      </thead>

      <tbody>
        ${outcomes.map(outcome => {
          const total =
            totals[outcome] || 0;

          return `
            <tr>
              <td>${escapeHtml(outcome)}</td>
              <td>${total}</td>
              <td>${formatPercent(total, rows.length)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

/* =========================================================
   REASON BREAKDOWN
========================================================= */

function groupByReason(rows) {
  const totals = {};

  rows.forEach(row => {
    if (getOutcome(row) === "Completed") {
      return;
    }

    const reason =
      getReason(row) ||
      "No Reason Entered";

    totals[reason] =
      (totals[reason] || 0) + 1;
  });

  return totals;
}

function renderReasonBreakdown(rows) {
  const totals =
    groupByReason(rows);

  const sortedReasons =
    Object.entries(totals)
      .sort((a, b) => b[1] - a[1]);

  if (sortedReasons.length === 0) {
    reasonBreakdown.innerHTML =
      "<p>No attendance reasons recorded for this selection.</p>";

    return;
  }

  reasonBreakdown.innerHTML = `
    <table class="modern-table">
      <thead>
        <tr>
          <th>Reason</th>
          <th>Total</th>
        </tr>
      </thead>

      <tbody>
        ${sortedReasons.map(([reason, total]) => `
          <tr>
            <td>${escapeHtml(reason)}</td>
            <td>${total}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* =========================================================
   LOCATION SUMMARY
========================================================= */

function getMostCommonReason(rows) {
  const totals =
    groupByReason(rows);

  const sorted =
    Object.entries(totals)
      .sort((a, b) => b[1] - a[1]);

  return sorted.length
    ? `${sorted[0][0]} (${sorted[0][1]})`
    : "None recorded";
}

function getLatestIssueDate(rows) {
  const issueDates =
    rows
      .filter(row =>
        getOutcome(row) !== "Completed"
      )
      .map(row =>
        parseRecordDate(row.Date)
      )
      .filter(Boolean)
      .sort((a, b) => b - a);

  return issueDates.length
    ? issueDates[0].toLocaleDateString()
    : "None";
}

function renderLocationSummary(rows) {
  const selectedLocation =
    locationFilter.value;

  if (!selectedLocation) {
    locationSummary.innerHTML = `
      <p>
        Choose a location above to see its individual attendance summary.
      </p>
    `;

    return;
  }

  const summary =
    getSummary(rows);

  const locationRecord =
    reportingLocations.find(location =>
      cleanText(location.DisplayName) ===
      selectedLocation
    );

  locationSummary.innerHTML = `
    <h2>${escapeHtml(selectedLocation)}</h2>

    <p>
      <strong>Location Type:</strong>
      ${escapeHtml(
        locationRecord
          ? locationRecord.LocationType
          : ""
      )}
    </p>

    <p>
      <strong>County:</strong>
      ${escapeHtml(
        locationRecord
          ? locationRecord.County
          : ""
      )}
    </p>

    <p>
      <strong>Region:</strong>
      ${escapeHtml(
        locationRecord
          ? locationRecord.Region
          : ""
      )}
    </p>

    <hr>

    <p>
      <strong>Total Appointments:</strong>
      ${summary.totalAppointments}
    </p>

    <p>
      <strong>Completed:</strong>
      ${summary.completed}
    </p>

    <p>
      <strong>Attendance Issues:</strong>
      ${summary.attendanceIssues}
    </p>

    <p>
      <strong>Completion Rate:</strong>
      ${summary.completionRate}
    </p>

    <p>
      <strong>Absence Rate:</strong>
      ${summary.absenceRate}
    </p>

    <p>
      <strong>Cancellation Rate:</strong>
      ${summary.cancellationRate}
    </p>

    <p>
      <strong>Total Hours:</strong>
      ${summary.totalHours.toFixed(2)}
    </p>

    <p>
      <strong>Most Common Reason:</strong>
      ${escapeHtml(
        getMostCommonReason(rows)
      )}
    </p>

    <p>
      <strong>Latest Attendance Issue:</strong>
      ${escapeHtml(
        getLatestIssueDate(rows)
      )}
    </p>
  `;
}

/* =========================================================
   APPOINTMENT HISTORY
========================================================= */

function renderAppointmentHistory(rows) {
  const sortedRows =
    [...rows].sort((a, b) => {
      const dateA =
        parseRecordDate(a.Date);

      const dateB =
        parseRecordDate(b.Date);

      return (
        (dateB ? dateB.getTime() : 0) -
        (dateA ? dateA.getTime() : 0)
      );
    });

  if (sortedRows.length === 0) {
    attendanceTableBody.innerHTML = `
      <tr>
        <td colspan="8">
          No appointments found for this selection.
        </td>
      </tr>
    `;

    return;
  }

  attendanceTableBody.innerHTML =
    sortedRows.map(row => `
      <tr>
        <td>${escapeHtml(formatDate(row.Date))}</td>

        <td>
          ${escapeHtml(row.ReportLocation)}
        </td>

        <td>
          ${escapeHtml(getRowCoachName(row))}
        </td>

        <td>
          ${escapeHtml(
            cleanText(row.ProgramType)
          )}
        </td>

        <td>
          ${getRowHours(row).toFixed(2)}
        </td>

        <td>
          ${escapeHtml(getOutcome(row))}
        </td>

        <td>
          ${escapeHtml(getReason(row))}
        </td>

        <td>
          ${escapeHtml(getDetails(row))}
        </td>
      </tr>
    `).join("");
}

/* =========================================================
   RENDER CURRENT PAGE
========================================================= */

function renderDashboard() {
  const rows =
    getFilteredRows();

  renderSummaryCards(rows);
  renderOutcomeBreakdown(rows);
  renderReasonBreakdown(rows);
  renderLocationSummary(rows);
  renderAppointmentHistory(rows);
}

/* =========================================================
   FILTER EVENTS
========================================================= */

fiscalYearFilter.addEventListener(
  "change",
  function() {
    populateRegionFilter();
    populateCountyFilter();
    populateLocationFilter();
    renderDashboard();
  }
);

regionFilter.addEventListener(
  "change",
  function() {
    populateCountyFilter();
    populateLocationFilter();
    renderDashboard();
  }
);

countyFilter.addEventListener(
  "change",
  function() {
    populateLocationFilter();
    renderDashboard();
  }
);

locationFilter.addEventListener(
  "change",
  renderDashboard
);

/* =========================================================
   LOAD DATA
========================================================= */

async function loadAttendanceAnalytics() {
  analyticsMessage.style.display =
    "block";

  analyticsMessage.textContent =
    "Loading attendance data...";

  try {
    const [
      attendanceResponse,
      locationResponse
    ] = await Promise.all([
      jsonp(
        `${API_URL}?action=getAttendanceAnalytics`
      ),

      jsonp(
        `${API_URL}?action=getReportingLocations`
      )
    ]);

    if (
      attendanceResponse &&
      attendanceResponse.success === false
    ) {
      throw new Error(
        attendanceResponse.message ||
        "Attendance records could not be loaded."
      );
    }

    if (
      locationResponse &&
      locationResponse.success === false
    ) {
      throw new Error(
        locationResponse.message ||
        "Reporting locations could not be loaded."
      );
    }

    if (!Array.isArray(attendanceResponse)) {
      throw new Error(
        "Attendance records were not returned as a list."
      );
    }

    if (!Array.isArray(locationResponse)) {
      throw new Error(
        "Reporting locations were not returned as a list."
      );
    }

    reportingLocations =
      locationResponse;

    allAttendanceRows =
      enrichAttendanceRows(
        attendanceResponse
      );

    console.log(
      "Attendance records:",
      allAttendanceRows
    );

    console.log(
      "Reporting locations:",
      reportingLocations
    );

    populateFiscalYears(
      allAttendanceRows
    );

    populateRegionFilter();
    populateCountyFilter();
    populateLocationFilter();

    analyticsMessage.style.display =
      "none";

    renderDashboard();

  } catch (error) {
    console.error(
      "Attendance Analytics error:",
      error
    );

    analyticsMessage.style.display =
      "block";

    analyticsMessage.textContent =
      `Something went wrong: ${
        error.message || "Unknown error"
      }`;
  }
}

loadAttendanceAnalytics();
