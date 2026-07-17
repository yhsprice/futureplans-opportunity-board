const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();

const copInput = document.getElementById("cop");
const copSuggestions = document.getElementById("copSuggestions");
const opportunityRows = document.getElementById("opportunityRows");
const batchMessage = document.getElementById("batchMessage");
const submitAllButton = document.getElementById("submitAllButton");

let cops = [];
let opportunityRowNumber = 0;

loadCOPList();

/*
--------------------------------------------------
COP AUTOCOMPLETE
--------------------------------------------------
*/

function loadCOPList() {
  fetch(`${API_URL}?action=getCOPList`)
    .then(response => response.json())
    .then(data => {
      cops = Array.isArray(data) ? data : [];
    })
    .catch(error => {
      console.error("Could not load COP list:", error);
    });
}

function showCOPSuggestions() {
  const typed = copInput.value.trim().toLowerCase();

  copSuggestions.innerHTML = "";

  if (!typed) {
    copSuggestions.style.display = "none";
    return;
  }

  const matches = cops
    .filter(name =>
      String(name || "")
        .toLowerCase()
        .includes(typed)
    )
    .sort((a, b) =>
      String(a).localeCompare(String(b))
    )
    .slice(0, 8);

  if (!matches.length) {
    copSuggestions.style.display = "none";
    return;
  }

  matches.forEach(name => {
    const item = document.createElement("div");

    item.className = "autocomplete-item";
    item.textContent = name;

    item.addEventListener("click", () => {
      copInput.value = name;
      copSuggestions.style.display = "none";
    });

    copSuggestions.appendChild(item);
  });

  copSuggestions.style.display = "block";
}

copInput.addEventListener("input", showCOPSuggestions);

document.addEventListener("click", event => {
  if (!event.target.closest(".autocomplete")) {
    copSuggestions.style.display = "none";
  }
});

/*
--------------------------------------------------
OPPORTUNITY ROWS
--------------------------------------------------
*/

function addOpportunityRow(values = {}) {
  opportunityRowNumber++;

  const row = document.createElement("tr");

  row.className = "opportunity-entry-row";
  row.dataset.rowNumber = opportunityRowNumber;

  row.innerHTML = `
    <td>
      <input
        type="text"
        class="row-school"
        placeholder="School or location"
        value="${escapeHtml(values.school || "")}">
    </td>

    <td>
      <input
        type="time"
        class="row-start-time"
        value="${escapeHtml(values.startTime || "")}">
    </td>

    <td>
      <input
        type="time"
        class="row-end-time"
        value="${escapeHtml(values.endTime || "")}">
    </td>

    <td>
      <input
        type="number"
        class="row-coaches-needed"
        min="1"
        step="1"
        value="${escapeHtml(values.coachesNeeded || "1")}">
    </td>

    <td>
      <span class="row-status">Not submitted</span>
    </td>

    <td>
      <button
        type="button"
        class="remove-row-button"
        title="Remove this row"
        onclick="removeOpportunityRow(this)">
        ×
      </button>
    </td>
  `;

  opportunityRows.appendChild(row);

  const schoolInput = row.querySelector(".row-school");

  if (schoolInput) {
    schoolInput.focus();
  }

  updateRowCountMessage();
}

function copyPreviousRow() {
  const rows = getOpportunityRowElements();

  if (!rows.length) {
    addOpportunityRow();
    return;
  }

  const lastRow = rows[rows.length - 1];

  const values = {
    school: lastRow.querySelector(".row-school").value.trim(),
    startTime: lastRow.querySelector(".row-start-time").value,
    endTime: lastRow.querySelector(".row-end-time").value,
    coachesNeeded:
      lastRow.querySelector(".row-coaches-needed").value || "1"
  };

  addOpportunityRow(values);
}

