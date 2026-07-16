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

const populationFilter =
  document.getElementById("populationFilter");

const locationPerformanceBody =
  document.getElementById("locationPerformanceBody");

const minimumAppointmentsFilter =
  document.getElementById("minimumAppointmentsFilter");

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

function getPopulation(row) {
  const programType =
    cleanText(row.ProgramType).toLowerCase();

  if (programType.includes("adult")) {
    return "Adult";
  }

  if (
    programType.includes("youth") ||
    programType.includes("student")
  ) {
    return "Youth";
  }

  return "";
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

  const normalizedOutcome =
    savedOutcome
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  // Standardize all no-show variations.
  if (
    normalizedOutcome === "noshow" ||
    normalizedOutcome === "cancelnoshow" ||
    normalizedOutcome === "cancellednoshow" ||
    normalizedOutcome === "cancelednoshow"
  ) {
    return "Cancel-No Show";
  }

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
  const selectedFiscalYear =
    Number(fiscalYearFilter.value);

  return rows.filter(row => {
    const rawDate =
      String(row.Date || "").trim();

    if (!rawDate) {
      return false;
    }

    let year;
    let month;

    /*
      Apps Script ISO format:
      2026-07-02T04:00:00.000Z
    */
    const isoMatch =
      rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]);
    } else {
      /*
        Standard format:
        7/2/2026
      */
      const standardMatch =
        rawDate.match(
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
        );

      if (!standardMatch) {
        return false;
      }

      month = Number(standardMatch[1]);
      year = Number(standardMatch[3]);
    }

    const rowFiscalYear =
      month >= 7
        ? year
        : year - 1;

    return rowFiscalYear === selectedFiscalYear;
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

  let rows =
    getCoachingRows(
      filterByFiscalYear(
        allAttendanceRows
      )
    );

  // Filter by Population
  const selectedPopulation =
    populationFilter.value;

 if (selectedPopulation !== "Both") {
  rows = rows.filter(row =>
    getPopulation(row) === selectedPopulation
  );
}

  const regions =
    uniqueSorted(
      rows.map(row =>
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

  const selectedPopulation =
    populationFilter.value;

  const selectedRegion =
    regionFilter.value;

  let rows =
    getCoachingRows(
      filterByFiscalYear(
        allAttendanceRows
      )
    );

  if (selectedPopulation !== "Both") {
  rows = rows.filter(row =>
    getPopulation(row) === selectedPopulation
  );
}

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

  const selectedPopulation =
    populationFilter.value;

  const selectedRegion =
    regionFilter.value;

  const selectedCounty =
    countyFilter.value;

  let rows =
    getCoachingRows(
      filterByFiscalYear(
        allAttendanceRows
      )
    );

 if (selectedPopulation !== "Both") {
  rows = rows.filter(row =>
    getPopulation(row) === selectedPopulation
  );
}

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

function getCoachingRows(rows) {
  return rows.filter(row => {
    const payRule =
      cleanText(row.PayRule).toLowerCase();

    const programType =
      cleanText(row.ProgramType).toLowerCase();

    const isMeetingOrTraining =
      programType.includes("meeting") ||
      programType.includes("professional development") ||
      programType.includes("training") ||
      payRule.includes("meeting") ||
      payRule.includes("prof development") ||
      payRule.includes("training");

    return !isMeetingOrTraining;
  });
}

function getFilteredRows() {
  let rows =
    getCoachingRows(
      filterByFiscalYear(
        allAttendanceRows
      )
    );

  const selectedPopulation =
    populationFilter.value;

  const selectedRegion =
    regionFilter.value;

  const selectedCounty =
    countyFilter.value;

  const selectedLocation =
    locationFilter.value;

 if (selectedPopulation !== "Both") {
  rows = rows.filter(row =>
    getPopulation(row) === selectedPopulation
  );
}

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

function countAnyOutcome(rows, outcomes) {
  return rows.filter(row =>
    outcomes.includes(getOutcome(row))
  ).length;
}

function getSummary(rows) {
  const totalAppointments =
    rows.length;

  const completed =
    countAnyOutcome(rows, [
      "Completed"
    ]);

  const participantAbsent =
    countAnyOutcome(rows, [
      "Student Absent",
      "Participant Absent",
      "Adult Absent"
    ]);

  const cancelNoShow =
    countAnyOutcome(rows, [
      "Cancel-No Show",
      "No Show"
    ]);

  const participantCancelled =
    countAnyOutcome(rows, [
      "Student Cancelled",
      "Participant Cancelled",
      "Adult Cancelled"
    ]);

  const locationCancelled =
    countAnyOutcome(rows, [
      "School Cancelled",
      "Location Cancelled",
      "Agency Cancelled"
    ]);

  const locationClosed =
    countAnyOutcome(rows, [
      "School Closed",
      "Location Closed",
      "Agency Closed"
    ]);

  const technicalIssue =
    countAnyOutcome(rows, [
      "Technical Issue"
    ]);

  const other =
    countAnyOutcome(rows, [
      "Other"
    ]);

  const cancellationTotal =
    cancelNoShow +
    participantCancelled +
    locationCancelled;

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
    attendanceIssues,
    participantAbsent,
    cancelNoShow,
    participantCancelled,
    locationCancelled,
    locationClosed,
    technicalIssue,
    other,
    totalHours,

    completionRate:
      formatPercent(
        completed,
        totalAppointments
      ),

    absenceRate:
      formatPercent(
        participantAbsent,
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
  const summary = getSummary(rows);
  const selectedPopulation = populationFilter.value;

  let absentLabel = "Participant Absent";
  let cancelledLabel = "Participant Cancelled";
  let locationCancelledLabel = "Location Cancelled";

  if (selectedPopulation === "Youth") {
    absentLabel = "Student Absent";
    cancelledLabel = "Student Cancelled";
    locationCancelledLabel = "School Cancelled";
  }

  if (selectedPopulation === "Adult") {
    absentLabel = "Adult Absent";
    cancelledLabel = "Adult Cancelled";
    locationCancelledLabel = "Agency Cancelled";
  }

  summaryCards.innerHTML = `
    <div class="dashboard-card attendance-kpi neutral-kpi">
      <h3>Total Appointments</h3>
      <h1>${summary.totalAppointments}</h1>
    </div>

    <div class="dashboard-card attendance-kpi positive-kpi">
      <h3>Completed</h3>
      <h1>${summary.completed}</h1>
    </div>

    <div class="dashboard-card attendance-kpi warning-kpi">
      <h3>No Show</h3>
      <h1>${summary.cancelNoShow}</h1>
    </div>

    <div class="dashboard-card attendance-kpi warning-kpi">
      <h3>${absentLabel}</h3>
      <h1>${summary.participantAbsent}</h1>
    </div>

    <div class="dashboard-card attendance-kpi negative-kpi">
      <h3>${cancelledLabel}</h3>
      <h1>${summary.participantCancelled}</h1>
    </div>

    <div class="dashboard-card attendance-kpi negative-kpi">
      <h3>${locationCancelledLabel}</h3>
      <h1>${summary.locationCancelled}</h1>
    </div>

    <div class="dashboard-card attendance-kpi positive-kpi">
      <h3>Completion Rate</h3>
      <h1>${summary.completionRate}</h1>
    </div>

    <div class="dashboard-card attendance-kpi neutral-kpi">
      <h3>Total Paid Hours</h3>
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
  const summary =
    getSummary(rows);

  const selectedPopulation =
    populationFilter.value;

  let absentLabel = "Participant Absent";
  let cancelledLabel = "Participant Cancelled";
  let locationCancelledLabel = "Location Cancelled";
  let locationClosedLabel = "Location Closed";

  if (selectedPopulation === "Youth") {
    absentLabel = "Student Absent";
    cancelledLabel = "Student Cancelled";
    locationCancelledLabel = "School Cancelled";
    locationClosedLabel = "School Closed";
  }

  if (selectedPopulation === "Adult") {
    absentLabel = "Adult Absent";
    cancelledLabel = "Adult Cancelled";
    locationCancelledLabel = "Agency Cancelled";
    locationClosedLabel = "Agency Closed";
  }

  const outcomes = [
    ["Completed", summary.completed],
    [absentLabel, summary.participantAbsent],
    ["No Show", summary.cancelNoShow],
    [cancelledLabel, summary.participantCancelled],
    [locationCancelledLabel, summary.locationCancelled],
    [locationClosedLabel, summary.locationClosed],
    ["Technical Issue", summary.technicalIssue],
    ["Other", summary.other]
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
        ${outcomes.map(([label, total]) => `
          <tr>
            <td>${escapeHtml(label)}</td>
            <td>${total}</td>
            <td>${formatPercent(total, rows.length)}</td>
          </tr>
        `).join("")}
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

function renderQuickInsights(rows) {
  const summary = getSummary(rows);

  if (!rows.length) {
    quickInsights.innerHTML = `
      <p>No attendance data is available for the selected filters.</p>
    `;
    return;
  }

  const population =
    populationFilter.value === "Both"
      ? "both populations"
      : populationFilter.value.toLowerCase();

  const issueRate =
    formatPercent(
      summary.attendanceIssues,
      summary.totalAppointments
    );

  const averageHours =
    summary.totalAppointments === 0
      ? "0.00"
      : (
          summary.totalHours /
          summary.totalAppointments
        ).toFixed(2);

  let primaryIssue = "No attendance issues recorded";
  let primaryIssueTotal = 0;

  const issueOptions = [
    ["No Show", summary.cancelNoShow],
    ["Participant Absent", summary.participantAbsent],
    ["Participant Cancelled", summary.participantCancelled],
    ["Location Cancelled", summary.locationCancelled],
    ["Location Closed", summary.locationClosed],
    ["Technical Issue", summary.technicalIssue],
    ["Other", summary.other]
  ];

  issueOptions.forEach(([label, total]) => {
    if (total > primaryIssueTotal) {
      primaryIssue = label;
      primaryIssueTotal = total;
    }
  });

  quickInsights.innerHTML = `
    <div class="attendance-insight-grid">

      <div class="attendance-insight-item">
        <strong>${summary.completionRate}</strong>
        <span>Completion rate for ${population}</span>
      </div>

      <div class="attendance-insight-item">
        <strong>${issueRate}</strong>
        <span>Appointments with an attendance issue</span>
      </div>

      <div class="attendance-insight-item">
        <strong>${escapeHtml(primaryIssue)}</strong>
        <span>
          Most common issue
          ${primaryIssueTotal > 0 ? `(${primaryIssueTotal})` : ""}
        </span>
      </div>

      <div class="attendance-insight-item">
        <strong>${averageHours}</strong>
        <span>Average paid hours per appointment</span>
      </div>

    </div>
  `;
}

function renderLocationPerformance(rows) {
  const minimumAppointments =
    Number(minimumAppointmentsFilter.value || 1);

  const locationGroups = {};

  rows.forEach(row => {
    const location =
      cleanText(row.ReportLocation) ||
      "Unmapped Location";

    if (!locationGroups[location]) {
      locationGroups[location] = [];
    }

    locationGroups[location].push(row);
  });

  const locationResults =
    Object.entries(locationGroups)
      .map(([location, locationRows]) => {
        const summary =
          getSummary(locationRows);

        const populations =
          uniqueSorted(
            locationRows
              .map(row => getPopulation(row))
              .filter(Boolean)
          );

        let populationLabel = "Unknown";

        if (
          populations.includes("Youth") &&
          populations.includes("Adult")
        ) {
          populationLabel = "Both";
        } else if (populations.length === 1) {
          populationLabel = populations[0];
        }

        return {
          location,
          populationLabel,
          ...summary,
          issueRate:
            formatPercent(
              summary.attendanceIssues,
              summary.totalAppointments
            )
        };
      })
      .filter(result =>
        result.totalAppointments >= minimumAppointments
      )
      .sort((a, b) => {
        if (b.attendanceIssues !== a.attendanceIssues) {
          return b.attendanceIssues - a.attendanceIssues;
        }

        return b.totalAppointments - a.totalAppointments;
      });

  if (!locationResults.length) {
    locationPerformanceBody.innerHTML = `
      <tr>
        <td colspan="12">
          No locations meet the selected minimum appointment count.
        </td>
      </tr>
    `;

    return;
  }

  locationPerformanceBody.innerHTML =
    locationResults.map(result => `
      <tr>
        <td>
          ${escapeHtml(result.location)}
        </td>

        <td>
          ${escapeHtml(result.populationLabel)}
        </td>

        <td>
          ${result.totalAppointments}
        </td>

        <td>
          ${result.completed}
        </td>

        <td>
          ${result.cancelNoShow}
        </td>

        <td>
          ${result.participantAbsent}
        </td>

        <td>
          ${result.participantCancelled}
        </td>

        <td>
          ${result.locationCancelled}
        </td>

        <td>
          ${result.attendanceIssues}
        </td>

        <td>
          ${result.completionRate}
        </td>

        <td>
          ${result.issueRate}
        </td>

        <td>
          ${result.totalHours.toFixed(2)}
        </td>
      </tr>
    `).join("");
}

function renderDashboard() {
  const rows =
    getFilteredRows();

  renderSummaryCards(rows);
  renderQuickInsights(rows);
  renderOutcomeBreakdown(rows);
  renderReasonBreakdown(rows);
  renderLocationSummary(rows);
  renderAppointmentHistory(rows);
  renderLocationPerformance(rows);
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

populationFilter.addEventListener(
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

minimumAppointmentsFilter.addEventListener(
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

    console.table(
  allAttendanceRows.map(row => ({
    School: row.School,
    ReportLocation: row.ReportLocation,
    County: row.ReportCounty,
    Region: row.ReportRegion
  }))
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
