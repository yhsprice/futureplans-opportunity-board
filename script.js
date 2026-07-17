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

  const programType = String(opportunity.ProgramType || "").trim();

if (
  programType === "Adult" &&
  currentUser.AdultApproved !== "Yes" &&
  currentUser.Role !== "Manager"
) {
  return false;
}

  const userRole = String(currentUser.Role || "").trim();
  const userTier = Number(currentUser.Tier || 2);

  if (userRole === "Manager") {
  return true;
}

// Tier 0 = Inactive
if (userTier === 0) {
  return false;
}

const postedDate = new Date(opportunity.DatePosted);
const now = new Date();
const hoursSincePosted =
  (now - postedDate) / (1000 * 60 * 60);

// Tier 4 = Immediate
if (userTier === 4) {
  return true;
}

// Tier 3 = 4 hours
if (userTier === 3) {
  return hoursSincePosted >= 4;
}

// Tier 2 = 6 hours
if (userTier === 2) {
  return hoursSincePosted >= 6;
}

// Tier 1 = 8 hours
if (userTier === 1) {
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

const grouped = {};

openOpportunities.forEach(opportunity => {
  const dateKey = opportunity.Date || "No Date";
  const schoolKey = opportunity.School || "School Not Listed";

  if (!grouped[dateKey]) {
    grouped[dateKey] = {};
  }

  if (!grouped[dateKey][schoolKey]) {
    grouped[dateKey][schoolKey] = [];
  }

  grouped[dateKey][schoolKey].push(opportunity);
});

let html = "";

Object.keys(grouped)
  .sort((a, b) => new Date(a) - new Date(b))
  .forEach(dateKey => {

    html += `
      <div class="date-group">
        <h2>${formatDate(dateKey)}</h2>
    `;

    Object.keys(grouped[dateKey])
      .sort()
      .forEach(schoolKey => {

        const schoolOpportunities = grouped[dateKey][schoolKey];

        schoolOpportunities.sort((a, b) => {
          const timeA = new Date(`${a.Date} ${a.StartTime}`);
          const timeB = new Date(`${b.Date} ${b.StartTime}`);
          return timeA - timeB;
        });

        const programType = schoolOpportunities[0].ProgramType || "Not Listed";
        const fund = schoolOpportunities[0].Fund || "Not Listed";
        const cop = schoolOpportunities[0].COP || "Not Listed";

        const totalOpenings = schoolOpportunities.reduce((sum, opportunity) => {
          return sum + Number(opportunity.RemainingOpenings || 0);
        }, 0);

        html += `
          <div class="school-box">
            <div class="school-box-header">
              <div>
                <h3>${schoolKey}</h3>
                <p>${programType} • ${fund} • COP: ${cop}</p>
              </div>

              <div class="school-summary">
  ${schoolOpportunities.length} time slot(s) • ${totalOpenings} total opening(s)
  <br><br>
  <button onclick="reserveSelected('${dateKey}', '${schoolKey}')">
    Reserve Selected
  </button>
</div>
            </div>

            <table class="modern-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Openings</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
        `;

        schoolOpportunities.forEach(opportunity => {
          const openings = Number(opportunity.RemainingOpenings || 0);
          const isFilled = openings <= 0;

          html += `
            <tr>
              <td>
                ${formatTime(opportunity.StartTime)}
                -
                ${formatTime(opportunity.EndTime)}
              </td>

              <td>
                ${isFilled ? "Filled" : `${openings} Open`}
              </td>

             <td>
  ${
    isFilled
      ? `<span class="status-badge filled">Filled</span>`
      : `
        <label>
          <input
            type="checkbox"
            class="reserve-checkbox"
            data-date="${dateKey}"
            data-school="${schoolKey}"
            value="${opportunity.OpportunityID}"
          >
          Select
        </label>
      `
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
      });

    html += `
      </div>
    `;
  });

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

async function reserveSelected(dateKey, schoolKey) {
  const selected = Array.from(document.querySelectorAll(".reserve-checkbox"))
    .filter(box =>
      box.checked &&
      box.dataset.date === dateKey &&
      box.dataset.school === schoolKey
    )
    .map(box => box.value);

  if (selected.length === 0) {
    alert("Please select at least one time slot.");
    return;
  }

  const confirmRequest = confirm(
    `Reserve ${selected.length} selected time slot(s) at ${schoolKey}?`
  );

  if (!confirmRequest) {
    return;
  }

  let successCount = 0;
  let failMessages = [];

  for (const opportunityID of selected) {
    const personID = currentUser.PersonID;

    const url = `${API_URL}?action=request`
      + `&opportunityID=${encodeURIComponent(opportunityID)}`
      + `&personID=${encodeURIComponent(personID)}`;

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        successCount++;
      } else {
        failMessages.push(result.message || "One request failed.");
      }

    } catch (error) {
      console.error(error);
      failMessages.push("One request failed due to a connection error.");
    }
  }

  let message = `${successCount} request(s) submitted.`;

  if (failMessages.length > 0) {
    message += `\n\nSome could not be submitted:\n` + failMessages.join("\n");
  }

  alert(message);
  loadOpportunities();
}

loadOpportunities();