function removeOpportunityRow(button) {
  const row = button.closest("tr");

  if (row) {
    row.remove();
  }

  if (!getOpportunityRowElements().length) {
    addOpportunityRow();
  }

  updateRowCountMessage();
}

function clearOpportunityRows() {
  const hasEnteredData = getOpportunityRowElements().some(row => {
    const school = row.querySelector(".row-school").value.trim();
    const startTime = row.querySelector(".row-start-time").value;
    const endTime = row.querySelector(".row-end-time").value;

    return school || startTime || endTime;
  });

  if (
    hasEnteredData &&
    !confirm("Clear all location and time rows?")
  ) {
    return;
  }

  opportunityRows.innerHTML = "";
  opportunityRowNumber = 0;

  addOpportunityRow();
  addOpportunityRow();
  addOpportunityRow();

  batchMessage.textContent = "";
  batchMessage.className = "batch-message";
}

function getOpportunityRowElements() {
  return Array.from(
    opportunityRows.querySelectorAll(".opportunity-entry-row")
  );
}

function getRowData(row) {
  return {
    school: row.querySelector(".row-school").value.trim(),
    startTime: row.querySelector(".row-start-time").value,
    endTime: row.querySelector(".row-end-time").value,
    coachesNeeded:
      row.querySelector(".row-coaches-needed").value
  };
}

function isBlankRow(rowData) {
  return (
    !rowData.school &&
    !rowData.startTime &&
    !rowData.endTime
  );
}

function updateRowCountMessage() {
  const rowCount = getOpportunityRowElements().length;

  batchMessage.textContent =
    `${rowCount} entr${rowCount === 1 ? "y" : "ies"} available.`;

  batchMessage.className = "batch-message";
}

/*
--------------------------------------------------
VALIDATION
--------------------------------------------------
*/

function validateSharedFields() {
  const date = document.getElementById("date").value;
  const programType =
    document.getElementById("programType").value;
  const fund = document.getElementById("fund").value;
  const cop = document.getElementById("cop").value.trim();

  if (!date) {
    alert("Please select a date.");
    document.getElementById("date").focus();
    return false;
  }

  if (!programType) {
    alert("Please select a program type.");
    document.getElementById("programType").focus();
    return false;
  }

  if (!fund) {
    alert("Please select a fund.");
    document.getElementById("fund").focus();
    return false;
  }

  if (!cop) {
    alert("Please enter the COP.");
    document.getElementById("cop").focus();
    return false;
  }

  return true;
}

function validateOpportunityRows(rows) {
  let valid = true;
  let completedRowCount = 0;

  rows.forEach((row, index) => {
    clearRowError(row);

    const rowData = getRowData(row);

    if (isBlankRow(rowData)) {
      return;
    }

    completedRowCount++;

    if (!rowData.school) {
      markRowError(
        row,
        `Row ${index + 1}: Enter a school or location.`
      );

      valid = false;
      return;
    }

    if (!rowData.startTime) {
      markRowError(
        row,
        `Row ${index + 1}: Enter a start time.`
      );

      valid = false;
      return;
    }

    if (!rowData.endTime) {
      markRowError(
        row,
        `Row ${index + 1}: Enter an end time.`
      );

      valid = false;
      return;
    }

    if (
      !rowData.coachesNeeded ||
      Number(rowData.coachesNeeded) < 1
    ) {
      markRowError(
        row,
        `Row ${index + 1}: Enter the number of coaches needed.`
      );

      valid = false;
      return;
    }

    if (rowData.endTime <= rowData.startTime) {
      markRowError(
        row,
        `Row ${index + 1}: End time must be after start time.`
      );

      valid = false;
    }
  });

  if (!completedRowCount) {
    alert("Please complete at least one opportunity row.");
    return false;
  }

  if (!valid) {
    batchMessage.textContent =
      "Please correct the highlighted rows.";

    batchMessage.className =
      "batch-message batch-message-error";
  }

  return valid;
}

