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

  const summaryByPersonID = {};
  const summaryByCoachName = {};

  approvedSessions.forEach(session => {
    const personID =
      String(session.PersonID || "").trim();

    const coachName =
      String(session.CoachName || "").trim();

    const hours =
      Number(session.PayHours || 0);

    const pay =
      Number(session.PayAmount || 0);

    if (personID) {
      if (!summaryByPersonID[personID]) {
        summaryByPersonID[personID] = {
          sessions: 0,
          hours: 0,
          pay: 0
        };
      }

      summaryByPersonID[personID].sessions += 1;
      summaryByPersonID[personID].hours += hours;
      summaryByPersonID[personID].pay += pay;
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

      summaryByCoachName[normalizedName].sessions += 1;
      summaryByCoachName[normalizedName].hours += hours;
      summaryByCoachName[normalizedName].pay += pay;
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
            Review approved sessions, hours,
            payroll totals, and coach usage.
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
            ${buildPayPeriodOptions(selectedPayPeriodID)}
          </select>
        </div>

      </div>

      <div style="overflow-x:auto;">
        <table class="modern-table">

          <thead>
            <tr>
              <th>Coach</th>
              <th>Sessions</th>
              <th>Hours</th>
              <th>Pay</th>
              <th>Usage</th>
            </tr>
          </thead>

          <tbody>
  `;

  coaches.forEach(coach => {
    const personID =
      String(coach.PersonID || "").trim();

    const coachName =
      String(coach.Name || "").trim();

    const totals =
      summaryByPersonID[personID] ||
      summaryByCoachName[
        coachName.toLowerCase()
      ] ||
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

      </tr>
    `;
  });

  if (coaches.length === 0) {
    html += `
      <tr>
        <td colspan="5">
          No active coaches were found.
        </td>
      </tr>
    `;
  }

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function changePayPeriod(payPeriodID) {
  renderUtilization(
    String(payPeriodID || "").trim()
  );
}

async function loadUtilization() {
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

    const currentPeriod =
      allPayPeriods.find(period =>
        String(period.Status || "")
          .trim()
          .toLowerCase() === "current"
      );

    const selectedPayPeriodID =
      currentPeriod
        ? currentPeriod.PayPeriodID
        : allPayPeriods[0].PayPeriodID;

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
