const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const container = document.getElementById("scheduleList");
const currentUser = getCurrentUser();
let currentPersonID = currentUser.PersonID;

async function loadSchedule() {
  container.innerHTML = "<p>Loading schedule...</p>";

  try {
    const response = await fetch(API_URL + "?action=getRequests");
    const requests = await response.json();

    const myRequests = requests
      .filter(r =>
        String(r.PersonID) === String(currentPersonID) &&
        (r.Status === "Approved" || r.Status === "Pending Approval")
      )
      .sort((a, b) => {
        const dateA = new Date(`${a.Date} ${a.StartTime}`);
        const dateB = new Date(`${b.Date} ${b.StartTime}`);
        return dateA - dateB;
      });

    if (myRequests.length === 0) {
      container.innerHTML = `
        <div class="opportunity">
          <h2>No Current Schedule</h2>
          <p>You do not currently have approved or pending opportunities.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="opportunity">
        <p>
          <strong>Important:</strong> By requesting an opportunity, you are accepting responsibility for that assignment.
          If you later cannot attend, you are responsible for notifying management and helping find a replacement.
        </p>

        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px;">Date</th>
              <th style="text-align:left; padding:8px;">Start</th>
              <th style="text-align:left; padding:8px;">End</th>
              <th style="text-align:left; padding:8px; min-width:180px;">School</th>
              <th style="text-align:left; padding:8px;">Program</th>
              <th style="text-align:left; padding:8px;">Status</th>
              <th style="text-align:left; padding:8px;">Release</th>
            </tr>
          </thead>
          <tbody>
    `;

    myRequests.forEach(request => {
      const releaseRequested = String(request.ReleaseRequested || "").trim() === "Yes";

      html += `
        <tr>
          <td style="padding:8px; white-space:nowrap;">${request.Date}</td>
          <td style="padding:8px; white-space:nowrap;">${request.StartTime}</td>
          <td style="padding:8px; white-space:nowrap;">${request.EndTime}</td>
          <td style="padding:8px; min-width:180px;">${request.School}</td>
          <td style="padding:8px;">${request.ProgramType || ""}</td>
          <td style="padding:8px;">${request.Status}</td>
          <td style="padding:8px;">
            ${releaseRequested
              ? `<strong>Release requested</strong><br><small>${request.ReleaseStatus || "Pending Review"}</small>`
              : `<button onclick="requestRelease('${request.RequestID}')">Request Release</button>`
            }
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = "<p>Something went wrong loading your schedule.</p>";
    console.error(error);
  }
}

function requestRelease(requestID) {
  const reason = prompt(
    "Explain why you need to be released from this opportunity. This note will only be visible to management."
  );

  if (!reason || reason.trim() === "") {
    alert("A reason is required to request release.");
    return;
  }

  const confirmRelease = confirm(
    "By requesting release, you are notifying management that you cannot fulfill this assignment and are responsible for helping find a replacement. Submit this request?"
  );

  if (!confirmRelease) {
    return;
  }

  const url = `${API_URL}?action=requestRelease`
    + `&requestID=${encodeURIComponent(requestID)}`
    + `&reason=${encodeURIComponent(reason.trim())}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Release request submitted to management.");
        loadSchedule();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong submitting the release request.");
      console.error(error);
    });
}

showUserBanner();
loadSchedule();