function markRowError(row, message) {
  row.classList.add("row-has-error");

  const status = row.querySelector(".row-status");

  status.textContent = message;
  status.className = "row-status row-status-error";
}

function clearRowError(row) {
  row.classList.remove("row-has-error");

  const status = row.querySelector(".row-status");

  status.textContent = "Not submitted";
  status.className = "row-status";
}

/*
--------------------------------------------------
BATCH SUBMISSION
--------------------------------------------------
*/

async function submitAllOpportunities() {
  if (!validateSharedFields()) {
    return;
  }

  const allRows = getOpportunityRowElements();

  if (!validateOpportunityRows(allRows)) {
    return;
  }

  const rowsToSubmit = allRows.filter(row => {
    return !isBlankRow(getRowData(row));
  });

  const sharedData = {
    date: document.getElementById("date").value,
    programType:
      document.getElementById("programType").value,
    fund: document.getElementById("fund").value,
    cop: document.getElementById("cop").value.trim(),
    notes: document.getElementById("notes").value.trim()
  };

  submitAllButton.disabled = true;
  submitAllButton.textContent = "Submitting...";

  batchMessage.textContent =
    `Submitting ${rowsToSubmit.length} opportunities...`;

  batchMessage.className =
    "batch-message batch-message-working";

  let successCount = 0;
  let failureCount = 0;

  for (let index = 0; index < rowsToSubmit.length; index++) {
    const row = rowsToSubmit[index];
    const rowData = getRowData(row);
    const status = row.querySelector(".row-status");

    status.textContent =
      `Submitting ${index + 1} of ${rowsToSubmit.length}...`;

    status.className =
      "row-status row-status-working";

    try {
      const result = await submitOpportunity({
        ...sharedData,
        ...rowData
      });

      if (result.success) {
        successCount++;

        row.classList.remove("row-has-error");
        row.classList.add("row-submitted");

        status.textContent = "Added";
        status.className =
          "row-status row-status-success";
      } else {
        failureCount++;

        row.classList.add("row-has-error");

        status.textContent =
          result.message || "Submission failed";

        status.className =
          "row-status row-status-error";
      }
    } catch (error) {
      failureCount++;

      row.classList.add("row-has-error");

      status.textContent = "Connection error";
      status.className =
        "row-status row-status-error";

      console.error(
        `Could not submit row ${index + 1}:`,
        error
      );
    }
  }

  submitAllButton.disabled = false;
  submitAllButton.textContent =
    "Submit All Opportunities";

  if (failureCount === 0) {
    batchMessage.textContent =
      `${successCount} opportunities were added successfully.`;

    batchMessage.className =
      "batch-message batch-message-success";
  } else {
    batchMessage.textContent =
      `${successCount} added successfully. ` +
      `${failureCount} failed. Review the highlighted rows and submit again.`;

    batchMessage.className =
      "batch-message batch-message-error";
  }
}

function submitOpportunity(data) {
  const url =
    `${API_URL}?action=addOpportunity`
    + `&school=${encodeURIComponent(data.school)}`
    + `&date=${encodeURIComponent(data.date)}`
    + `&startTime=${encodeURIComponent(data.startTime)}`
    + `&endTime=${encodeURIComponent(data.endTime)}`
    + `&coachesNeeded=${encodeURIComponent(data.coachesNeeded)}`
    + `&programType=${encodeURIComponent(data.programType)}`
    + `&fund=${encodeURIComponent(data.fund)}`
    + `&cop=${encodeURIComponent(data.cop)}`
    + `&notes=${encodeURIComponent(data.notes)}`;

  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(
          `Server returned status ${response.status}`
        );
      }

      return response.json();
    });
}

/*
--------------------------------------------------
HELPERS
--------------------------------------------------
*/

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
--------------------------------------------------
INITIAL ROWS
--------------------------------------------------
*/

addOpportunityRow();
addOpportunityRow();
addOpportunityRow();
