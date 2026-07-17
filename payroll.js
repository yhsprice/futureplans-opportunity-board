const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "jsonp_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

    const script = document.createElement("script");

    window[callbackName] = function(data) {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.src = `${url}&callback=${callbackName}`;

    script.onerror = function(error) {
      delete window[callbackName];
      script.remove();
      reject(error);
    };

    document.body.appendChild(script);
  });
}

const totalsContainer = document.getElementById("payrollTotals");
const container = document.getElementById("payrollSummary");
const payPeriodSelect = document.getElementById("payPeriodSelect");
const sortBy = document.getElementById("sortBy");

showUserBanner();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadPayPeriods() {
  try {
    const payPeriods = await jsonp(
      `${API_URL}?action=getPayPeriods`
    );

    payPeriodSelect.innerHTML = "";

    let currentPayPeriod = "";

    payPeriods.forEach(period => {
      const option = document.createElement("option");

      option.value = period.PayPeriodID;

      option.textContent =
        `${period.PayPeriodID} | ` +
        `${formatDateOnly(period.StartDate)} - ` +
        `${formatDateOnly(period.EndDate)} | ` +
        `${period.Status}`;

      payPeriodSelect.appendChild(option);

      if (String(period.Status).trim() === "Current") {
        currentPayPeriod = period.PayPeriodID;
      }
    });

    if (currentPayPeriod) {
      payPeriodSelect.value = currentPayPeriod;
    }

    await loadPayroll();

  } catch (error) {
    console.error("Pay period loading error:", error);

    payPeriodSelect.innerHTML = `
      <option value="">Unable to load pay periods</option>
    `;
  }
}

async function loadPayroll() {
  const selectedPayPeriod = String(
    payPeriodSelect?.value || ""
  ).trim();

  const statusFilter = String(
    document.getElementById("payrollStatusFilter")?.value ||
    "Approved for Pay"
  ).trim();

  const grantFilterElement =
    document.getElementById("grantFilter");

  const selectedGrant = String(
    grantFilterElement?.value || "all"
  ).trim();

  if (!selectedPayPeriod) {
    clearPayrollDashboard(
      "Please select a pay period."
    );
    return;
  }

  try {
    clearPayrollDashboard("Loading payroll...");

    const response = await jsonp(
      `${API_URL}?action=getCompletedSessions`
    );

    const sessions = Array.isArray(response)
      ? response
      : [];

    /*
      First filter only by pay period.

      Grant choices must be built from every record in
      the selected pay period—not only from the currently
      selected grant.
    */
    const payPeriodSessions = sessions.filter(session => {
      const sessionPayPeriod = String(
        session.PayPeriodID || ""
      ).trim();

      return sessionPayPeriod === selectedPayPeriod;
    });

    updateGrantFilter(
      payPeriodSessions,
      selectedGrant
    );

    const activeGrant = String(
      grantFilterElement?.value || "all"
    ).trim();

    /*
      Apply status and grant filters after the pay-period
      records have been identified.
    */
    const payroll = payPeriodSessions.filter(session => {
      const sessionStatus = String(
        session.Status || ""
      ).trim();

      const sessionFund = String(
        session.Fund || "Unassigned"
      ).trim();

      if (
        statusFilter !== "all" &&
        sessionStatus !== statusFilter
      ) {
        return false;
      }

      if (
        activeGrant !== "all" &&
        sessionFund !== activeGrant
      ) {
        return false;
      }

      return true;
    });

    console.log({
      selectedPayPeriod,
      statusFilter,
      activeGrant,
      payPeriodRecordCount: payPeriodSessions.length,
      displayedRecordCount: payroll.length
    });

    loadSummaryCards(payroll);
    loadGrantTotals(payroll);
    loadCoachTotals(payroll);
    loadPayrollTable(payroll);

  } catch (error) {
    console.error("Payroll loading error:", error);

    clearPayrollDashboard(
      "Payroll could not be loaded. Check the browser console for details."
    );
  }
}

