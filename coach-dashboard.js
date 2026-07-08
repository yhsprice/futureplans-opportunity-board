const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const currentUser = getCurrentUser();

showUserBanner();
showManagerLinksOnly();

async function loadCoachDashboard() {
  const personID = String(currentUser.PersonID);

  const [opportunitiesResponse, requestsResponse, sessionsResponse] = await Promise.all([
    fetch(API_URL),
    fetch(`${API_URL}?action=getRequests`),
    fetch(`${API_URL}?action=getCompletedSessions`)
  ]);

  const opportunities = await opportunitiesResponse.json();
  const requests = await requestsResponse.json();
  const sessions = await sessionsResponse.json();

  loadWeeklySchedule(requests, personID);
  loadCurrentPay(sessions, personID);
  loadOpenings(opportunities);
}

function loadWeeklySchedule(requests, personID) {
  const today = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const mine = requests.filter(r => {
    const requestDate = new Date(r.Date);

    return String(r.PersonID) === personID &&
      (r.Status === "Approved" || r.Status === "Pending Approval") &&
      requestDate >= today &&
      requestDate <= sevenDaysFromNow;
  });

  const box = document.getElementById("weeklySchedule");

  if (mine.length === 0) {
    box.innerHTML = "<p>No scheduled opportunities this week.</p>";
    return;
  }

  let html = "<ul>";

  mine.forEach(r => {
    let statusClass = "status-pending";

    if (r.Status === "Approved") {
      statusClass = "status-approved";
    }

    if (r.Status === "Denied") {
      statusClass = "status-denied";
    }

    html += `
      <li style="margin-bottom:18px; line-height:1.5;">
        <strong>${r.School}</strong><br>
        ${r.Date} | ${r.StartTime} - ${r.EndTime}<br>
        <span class="status-pill ${statusClass}">
          ${r.Status}
        </span>
      </li>
    `;
  });

  html += "</ul>";
  box.innerHTML = html;
}

function loadCurrentPay(sessions, personID) {
  const mine = sessions.filter(s => String(s.PersonID) === personID);

  const pending = mine.filter(s => s.Status === "Pending Pay Approval");
  const approved = mine.filter(s => s.Status === "Approved for Pay");

  const pendingPay = pending.reduce((sum, s) => sum + Number(s.PayAmount || 0), 0);
  const approvedPay = approved.reduce((sum, s) => sum + Number(s.PayAmount || 0), 0);

  document.getElementById("currentPay").innerHTML = `
    <p><strong>Pending Approval:</strong> ${pending.length} item(s) / $${pendingPay.toFixed(2)}</p>
    <p><strong>Approved for Pay:</strong> ${approved.length} item(s) / $${approvedPay.toFixed(2)}</p>
  `;
}

function logout() {
  sessionStorage.clear();
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
}

function loadOpenings(opportunities) {
  const open = opportunities.filter(o =>
    String(o.OpportunityStatus || "Open").trim() === "Open" &&
    Number(o.RemainingOpenings || 0) > 0
  );

  document.getElementById("openingsSummary").innerHTML = `
    <p><strong>${open.length}</strong> open opportunity listing(s) available.</p>
    <p><a href="index.html">View openings</a></p>
  `;
}

loadCoachDashboard();
