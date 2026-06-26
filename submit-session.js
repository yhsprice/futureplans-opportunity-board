const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const currentUser = getCurrentUser();

const personIDField = document.getElementById("personID");
const dateField = document.getElementById("date");

let isSubmitting = false;

if (personIDField) {
  personIDField.value = currentUser.PersonID;
}

const submitButton = document.getElementById("submitButton");

submitButton.disabled = true;
submitButton.textContent = "Submitting...";

if (dateField && !dateField.value) {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  dateField.value = localDate;
}

showUserBanner();
showManagerLinksOnly();

function submitSession() {
  if (isSubmitting) {
    return;
  }

  const submitButton = document.querySelector("button[onclick='submitSession()']");

  const personID = currentUser.PersonID;
  const school = document.getElementById("school").value.trim();
  const date = document.getElementById("date").value;
  const programType = document.getElementById("programType").value;
  const fund = document.getElementById("fund").value;
  const notes = document.getElementById("notes").value.trim();
  const payRule = document.getElementById("payRule").value;
  const revolutionTier = document.getElementById("revolutionTier").value;

  if (!personID || !date || !programType || !fund || !payRule || !revolutionTier) {
    alert("Please complete Date, Program Type, Fund, Service Type, and Hours.");
    return;
  }

  isSubmitting = true;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
  }

  const url = `${API_URL}?action=submitSession`
    + `&personID=${encodeURIComponent(personID)}`
    + `&school=${encodeURIComponent(school)}`
    + `&date=${encodeURIComponent(date)}`
    + `&programType=${encodeURIComponent(programType)}`
    + `&fund=${encodeURIComponent(fund)}`
    + `&payRule=${encodeURIComponent(payRule)}`
    + `&revolutionTier=${encodeURIComponent(revolutionTier)}`
    + `&notes=${encodeURIComponent(notes)}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
    if (result.success) {
        alert("Time submitted for approval.");
        window.location.href = "my-requests.html";
    } else {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Time";
        alert(result.message || "Something went wrong.");
    }
})
    .catch(error => {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Time";

    alert("Something went wrong submitting the time.");
    console.error(error);
});
    .finally(() => {
      isSubmitting = false;

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Time";
      }
    });
}
