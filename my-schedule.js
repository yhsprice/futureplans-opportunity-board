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
      container.innerHTML = "<p>No approved or pending opportunities found.</p>";
      return;
    }

    let html = `
      <div class="opportunity">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px;">Date</th>
              <th style="text-align:left; padding:8px;">Start</th>
              <th style="text-align:left; padding:8px;">End</th>
              <th style="text-align:left; padding:8px; min-width:180px;">School</th>
              <th style="text-align:left; padding:8px;">Program</th>
              <th style="text-align:left; padding:8px;">Status</th>
              <th style="text-align:left; padding:8px;">Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    myRequests.forEach(request => {
      html += `
        <tr>
          <td style="padding:8px; white-space:nowrap;">${request.Date}</td>
          <td style="padding:8px; white-space:nowrap;">${request.StartTime}</td>
          <td style="padding:8px; white-space:nowrap;">${request.EndTime}</td>
          <td style="padding:8px; min-width:180px;">${request.School}</td>
          <td style="padding:8px;">${request.ProgramType || ""}</td>
          <td style="padding:8px;">${request.Status}</td>
          <td style="padding:8px;">
            <button onclick="cancelRequest('${request.RequestID}')">
              Cancel
            </button>
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

function cancelRequest(requestID) {
  const confirmCancel = confirm("Are you sure you want to cancel this request?");

  if (!confirmCancel) {
    return;
  }

  const url = `${API_URL}?action=updateRequest&requestID=${encodeURIComponent(requestID)}&status=Coach Cancelled`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Request cancelled.");
        loadSchedule();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong cancelling the request.");
      console.error(error);
    });
}

loadSchedule();
