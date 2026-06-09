const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const currentUser = getCurrentUser();

showUserBanner();
showManagerLinksOnly();

let currentWeekStart = getMonday(new Date());

const weekPicker = document.getElementById("weekPicker");
weekPicker.value = formatDateInput(currentWeekStart);

async function loadManagerCalendar() {
  const pickedDate = document.getElementById("weekPicker").value;
  currentWeekStart = getMonday(parseLocalDate(pickedDate));

  const [opportunitiesResponse, requestsResponse] = await Promise.all([
    fetch(API_URL),
    fetch(`${API_URL}?action=getRequests`)
  ]);

  const opportunities = await opportunitiesResponse.json();
  const requests = await requestsResponse.json();

  renderCalendar(opportunities, requests);
}

function renderCalendar(opportunities, requests) {
  const container = document.getElementById("calendarContainer");

  const weekDates = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    weekDates.push(date);
  }

  let html = `<div class="manager-week-grid">`;

  weekDates.forEach(day => {
    const dayKey = formatDateKey(day);

    const dayOpportunities = opportunities
      .filter(o => formatDateKey(new Date(o.Date)) === dayKey)
      .sort((a, b) => new Date(`${a.Date} ${a.StartTime}`) - new Date(`${b.Date} ${b.StartTime}`));

    html += `
      <div class="manager-day-column">
        <h2>${day.toLocaleDateString("en-US", { weekday: "long", month: "numeric", day: "numeric" })}</h2>
    `;

    if (dayOpportunities.length === 0) {
      html += `<p>No appointments scheduled.</p>`;
    }

    dayOpportunities.forEach(opportunity => {
      const relatedRequests = requests.filter(r =>
        String(r.OpportunityID) === String(opportunity.OpportunityID)
      );

      const approved = relatedRequests.filter(r => r.Status === "Approved");
      const pending = relatedRequests.filter(r => r.Status === "Pending Approval");

      const openSlots = Number(opportunity.RemainingOpenings || 0);

      let cardClass = "calendar-card-open";
      if (openSlots === 0) cardClass = "calendar-card-full";
      if (pending.length > 0) cardClass = "calendar-card-pending";

      html += `
        <div class="calendar-event-card ${cardClass}">
          <strong>${opportunity.School || "School Not Listed"}</strong><br>
          ${opportunity.StartTime} - ${opportunity.EndTime}<br>
          <small>${opportunity.ProgramType || ""} ${opportunity.Fund ? " | " + opportunity.Fund : ""}</small>

          <p><strong>Needed:</strong> ${opportunity.CoachesNeeded || 0}</p>
          <p><strong>Open:</strong> ${openSlots}</p>

          <p><strong>Approved:</strong><br>
            ${approved.length > 0 ? approved.map(r => r.CoachName).join("<br>") : "None"}
          </p>

          <p><strong>Pending:</strong><br>
            ${pending.length > 0 ? pending.map(r => r.CoachName).join("<br>") : "None"}
          </p>
        </div>
      `;
    });

    html += `</div>`;
  });

  html += `</div>`;

  container.innerHTML = html;
}

function parseLocalDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const parts = String(value).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function getMonday(date) {
  const d = parseLocalDate(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateKey(date) {
  return formatDateInput(parseLocalDate(date));
}

loadManagerCalendar();
