const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const tableContainer =
  document.getElementById(
    "employeeTableContainer"
  );

const formContainer =
  document.getElementById(
    "employeeFormContainer"
  );

let people = [];

const currentUser = getCurrentUser();

if (
  !currentUser ||
  String(currentUser.Role || "")
    .trim()
    .toLowerCase() !== "manager"
) {
  alert(
    "This page is available to managers only."
  );

  window.location.href =
    "coach-dashboard.html";
}

showUserBanner();
showManagerLinksOnly();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getActiveValue(person) {
  return String(
    person.Active ??
    person.ActiveStatus ??
    "No"
  ).trim();
}

function formatInputDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (isNaN(date)) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function managerParameters() {
  return (
    `&managerPersonID=${encodeURIComponent(
      currentUser.PersonID
    )}` +
    `&managerEmail=${encodeURIComponent(
      currentUser.Email
    )}`
  );
}

async function loadPeople() {
  tableContainer.innerHTML = `
    <div class="dashboard-card">
      <p>Loading employees...</p>
    </div>
  `;

  try {
    const currentUser = getCurrentUser();

    const params = new URLSearchParams({
      action: "getPeopleForManagement",
      managerEmail: currentUser?.Email || ""
    });

    const response = await fetch(
      `${API_URL}?${params.toString()}`
    );

    const responseText = await response.text();

    console.log(
      "Load employees response:",
      responseText
    );

    let result;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        "Apps Script returned an invalid response. " +
        "Open Apps Script and check Executions for the exact error."
      );
    }

    if (!result.success) {
      throw new Error(
        result.message ||
        "Employees could not be loaded."
      );
    }

    people = Array.isArray(result.people)
      ? result.people
      : [];

    renderPeopleTable();

  } catch (error) {
    console.error(error);

    tableContainer.innerHTML = `
      <div class="dashboard-card">
        <p>
          ${escapeHtml(
            error.message ||
            "Employees could not be loaded."
          )}
        </p>
      </div>
    `;
  }
}

