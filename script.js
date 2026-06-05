const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const currentUser = getCurrentUser();

showUserBanner();
showManagerLinksOnly();

const container = document.getElementById("opportunityList");

function formatDate(value) {
  const date = new Date(value);
  if (isNaN(date)) return value || "";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatTime(value) {
  const time = new Date(value);
  if (isNaN(time)) return value || "";

  return time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  });
}

function canUserSeeOpportunity(opportunity) {
  const openings = Number(opportunity.RemainingOpenings || 0);
  const status = String(opportunity.OpportunityStatus || "Open").trim();
  const replacementNeeded = String(opportunity.ReplacementNeeded || "").trim();

  if (status !== "Open") {
    return false;
  }

  if (!(openings > 0 || replacementNeeded === "Yes")) {
    return false;
  }

  const userRole = String(currentUser.Role || "").trim();
  const userTier = Number(currentUser.Tier || 2);

  if (userRole === "Manager" || userTier === 0) {
    return true;
  }

  if (userTier === 1) {
    return true;
  }

  if (userTier === 2) {
    const postedDate = new Date(opportunity.DatePosted);
    const now = new Date();
    const hoursSincePosted = (now - postedDate) / (1000 * 60 * 60);

    return hoursSincePosted >= 8;
  }

  return false;
}

async function loadOpportunities() {
  container.innerHTML = "<p>Loading opportunities...</p>";

  try {
    const response = await fetch(API_URL);
    const opportunities = await response.json();

    const openOpportunities = opportunities
      .filter(canUserSeeOpportunity)
      .sort((a, b) => {
        const replacementA = String(a.ReplacementNeeded || "").trim() === "Yes" ? 0 : 1;
        const replacementB = String(b.ReplacementNeeded || "").trim() === "Yes" ? 0 : 1;

        if (replacementA !== replacementB) {
          return replacementA - replacementB;
        }

        const dateA = new Date(`${a.Date} ${a.StartTime}`);
        const dateB = new Date(`${b.Date} ${b.StartTime}`);
        return dateA - dateB;
      });

    if (openOpportunities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h2>🎯 You're All Caught Up!</h2>
          <p>There are currently no open coaching opportunities available.</p>
          <p>Keep an eye out—new opportunities are posted throughout the week.</p>
        </div>
      `;
      return;
    }

    let html = `
      let html = `
  <div class="dashboard-card">
    <table class="modern-table">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px;">Date</th>
              <th style="text-align:left; padding:8px;">Start</th>
              <th style="text-align:left; padding:8px;">End</th>
              <th style="text-align:left; padding:8px; min-width:220px;">School</th>
              <th style="text-align:left; padding:8px;">Open</th>
              <th style="text-align:left; padding:8px;">Program</th>
              <th style="text-align:left; padding:8px;">Action</th>
            </tr>
          </thead>
          <tbody>
    `;

  openOpportunities.forEach(opportunity => {
  const openings = Number(opportunity.RemainingOpenings || 0);

  html += `
    <tr>
      <td style="padding:8px; white-space:nowrap;">
        ${formatDate(opportunity.Date)}
      </td>

      <td style="padding:8px; white-space:nowrap;">
        ${formatTime(opportunity.StartTime)}
      </td>

      <td style="padding:8px; white-space:nowrap;">
        ${formatTime(opportunity.EndTime)}
      </td>

      <td style="padding:8px; min-width:220px;">
        ${opportunity.School || "School Not Listed"}
      </td>

      <td style="padding:8px;">
        ${openings}
      </td>

      <td style="padding:8px;">
        ${opportunity.ProgramType || "Not listed"}
      </td>

      <td style="padding:8px;">
        <button onclick="requestOpportunity('${opportunity.OpportunityID || ""}')">
          Request
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
    container.innerHTML = "<p>Something went wrong loading opportunities.</p>";
    console.error(error);
  }
}

async function requestOpportunity(opportunityID) {
  if (!opportunityID || opportunityID === "null" || opportunityID === "undefined") {
    alert("This opportunity is missing an ID. Please refresh the page or contact the manager.");
    return;
  }

  const confirmRequest = confirm(
    "By requesting this opportunity, you are accepting responsibility for this assignment. If you later cannot attend, you are responsible for notifying management and helping find a replacement. Continue?"
  );

  if (!confirmRequest) {
    return;
  }

  const personID = currentUser.PersonID;

  const url = `${API_URL}?action=request&opportunityID=${encodeURIComponent(opportunityID)}&personID=${encodeURIComponent(personID)}`;

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      alert(result.message);
      return;
    }

    alert("Request submitted for manager approval!");

    setTimeout(() => {
      loadOpportunities();
    }, 1500);

  } catch (error) {
    alert("Something went wrong submitting the request.");
    console.error(error);
  }
}

loadOpportunities();
