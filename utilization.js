const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const container =
  document.getElementById("utilizationReport");

showUserBanner();

let allSessions = [];
let allPayPeriods = [];
let allPeople = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isYes(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === "yes";
}

function isActiveCoach(person) {
  const role = String(person.Role || "")
    .trim()
    .toLowerCase();

  const type = String(person.Type || "")
    .trim()
    .toLowerCase();

  const active = String(
    person.Active ?? person.ActiveStatus ?? ""
  )
    .trim()
    .toLowerCase();

  return (
    (role === "coach" || type === "coach") &&
    active === "yes"
  );
}

function getTier(person) {
  return Number(
    person.Tiers ??
    person.Tier ??
    0
  );
}

function buildPayPeriodOptions(selectedID) {
  return allPayPeriods
    .map(period => {
      const periodID =
        String(period.PayPeriodID || "").trim();

      const status =
        String(period.Status || "").trim();

      const selected =
        periodID === selectedID
          ? "selected"
          : "";

      const label = status
        ? `${periodID} — ${status}`
        : periodID;

      return `
        <option
          value="${escapeHtml(periodID)}"
          ${selected}
        >
          ${escapeHtml(label)}
        </option>
      `;
    })
    .join("");
}

function buildTierOptions(currentTier) {
  const tiers = [0, 1, 2, 3, 4];

  return tiers
    .map(tier => `
      <option
        value="${tier}"
        ${Number(currentTier) === tier ? "selected" : ""}
      >
        Tier ${tier}
      </option>
    `)
    .join("");
}

function getSelectedPayPeriodID() {
  const select =
    document.getElementById("payPeriodSelect");

  return select
    ? select.value
    : "";
}

