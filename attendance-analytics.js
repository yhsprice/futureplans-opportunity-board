const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();
showManagerLinksOnly();

const analyticsMessage =
  document.getElementById("analyticsMessage");

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "attendanceJsonp_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000);

    const script = document.createElement("script");

    window[callbackName] = function(data) {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.src =
      url +
      "&callback=" +
      encodeURIComponent(callbackName);

    script.onerror = function(event) {
      delete window[callbackName];
      script.remove();
      reject(event);
    };

    document.body.appendChild(script);
  });
}

async function loadAttendanceAnalytics() {
  analyticsMessage.textContent =
    "Loading attendance data...";

  try {
    const rows = await jsonp(
      `${API_URL}?action=getAttendanceAnalytics`
    );

    console.log("Attendance analytics rows:", rows);

    if (rows && rows.success === false) {
      throw new Error(
        rows.message || "Apps Script returned an error."
      );
    }

    if (!Array.isArray(rows)) {
      throw new Error(
        "Attendance Analytics did not return a list of rows."
      );
    }

    analyticsMessage.textContent =
      `${rows.length} attendance record(s) loaded.`;

  } catch (error) {
    console.error(
      "Attendance Analytics error:",
      error
    );

    analyticsMessage.textContent =
      `Something went wrong: ${error.message || "Unknown error"}`;
  }
}

loadAttendanceAnalytics();
