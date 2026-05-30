const API_URL = "YOUR_GOOGLE_SCRIPT_URL_HERE";

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
    r.Status === "Approved"
  );

  if (myRequests.length === 0) {
    container.innerHTML = "<p>No approved opportunities found.</p>";
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
    `;

    container.appendChild(div);
  });
}

loadSchedule();
