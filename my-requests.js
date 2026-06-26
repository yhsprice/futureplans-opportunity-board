const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const myRequestList = document.getElementById("myRequestList");

async function loadMyRequests() {
  const currentUser = getCurrentUser();
  const personID = currentUser.PersonID;

  if (!personID) {
    alert("Please log in again.");
    return;
  }

  myRequestList.innerHTML = "<p>Loading your requests...</p>";

  try {
    const [requestsResponse, sessionsResponse] = await Promise.all([
      fetch(`${API_URL}?action=getRequests`),
      fetch(`${API_URL}?action=getCompletedSessions`)
    ]);

    const requests = await requestsResponse.json();
    const completedSessions = await sessionsResponse.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mine = requests
      .filter(request => String(request.PersonID) === String(personID))
      .filter(request => {
  const status = String(request.Status || "").trim();

  if (status === "Pending Approval") {
    return true;
  }

  if (status === "Approved" && request.PayrollGenerated !== "Yes") {
    return true;
  }

  if (request.PayrollGenerated === "Yes") {
    return true;
  }

  return false;
})
      
      .sort((a, b) => {
        const dateA = new Date(`${a.Date} ${a.StartTime}`);
        const dateB = new Date(`${b.Date} ${b.StartTime}`);
        return dateA - dateB;
      });

    const waitingApproval = mine.filter(request =>
      request.Status === "Pending Approval"
    );

    const upcomingScheduled = mine.filter(request =>
      request.Status === "Approved" &&
      request.PayrollGenerated !== "Yes"
    );

    const submittedForPay = mine.filter(request =>
      request.PayrollGenerated === "Yes"
    );

   const meetingRequestsWaitingApproval = completedSessions
  .filter(session => String(session.PersonID) === String(personID))
  .filter(session => {
    const programType = String(session.ProgramType || "").trim();
    const payRule = String(session.PayRule || "").trim();

    return programType === "Meeting" ||
           programType === "Professional Development" ||
           payRule === "Prof Development";
  })
  .filter(session => {
    const status = String(session.Status || "").trim();
    return status === "Pending Pay Approval" ||
           status === "Pending Approval" ||
           status === "Coach Submitted";
  })
  .sort((a, b) => new Date(a.Date) - new Date(b.Date));

    const totalCount =
      waitingApproval.length +
      meetingRequestsWaitingApproval.length +
      upcomingScheduled.length +
      submittedForPay.length;

    if (totalCount === 0) {
      myRequestList.innerHTML = `
        <div class="empty-state">
          <h2>No Current Requests</h2>
          <p>You do not have any current requests right now.</p>
        </div>
      `;
      return;
    }

    myRequestList.innerHTML = "";

    renderSection("Waiting for Approval", waitingApproval, false);
    renderMeetingSection("Meetings / Professional Development Waiting for Approval", meetingRequestsWaitingApproval);
    renderSection("Upcoming / Scheduled", upcomingScheduled, true);
    renderSection("Submitted for Pay", submittedForPay, false);

  } catch (error) {
    myRequestList.innerHTML = "<p>Something went wrong loading your requests.</p>";
    console.error(error);
  }
}

function renderSection(title, requests, showCompleteButton) {
  const section = document.createElement("div");

  let html = `<h2>${title} (${requests.length})</h2>`;

  if (requests.length === 0) {
    html += `<p>Nothing here right now.</p>`;
    section.innerHTML = html;
    myRequestList.appendChild(section);
    return;
  }

  html += `
    <table class="modern-table">
      <thead>
        <tr>
          <th style="text-align:left; padding:8px;">Date</th>
          <th style="text-align:left; padding:8px;">Start</th>
          <th style="text-align:left; padding:8px;">End</th>
          <th style="text-align:left; padding:8px; min-width:180px;">School</th>
          <th style="text-align:left; padding:8px;">Program</th>
          <th style="text-align:left; padding:8px;">Status</th>
          <th style="text-align:left; padding:8px;">Submitted for Pay</th>
          <th style="text-align:left; padding:8px;">Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  requests.forEach(request => {
    const submittedText = request.PayrollGenerated === "Yes"
      ? `Yes<br><small>${request.PayrollGeneratedAt || ""}</small>`
      : "No";

    const action = showCompleteButton
      ? `<button onclick="completeRequest('${request.RequestID}')">Submit for Pay</button>`
      : request.PayrollGenerated === "Yes"
        ? `<strong>Submitted</strong>`
        : "";

    html += `
      <tr>
        <td style="padding:8px; white-space:nowrap;">${formatDateOnly(request.Date)}</td>
        <td style="padding:8px; white-space:nowrap;">${request.StartTime || ""}</td>
        <td style="padding:8px; white-space:nowrap;">${request.EndTime || ""}</td>
        <td style="padding:8px; min-width:180px;">${request.School || ""}</td>
        <td style="padding:8px;">${request.ProgramType || ""}</td>
        <td style="padding:8px;">${request.Status || ""}</td>
        <td style="padding:8px;">${submittedText}</td>
        <td style="padding:8px;">${action}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  section.innerHTML = html;
  myRequestList.appendChild(section);
}

function renderMeetingSection(title, sessions) {
  const section = document.createElement("div");

  let html = `<h2>${title} (${sessions.length})</h2>`;

  if (sessions.length === 0) {
    html += `<p>Nothing here right now.</p>`;
    section.innerHTML = html;
    myRequestList.appendChild(section);
    return;
  }

  html += `
    <table class="modern-table">
      <thead>
        <tr>
          <th style="text-align:left; padding:8px;">Date</th>
          <th style="text-align:left; padding:8px;">Hours</th>
          <th style="text-align:left; padding:8px;">Pay</th>
          <th style="text-align:left; padding:8px;">Status</th>
          <th style="text-align:left; padding:8px;">Notes</th>
        </tr>
      </thead>
      <tbody>
  `;

  sessions.forEach(session => {
    html += `
      <tr>
        <td style="padding:8px; white-space:nowrap;">${formatDateOnly(session.Date)}</td>
        <td style="padding:8px;">${session.PayHours || session.Hours || ""}</td>
        <td style="padding:8px;">${session.PayAmount ? "$" + session.PayAmount : ""}</td>
        <td style="padding:8px;">${session.Status || ""}</td>
        <td style="padding:8px;">${session.Notes || ""}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  section.innerHTML = html;
  myRequestList.appendChild(section);
}

function completeRequest(requestID) {
  const confirmComplete = confirm(
    "Submit this completed opportunity for pay approval?"
  );

  if (!confirmComplete) {
    return;
  }

  fetch(`${API_URL}?action=completeRequest&requestID=${encodeURIComponent(requestID)}`)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Submitted for pay approval.");
        loadMyRequests();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong submitting the completed session.");
      console.error(error);
    });
}

showUserBanner();
showManagerLinksOnly();
loadMyRequests();