function renderUtilization(payPeriodID) {
  const selectedPayPeriodID =
  String(payPeriodID || "").trim();

const approvedSessions = allSessions.filter(session => {
  const status =
    String(session.Status || "")
      .trim()
      .toLowerCase();

  const sessionPeriodID =
    String(session.PayPeriodID || "")
      .trim();

  return (
    (
      status === "approved for pay" ||
      status === "paid"
    ) &&
    sessionPeriodID === selectedPayPeriodID
  );
});

  /*
    Summarize payroll by PersonID first.
    CoachName is used as a fallback for older records.
  */
  const summaryByPersonID = {};
  const summaryByCoachName = {};

  approvedSessions.forEach(session => {
    const personID =
      String(session.PersonID || "").trim();

    const coachName =
      String(session.CoachName || "").trim();

    const record = {
      sessions: 1,
      hours: Number(session.PayHours || 0),
      pay: Number(session.PayAmount || 0)
    };

    if (personID) {
      if (!summaryByPersonID[personID]) {
        summaryByPersonID[personID] = {
          sessions: 0,
          hours: 0,
          pay: 0
        };
      }

      summaryByPersonID[personID].sessions +=
        record.sessions;

      summaryByPersonID[personID].hours +=
        record.hours;

      summaryByPersonID[personID].pay +=
        record.pay;
    }

    if (coachName) {
      const normalizedName =
        coachName.toLowerCase();

      if (!summaryByCoachName[normalizedName]) {
        summaryByCoachName[normalizedName] = {
          sessions: 0,
          hours: 0,
          pay: 0
        };
      }

      summaryByCoachName[normalizedName].sessions +=
        record.sessions;

      summaryByCoachName[normalizedName].hours +=
        record.hours;

      summaryByCoachName[normalizedName].pay +=
        record.pay;
    }
  });

  const coaches = allPeople
    .filter(isActiveCoach)
    .sort((a, b) =>
      String(a.Name || "").localeCompare(
        String(b.Name || "")
      )
    );

  let html = `
    <div class="dashboard-card">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-end;
        gap:20px;
        flex-wrap:wrap;
        margin-bottom:20px;
      ">

        <div>
          <h2 style="margin-bottom:6px;">
  Coach Utilization:
  ${escapeHtml(selectedPayPeriodID)}
</h2>

          <p style="margin:0;">
            Review payroll activity and coach readiness.
          </p>
        </div>

        <div style="min-width:260px;">
          <label
            for="payPeriodSelect"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:6px;
            "
          >
            Payroll Period
          </label>

          <select
  id="payPeriodSelect"
  onchange="changePayPeriod(this.value)"
            style="
              width:100%;
              padding:10px;
            "
          >
            ${buildPayPeriodOptions(payPeriodID)}
          </select>
        </div>

      </div>

      <div style="overflow-x:auto;">
        <table class="modern-table">
          <thead>
            <tr>
              <th>Coach</th>
              <th>Tier</th>
              <th>Shadowed</th>
              <th>Shadowed By</th>
              <th>Sessions</th>
              <th>Hours</th>
              <th>Pay</th>
              <th>Usage</th>
              <th>Save</th>
            </tr>
          </thead>

          <tbody>
  `;

  coaches.forEach(coach => {
    const personID =
      String(coach.PersonID || "").trim();

    const coachName =
      String(coach.Name || "").trim();

    const normalizedName =
      coachName.toLowerCase();

    const totals =
      summaryByPersonID[personID] ||
      summaryByCoachName[normalizedName] ||
      {
        sessions: 0,
        hours: 0,
        pay: 0
      };

    const hours =
      Number(totals.hours || 0);

    let usageStatus = "Normal";

    if (hours === 0) {
      usageStatus = "No Assignments";
    } else if (hours <= 4) {
      usageStatus = "Low Usage";
    } else if (hours >= 21) {
      usageStatus = "High Usage";
    }

    const tier =
      getTier(coach);

    const shadowed =
      isYes(coach.Shadowed);

    const shadowedBy =
      String(coach.ShadowedBy || "");

    html += `
      <tr>

        <td>
          <strong>
            ${escapeHtml(coachName)}
          </strong>

          <div style="
            font-size:12px;
            opacity:.75;
            margin-top:3px;
          ">
            ${escapeHtml(coach.Email || "")}
          </div>
        </td>

        <td>
          <select
            id="tier-${escapeHtml(personID)}"
            style="min-width:100px;"
          >
            ${buildTierOptions(tier)}
          </select>
        </td>

        <td style="text-align:center;">
          <input
            id="shadowed-${escapeHtml(personID)}"
            type="checkbox"
            ${shadowed ? "checked" : ""}
          >
        </td>

        <td>
          <input
            id="shadowedBy-${escapeHtml(personID)}"
            type="text"
            value="${escapeHtml(shadowedBy)}"
            placeholder="Type supervisor name"
            style="min-width:180px;"
          >
        </td>

        <td>
          ${totals.sessions}
        </td>

        <td>
          ${hours.toFixed(2)}
        </td>

        <td>
          $${Number(totals.pay || 0).toFixed(2)}
        </td>

        <td>
          ${escapeHtml(usageStatus)}
        </td>

        <td>
          <button
            id="save-${escapeHtml(personID)}"
            onclick="saveCoachDetails('${escapeHtml(personID)}')"
          >
            Save
          </button>
        </td>

      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function changePayPeriod(payPeriodID) {
  const selectedPayPeriodID =
    String(payPeriodID || "").trim();

  renderUtilization(selectedPayPeriodID);
}

async function saveCoachDetails(personID) {
  const tierElement =
    document.getElementById(
      `tier-${personID}`
    );

  const shadowedElement =
    document.getElementById(
      `shadowed-${personID}`
    );

  const shadowedByElement =
    document.getElementById(
      `shadowedBy-${personID}`
    );

  const saveButton =
    document.getElementById(
      `save-${personID}`
    );

  const tier =
    tierElement.value;

  const shadowed =
    shadowedElement.checked
      ? "Yes"
      : "No";

  const shadowedBy =
    shadowedByElement.value.trim();

  if (shadowed === "Yes" && !shadowedBy) {
    alert(
      "Please enter who supervised the shadowing."
    );

    shadowedByElement.focus();
    return;
  }

  const confirmed = confirm(
    `Save Tier ${tier} and shadowing information for this coach?`
  );

  if (!confirmed) {
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  const url =
    `${API_URL}?action=updateCoachUtilizationDetails`
    + `&personID=${encodeURIComponent(personID)}`
    + `&tier=${encodeURIComponent(tier)}`
    + `&shadowed=${encodeURIComponent(shadowed)}`
    + `&shadowedBy=${encodeURIComponent(shadowedBy)}`;

  try {
    const response =
      await fetch(url);

    const result =
      await response.json();

    if (!result.success) {
      throw new Error(
        result.message ||
        "The coach information could not be saved."
      );
    }

    alert(
      "Coach tier and shadowing information saved."
    );

    await loadUtilization(
      getSelectedPayPeriodID()
    );

  } catch (error) {
    console.error(
      "Coach utilization save error:",
      error
    );

    alert(
      error.message ||
      "Something went wrong saving the coach information."
    );

    saveButton.disabled = false;
    saveButton.textContent = "Save";
  }
}

async function loadUtilization(
  preferredPayPeriodID = ""
) {
  container.innerHTML = `
    <div class="dashboard-card">
      <p>Loading utilization...</p>
    </div>
  `;

  try {
    const [
      sessionsResponse,
      payPeriodsResponse,
      peopleResponse
    ] = await Promise.all([
      fetch(
        `${API_URL}?action=getCompletedSessions`
      ),
      fetch(
        `${API_URL}?action=getPayPeriods`
      ),
      fetch(
        `${API_URL}?action=getPeople`
      )
    ]);

    allSessions =
      await sessionsResponse.json();

    allPayPeriods =
      await payPeriodsResponse.json();

    allPeople =
      await peopleResponse.json();

    if (!Array.isArray(allSessions)) {
      allSessions = [];
    }

    if (!Array.isArray(allPayPeriods)) {
      allPayPeriods = [];
    }

    if (!Array.isArray(allPeople)) {
      allPeople = [];
    }

    if (allPayPeriods.length === 0) {
      container.innerHTML = `
        <div class="dashboard-card">
          <p>No payroll periods were found.</p>
        </div>
      `;

      return;
    }

    let selectedPayPeriodID =
      preferredPayPeriodID;

    if (!selectedPayPeriodID) {
      const currentPeriod =
        allPayPeriods.find(period =>
          String(period.Status || "")
            .trim()
            .toLowerCase() === "current"
        );

      selectedPayPeriodID =
        currentPeriod
          ? currentPeriod.PayPeriodID
          : allPayPeriods[0].PayPeriodID;
    }

    renderUtilization(
      String(selectedPayPeriodID || "")
    );

  } catch (error) {
    console.error(
      "Utilization load error:",
      error
    );

    container.innerHTML = `
      <div class="dashboard-card">
        <p>
          Something went wrong loading coach utilization.
        </p>
      </div>
    `;
  }
}

loadUtilization();
