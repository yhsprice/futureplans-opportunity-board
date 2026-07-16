const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const currentUser = getCurrentUser();

const personIDField = document.getElementById("personID");
const dateField = document.getElementById("date");
const schoolField = document.getElementById("school");
const programTypeField = document.getElementById("programType");
const fundField = document.getElementById("fund");
const payRuleField = document.getElementById("payRule");
const hoursField = document.getElementById("revolutionTier");
const appointmentOutcomeField =
  document.getElementById("appointmentOutcome");
const outcomeSection = document.getElementById("outcomeSection");
const outcomeReasonField = document.getElementById("outcomeReason");
const outcomeDetailsField = document.getElementById("outcomeDetails");
const notesField = document.getElementById("notes");
const submitButton = document.getElementById("submitButton");

let isSubmitting = false;

if (!currentUser || !currentUser.PersonID) {
  alert("Please log in again.");
  window.location.href = "login.html";
}

if (personIDField) {
  personIDField.value = currentUser.PersonID;
}

if (dateField && !dateField.value) {
  const today = new Date();

  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  )
    .toISOString()
    .split("T")[0];

  dateField.value = localDate;
}

function updateOutcomeSection() {
  const outcome = appointmentOutcomeField.value;
  const needsReason = outcome !== "" && outcome !== "Completed";

  outcomeSection.style.display = needsReason ? "block" : "none";

  if (!needsReason) {
    outcomeReasonField.value = "";
    outcomeDetailsField.value = "";
  }
}

appointmentOutcomeField.addEventListener(
  "change",
  updateOutcomeSection
);

updateOutcomeSection();

showUserBanner();
showManagerLinksOnly();

function submitSession() {
  if (isSubmitting) {
    return;
  }

  const personID = currentUser.PersonID;
  const school = schoolField.value.trim();
  const date = dateField.value;
  const programType = programTypeField.value;
  const fund = fundField.value;
  const payRule = payRuleField.value;
  const revolutionTier = hoursField.value;
  const appointmentOutcome = appointmentOutcomeField.value;
  const outcomeReason = outcomeReasonField.value;
  const outcomeDetails = outcomeDetailsField.value.trim();
  const notes = notesField.value.trim();

  if (
    !personID ||
    !date ||
    !programType ||
    !fund ||
    !payRule ||
    !revolutionTier ||
    !appointmentOutcome
  ) {
    alert(
      "Please complete Date, Program Type, Fund, Service Type, Hours, and Appointment Outcome."
    );
    return;
  }

  if (
    appointmentOutcome !== "Completed" &&
    !outcomeReason
  ) {
    alert(
      "Please select a reason for the appointment outcome."
    );
    return;
  }

  isSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  const params = new URLSearchParams({
    action: "submitSession",
    personID,
    school,
    date,
    programType,
    fund,
    payRule,
    revolutionTier,
    appointmentOutcome,
    outcomeReason,
    outcomeDetails,
    notes,
    paidWithoutService:
      appointmentOutcome === "Completed" ? "No" : "Yes"
  });

  const url = `${API_URL}?${params.toString()}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Time submitted for approval.");
        window.location.href = "my-requests.html";
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      console.error("Submit time error:", error);
      alert("Something went wrong submitting the time.");
    })
    .finally(() => {
      isSubmitting = false;
      submitButton.disabled = false;
      submitButton.textContent = "Submit Time";
    });
}