function updateGrantFilter(
  payPeriodSessions,
  previousSelection = "all"
) {
  const grantSelect =
    document.getElementById("grantFilter");

  if (!grantSelect) {
    return;
  }

  const grants = [
    ...new Set(
      payPeriodSessions
        .map(session =>
          String(
            session.Fund || "Unassigned"
          ).trim()
        )
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  grantSelect.innerHTML = `
    <option value="all">All Grants</option>
  `;

  grants.forEach(grant => {
    const option = document.createElement("option");

    option.value = grant;
    option.textContent = grant;

    grantSelect.appendChild(option);
  });

  const selectionStillExists =
    previousSelection === "all" ||
    grants.includes(previousSelection);

  grantSelect.value = selectionStillExists
    ? previousSelection
    : "all";
}


function clearPayrollDashboard(message) {
  document.getElementById("totalCoaches").textContent = "--";
  document.getElementById("totalSessions").textContent = "--";
  document.getElementById("totalHours").textContent = "--";
  document.getElementById("totalPayroll").textContent = "--";

  document.getElementById("grantTotalsBody").innerHTML = `
    <tr>
      <td colspan="4">${message}</td>
    </tr>
  `;

  document.getElementById("payrollDetailBody").innerHTML = `
    <tr>
      <td colspan="14">${message}</td>
    </tr>
  `;

  document.getElementById("coachTotals").innerHTML = `
    <p>${message}</p>
  `;
}

function loadSummaryCards(payroll) {

  const coaches = new Set();

  let totalSessions = payroll.length;
  let totalHours = 0;
  let totalPayroll = 0;

  payroll.forEach(session => {

    coaches.add(session.CoachName);

    totalHours += Number(session.PayHours || 0);
    totalPayroll += Number(session.PayAmount || 0);

  });

  document.getElementById("totalCoaches").textContent =
    coaches.size;

  document.getElementById("totalSessions").textContent =
    totalSessions;

  document.getElementById("totalHours").textContent =
    totalHours.toFixed(2);

  document.getElementById("totalPayroll").textContent =
    "$" + totalPayroll.toFixed(2);

}

function loadGrantTotals(payroll) {

    const body = document.getElementById("grantTotalsBody");

    body.innerHTML = "";

    if (!payroll.length) {

        body.innerHTML = `
        <tr>
            <td colspan="6">No payroll records found.</td>
        </tr>`;

        return;
    }

    const grants = {};

    let grandPayroll = 0;

    payroll.forEach(session => {

        const grant = session.Fund || "Unassigned";

        if (!grants[grant]) {

            grants[grant] = {
                coaches: new Set(),
                sessions: 0,
                hours: 0,
                payroll: 0
            };

        }

        grants[grant].coaches.add(session.CoachName);

        grants[grant].sessions++;

        grants[grant].hours += Number(session.PayHours || 0);

        grants[grant].payroll += Number(session.PayAmount || 0);

        grandPayroll += Number(session.PayAmount || 0);

    });

    let totalCoaches = new Set();

    let totalSessions = 0;
    let totalHours = 0;
    let totalPayroll = 0;

    Object.keys(grants)
        .sort()
        .forEach(grant => {

            const g = grants[grant];

            g.coaches.forEach(c => totalCoaches.add(c));

            totalSessions += g.sessions;
            totalHours += g.hours;
            totalPayroll += g.payroll;

            const percent =
                grandPayroll === 0
                ? 0
                : (g.payroll / grandPayroll) * 100;

            body.innerHTML += `
            <tr>

                <td>${grant}</td>

                <td>${g.coaches.size}</td>

                <td>${g.sessions}</td>

                <td>${g.hours.toFixed(2)}</td>

                <td>$${g.payroll.toFixed(2)}</td>

                <td>${percent.toFixed(1)}%</td>

            </tr>`;
        });

    body.innerHTML += `
    <tr class="table-total">

        <td><strong>TOTAL</strong></td>

        <td><strong>${totalCoaches.size}</strong></td>

        <td><strong>${totalSessions}</strong></td>

        <td><strong>${totalHours.toFixed(2)}</strong></td>

        <td><strong>$${totalPayroll.toFixed(2)}</strong></td>

        <td><strong>100%</strong></td>

    </tr>`;
}

function loadCoachTotals(payroll) {
  const container = document.getElementById("coachTotals");

  if (!payroll.length) {
    container.innerHTML = "<p>No payroll records found.</p>";
    return;
  }

  const coaches = {};

  payroll.forEach(session => {
    const coach = String(
      session.CoachName || "Unknown Coach"
    ).trim();

    const grant = String(
      session.Fund || "Unassigned"
    ).trim();

    if (!coaches[coach]) {
      coaches[coach] = {
        grants: {},
        sessions: 0,
        hours: 0,
        payroll: 0
      };
    }

    if (!coaches[coach].grants[grant]) {
      coaches[coach].grants[grant] = {
        sessions: 0,
        hours: 0,
        payroll: 0
      };
    }

    const hours = Number(session.PayHours || 0);
    const pay = Number(session.PayAmount || 0);

    coaches[coach].grants[grant].sessions += 1;
    coaches[coach].grants[grant].hours += hours;
    coaches[coach].grants[grant].payroll += pay;

    coaches[coach].sessions += 1;
    coaches[coach].hours += hours;
    coaches[coach].payroll += pay;
  });

  const coachNames = Object.keys(coaches).sort(
    (a, b) => a.localeCompare(b)
  );

  let html = `
    <table class="batch-table">
      <thead>
        <tr>
          <th>Coach</th>
          <th>Grant</th>
          <th>Sessions</th>
          <th>Hours</th>
          <th>Payroll</th>
        </tr>
      </thead>
      <tbody>
  `;

  let grandSessions = 0;
  let grandHours = 0;
  let grandPayroll = 0;

  coachNames.forEach(coach => {
    const coachData = coaches[coach];

    const grantNames = Object.keys(
      coachData.grants
    ).sort((a, b) => a.localeCompare(b));

    grantNames.forEach((grant, index) => {
      const grantData = coachData.grants[grant];

      html += `
        <tr>
          <td>
            ${index === 0
              ? `<strong>${escapeHtml(coach)}</strong>`
              : ""}
          </td>

          <td>${escapeHtml(grant)}</td>

          <td>${grantData.sessions}</td>

          <td>${grantData.hours.toFixed(2)}</td>

          <td>$${grantData.payroll.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
      <tr class="coach-subtotal-row">
        <td colspan="2">
          <strong>${escapeHtml(coach)} Total</strong>
        </td>

        <td>
          <strong>${coachData.sessions}</strong>
        </td>

        <td>
          <strong>${coachData.hours.toFixed(2)}</strong>
        </td>

        <td>
          <strong>$${coachData.payroll.toFixed(2)}</strong>
        </td>
      </tr>
    `;

    grandSessions += coachData.sessions;
    grandHours += coachData.hours;
    grandPayroll += coachData.payroll;
  });

  html += `
      <tr class="table-total">
        <td colspan="2">
          <strong>PAYROLL TOTAL</strong>
        </td>

        <td>
          <strong>${grandSessions}</strong>
        </td>

        <td>
          <strong>${grandHours.toFixed(2)}</strong>
        </td>

        <td>
          <strong>$${grandPayroll.toFixed(2)}</strong>
        </td>
      </tr>
    </tbody>
  </table>
  `;

  container.innerHTML = html;
}

function loadPayrollTable(payroll) {
  const body = document.getElementById("payrollDetailBody");

  body.innerHTML = "";

  if (payroll.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="14">No payroll records found.</td>
      </tr>
    `;
    return;
  }

  const sortValue = sortBy.value;

  payroll.sort((a, b) => {
    switch (sortValue) {
      case "coach":
        return String(a.CoachName || "").localeCompare(String(b.CoachName || ""));

      case "grant":
        return String(a.Fund || "").localeCompare(String(b.Fund || ""));

      case "hours":
        return Number(b.PayHours || 0) - Number(a.PayHours || 0);

      case "pay":
        return Number(b.PayAmount || 0) - Number(a.PayAmount || 0);

      case "date":
      default:
        return new Date(a.Date) - new Date(b.Date);
    }
  });

  payroll.forEach(session => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${session.CoachName || ""}</td>
      <td>${formatDateOnly(session.Date)}</td>
      <td>${session.Fund || "Unassigned"}</td>
      <td>${session.ProgramType || ""}</td>
      <td>${session.PayRule || ""}</td>
      <td>${session.School || ""}</td>
      <td>${session.AppointmentOutcome || "Completed"}</td>
      <td>${session.CancellationReason || ""}</td>
      <td>${session.OutcomeDetails || ""}</td>
      <td>${Number(session.PayHours || 0).toFixed(2)}</td>
      <td>$${Number(session.PayRate || 0).toFixed(2)}</td>
      <td>$${Number(session.PayAmount || 0).toFixed(2)}</td>
      <td>${session.Status || ""}</td>
      <td>
        <button onclick="editPayrollEntry('${session.SessionID}')">Edit</button>
        <button onclick="deletePayrollEntry('${session.SessionID}')">Delete</button>
      </td>
    `;

    body.appendChild(row);
  });
}

async function deletePayrollEntry(sessionID) {
  if (!confirm("Delete this payroll entry?")) {
    return;
  }

  const response = await fetch(`${API_URL}?action=deleteCompletedSession&sessionID=${encodeURIComponent(sessionID)}`);
  const result = await response.json();

  alert(result.message || "Done.");
  loadPayroll();
}

async function editPayrollEntry(sessionID) {
  const response = await fetch(`${API_URL}?action=getCompletedSessions`);
  const sessions = await response.json();

  const session = sessions.find(s => String(s.SessionID) === String(sessionID));

  if (!session) {
    alert("Payroll entry not found.");
    return;
  }

  const date = prompt("Date:", formatDateForInput(session.Date));
  if (date === null) return;

  const programType = prompt("Program Type:", session.ProgramType || "");
  if (programType === null) return;

  const serviceType = prompt("Service Type:", session.PayRule || "");
  if (serviceType === null) return;

  const school = prompt("School / Agency optional:", session.School || "");
  if (school === null) return;

  const hours = prompt("Hours:", session.PayHours || "");
  if (hours === null) return;

  const notes = prompt("Notes:", session.Notes || "");
  if (notes === null) return;

  const params = new URLSearchParams({
    action: "editCompletedSession",
    sessionID,
    date,
    programType,
    serviceType,
    school,
    hours,
    notes
  });

  const saveResponse = await fetch(API_URL, {
    method: "POST",
    body: params
  });

  const result = await saveResponse.json();

  alert(result.message || "Done.");
  loadPayroll();
}

async function copyAccountingSummary() {
  const selectedPayPeriod = payPeriodSelect.value;

  if (!selectedPayPeriod) {
    alert("Please select a pay period first.");
    return;
  }

  const sessionsResponse = await fetch(`${API_URL}?action=getCompletedSessions`);
  const sessions = await sessionsResponse.json();

  const periodsResponse = await fetch(`${API_URL}?action=getPayPeriods`);
  const payPeriods = await periodsResponse.json();

  const period = payPeriods.find(p =>
    String(p.PayPeriodID) === String(selectedPayPeriod)
  );

  const approved = sessions.filter(s =>
    s.Status === "Approved for Pay" &&
    s.PayPeriodID === selectedPayPeriod
  );

  if (approved.length === 0) {
    alert("No approved payroll found for this pay period.");
    return;
  }

  const summary = {};

  approved.forEach(session => {
    const coach = session.CoachName || "Unknown Coach";

    if (!summary[coach]) {
      summary[coach] = {
        hours: 0,
        pay: 0
      };
    }

    summary[coach].hours += Number(session.PayHours || 0);
    summary[coach].pay += Number(session.PayAmount || 0);
  });

  const coaches = Object.keys(summary).sort();

  let totalHours = 0;
  let totalPay = 0;

  const payPeriodText = period
    ? `${formatDateOnly(period.StartDate)} - ${formatDateOnly(period.EndDate)}`
    : selectedPayPeriod;

  let text = `Future Plans Coach Payroll\n`;
  text += `Pay Period: ${payPeriodText}\n\n`;

  coaches.forEach(coach => {
    totalHours += summary[coach].hours;
    totalPay += summary[coach].pay;

    text += `${coach} - ${summary[coach].hours.toFixed(2)} hours - $${summary[coach].pay.toFixed(2)}\n`;
  });

  text += `\nTotal Hours: ${totalHours.toFixed(2)}\n`;
  text += `Total Payroll: $${totalPay.toFixed(2)}\n`;

  try {
    await navigator.clipboard.writeText(text);
    alert("Accounting summary copied. Paste it into your email.");
  } catch (error) {
    console.error(error);
    prompt("Copy this accounting summary:", text);
  }
}

async function markPayPeriodPaid() {
  const selectedPayPeriod = payPeriodSelect.value;

  if (!selectedPayPeriod) {
    alert("Please select a pay period first.");
    return;
  }

  const confirmPaid = confirm(
    "Mark all Approved for Pay records in this pay period as Paid? Do this only after accounting has processed payment."
  );

  if (!confirmPaid) return;

  const response = await fetch(
    `${API_URL}?action=markPayPeriodPaid&payPeriodID=${encodeURIComponent(selectedPayPeriod)}`
  );

  const result = await response.json();

  alert(result.message || "Done.");

  await loadPayPeriods();
}

function formatDateForInput(value) {
  const date = new Date(value);
  if (isNaN(date)) return "";

  return date.toISOString().split("T")[0];
}

function formatDate(value) {
  const date = new Date(value);

  if (isNaN(date)) return value || "";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const formattedHours = String(hours).padStart(2, "0");

  return `${month}/${day}/${year} ${formattedHours}:${minutes} ${ampm}`;
}

loadPayPeriods();