function renderPeopleTable() {
  const search = String(
    document.getElementById(
      "employeeSearch"
    )?.value || ""
  )
    .trim()
    .toLowerCase();

  const filteredPeople = people
    .filter(person => {
      const text = [
        person.Name,
        person.Email,
        person.Type,
        person.Role
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    })
    .sort((a, b) =>
      String(a.Name || "").localeCompare(
        String(b.Name || "")
      )
    );

  let html = `
    <div class="dashboard-card">

      <div style="overflow-x:auto;">

        <table class="modern-table">

          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Role</th>
              <th>Tier</th>
              <th>Adult</th>
              <th>Shadowed</th>
              <th>Active</th>
              <th>Edit</th>
            </tr>
          </thead>

          <tbody>
  `;

  filteredPeople.forEach(person => {
    html += `
      <tr>

        <td>
          <strong>
            ${escapeHtml(person.Name)}
          </strong>

          <div style="
            font-size:12px;
            opacity:.75;
          ">
            ${escapeHtml(person.Email)}
          </div>
        </td>

        <td>
          ${escapeHtml(person.Type || "")}
        </td>

        <td>
          ${escapeHtml(person.Role || "")}
        </td>

        <td>
          ${escapeHtml(
            person.Tiers ?? ""
          )}
        </td>

        <td>
          ${escapeHtml(
            person.AdultApproved || "No"
          )}
        </td>

        <td>
          ${escapeHtml(
            person.Shadowed || "No"
          )}
        </td>

        <td>
          ${escapeHtml(
            getActiveValue(person)
          )}
        </td>

        <td>
          <button
            onclick="openEditPersonForm(
              '${escapeHtml(person.PersonID)}'
            )"
          >
            Edit
          </button>
        </td>

      </tr>
    `;
  });

  if (filteredPeople.length === 0) {
    html += `
      <tr>
        <td colspan="8">
          No employees matched your search.
        </td>
      </tr>
    `;
  }

  html += `
          </tbody>
        </table>

      </div>
    </div>
  `;

  tableContainer.innerHTML = html;
}

function openAddPersonForm() {
  renderPersonForm(null);
}

function openEditPersonForm(personID) {
  const person = people.find(item =>
    String(item.PersonID) ===
    String(personID)
  );

  if (!person) {
    alert("The employee could not be found.");
    return;
  }

  renderPersonForm(person);
}

function option(value, selectedValue) {
  return `
    <option
      value="${escapeHtml(value)}"
      ${
        String(value) ===
        String(selectedValue)
          ? "selected"
          : ""
      }
    >
      ${escapeHtml(value)}
    </option>
  `;
}

function renderPersonForm(person) {
  const editing = Boolean(person);

  const active =
    editing
      ? getActiveValue(person)
      : "Yes";

  formContainer.innerHTML = `
    <div
      class="dashboard-card"
      style="margin-bottom:20px;"
    >

      <h2>
        ${
          editing
            ? "Edit Employee"
            : "Add Employee or COP"
        }
      </h2>

      <input
        id="editPersonID"
        type="hidden"
        value="${
          editing
            ? escapeHtml(person.PersonID)
            : ""
        }"
      >

      <div style="
        display:grid;
        grid-template-columns:
          repeat(auto-fit, minmax(220px, 1fr));
        gap:16px;
      ">

        <label>
          Name
          <input
            id="personName"
            type="text"
            value="${
              editing
                ? escapeHtml(person.Name)
                : ""
            }"
          >
        </label>

        <label>
          Email
          <input
            id="personEmail"
            type="email"
            value="${
              editing
                ? escapeHtml(person.Email)
                : ""
            }"
          >
        </label>

        <label>
          Type
          <select id="personType">
            ${option(
              "Coach",
              editing ? person.Type : "Coach"
            )}
            ${option(
              "COP",
              editing ? person.Type : ""
            )}
            ${option(
              "Staff",
              editing ? person.Type : ""
            )}
            ${option(
              "Sup",
              editing ? person.Type : ""
            )}
          </select>
        </label>

        <label>
          Role
          <select id="personRole">
            ${option(
              "Coach",
              editing ? person.Role : "Coach"
            )}
            ${option(
              "COP",
              editing ? person.Role : ""
            )}
            ${option(
              "Manager",
              editing ? person.Role : ""
            )}
          </select>
        </label>

        <label>
          Tier
          <select id="personTier">
            ${[0, 1, 2, 3, 4]
              .map(tier =>
                option(
                  tier,
                  editing
                    ? person.Tiers
                    : 0
                )
              )
              .join("")}
          </select>
        </label>

        <label>
          Active
          <select id="personActive">
            ${option("Yes", active)}
            ${option("No", active)}
          </select>
        </label>

        <label>
          Receive Emails
          <select id="personReceiveEmails">
            ${option(
              "Yes",
              editing
                ? person.ReceiveEmails
                : "Yes"
            )}
            ${option(
              "No",
              editing
                ? person.ReceiveEmails
                : ""
            )}
          </select>
        </label>

        <label>
          Adult Approved
          <select id="personAdultApproved">
            ${option(
              "Yes",
              editing
                ? person.AdultApproved
                : "No"
            )}
            ${option(
              "No",
              editing
                ? person.AdultApproved
                : "No"
            )}
          </select>
        </label>

        <label>
          Shadowed
          <select id="personShadowed">
            ${option(
              "Yes",
              editing
                ? person.Shadowed
                : "No"
            )}
            ${option(
              "No",
              editing
                ? person.Shadowed
                : "No"
            )}
          </select>
        </label>

        <label>
          Shadowed By
          <input
            id="personShadowedBy"
            type="text"
            value="${
              editing
                ? escapeHtml(
                    person.ShadowedBy || ""
                  )
                : ""
            }"
          >
        </label>

        <label>
          Hire Date
          <input
            id="personHireDate"
            type="date"
            value="${
              editing
                ? formatInputDate(
                    person["Hire Date"]
                  )
                : ""
            }"
          >
        </label>

        <label>
          Birthday
          <input
            id="personBirthday"
            type="date"
            value="${
              editing
                ? formatInputDate(
                    person.Birthday
                  )
                : ""
            }"
          >
        </label>

        <label>
          ${
            editing
              ? "New Password (leave blank to keep current)"
              : "Temporary Password"
          }

          <input
            id="personPassword"
            type="text"
          >
        </label>

      </div>

      <div style="
        margin-top:20px;
        display:flex;
        gap:10px;
      ">

        <button onclick="savePerson()">
          Save
        </button>

        <button
          type="button"
          onclick="closePersonForm()"
        >
          Cancel
        </button>

      </div>

    </div>
  `;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function closePersonForm() {
  formContainer.innerHTML = "";
}

async function savePerson() {
  const personID = String(
    document.getElementById(
      "editPersonID"
    ).value || ""
  ).trim();

  const name = document.getElementById(
    "personName"
  ).value.trim();

  const email = document.getElementById(
    "personEmail"
  ).value.trim();

  const password =
    document.getElementById(
      "personPassword"
    ).value.trim();

  if (!name || !email) {
    alert("Name and email are required.");
    return;
  }

  if (!personID && !password) {
    alert(
      "A temporary password is required for a new person."
    );

    return;
  }

  const action = personID
    ? "updatePersonFromManagement"
    : "addPersonFromManagement";

  const params = new URLSearchParams({
    action: action,
    personID: personID,
    name: name,
    email: email,
    type:
      document.getElementById(
        "personType"
      ).value,
    role:
      document.getElementById(
        "personRole"
      ).value,
    tiers:
      document.getElementById(
        "personTier"
      ).value,
    active:
      document.getElementById(
        "personActive"
      ).value,
    receiveEmails:
      document.getElementById(
        "personReceiveEmails"
      ).value,
    adultApproved:
      document.getElementById(
        "personAdultApproved"
      ).value,
    shadowed:
      document.getElementById(
        "personShadowed"
      ).value,
    shadowedBy:
      document.getElementById(
        "personShadowedBy"
      ).value.trim(),
    hireDate:
      document.getElementById(
        "personHireDate"
      ).value,
    birthday:
      document.getElementById(
        "personBirthday"
      ).value,
    password: password,
    managerPersonID:
      currentUser.PersonID,
    managerEmail:
      currentUser.Email
  });

  try {
    const response = await fetch(
      `${API_URL}?${params.toString()}`
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.message ||
        "The employee could not be saved."
      );
    }

    alert(result.message);

    closePersonForm();
    await loadPeople();

  } catch (error) {
    console.error(error);

    alert(
      error.message ||
      "The employee could not be saved."
    );
  }
}

loadPeople();
