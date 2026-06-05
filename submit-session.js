const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const currentUser = getCurrentUser();

document.getElementById("personID").value = currentUser.PersonID;

showUserBanner();
showManagerLinksOnly();

function submitSession() {
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
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong submitting the time.");
      console.error(error);
    });
}
