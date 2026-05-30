const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const container = document.getElementById("scheduleList");

async function loadSchedule() {

  const personID = prompt("Enter your assigned staff number:");

  if (!personID) {
    container.innerHTML = "<p>No staff number entered.</p>";
    return;
  }

  const response = await fetch(API_URL + "?action=getRequests");
  const requests = await response.json();

  const myRequests = requests.filter(r =>
  String(r.PersonID) === String(personID) &&
  (r.Status === "Approved" || r.Status === "Pending Approval")
);

  if (myRequests.length === 0) {
  container.innerHTML = "<p>No approved or pending opportunities found.</p>";
  return;
}

  container.innerHTML = "";

  myRequests.forEach(request => {

    const div = document.createElement("div");
    div.className = "opportunity";

    div.innerHTML = `
      <h3>${request.School}</h3>

      <p><strong>Date:</strong> ${request.Date}</p>

      <p><strong>Time:</strong>
      ${request.StartTime} - ${request.EndTime}</p>

      <p><strong>Status:</strong>
${request.Status}</p>

<button onclick="cancelRequest('${request.RequestID}')">
  Cancel Request
</button>

    container.appendChild(div);
  });
}

loadSchedule();

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
