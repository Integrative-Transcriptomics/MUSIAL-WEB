/* MUSIAL (Webserver) | Simon Hackl - simon.hackl@uni-tuebingen.de | v1.2.0 | GPL-3.0 license | github.com/Integrative-Transcriptomics/MUSIAL-WEB */

REQUEST_SUCCESS = ""; // Code returned by the server for succ. requests.
REQUEST_FAILURE = ""; // Code returned by the server for faulty requests.
SESSION_STATE_NONE = ""; // Code indicating no active session.
SESSION_STATE_ACTIVE = ""; // Code indicating an active session.
SESSION_STATE_FAILED = ""; // Code indicating a failed session.
SESSION_RESULT = ""; // Server session key to access results.
_URL = ""; // URL to access server.

/**
 * Initializes global application settings and checks for an active session.
 */
function init() {
  REQUEST_SUCCESS = API_PARAMETERS["REQUEST_SUCCESS"];
  REQUEST_FAILURE = API_PARAMETERS["REQUEST_FAILURE"];
  SESSION_STATE_NONE = API_PARAMETERS["SESSION_STATE_NONE"];
  SESSION_STATE_ACTIVE = API_PARAMETERS["SESSION_STATE_ACTIVE"];
  SESSION_STATE_FAILED = API_PARAMETERS["SESSION_STATE_FAILED"];
  SESSION_RESULT = API_PARAMETERS["SESSION_RESULT"];
  _URL = API_PARAMETERS["URL"];
  // Check for session status.
  displaySessionState();
  // Display main component.
  $("#menu")[0].style.display = "flex";
  $(".main")[0].style.display = "block";
}

/**
 * Displays an error popup with the specified text.
 *
 * @param {String} text Text to display in advance to generic information in the error popup.
 */
function alertError(text) {
  Swal.fire({
    title: "Error",
    html:
      `Your request failed. Please check your input data. You can access the server log <a href='` +
      _URL +
      `/session/log' target='_blank'>here</a>. If you cannot solve your problem, feel free to <a href='https://github.com/Integrative-Transcriptomics/MUSIAL-WEB/issues' target='_blank'>open an issue</a>.` +
      `</br><div class='remark alert'>` +
      text +
      `</div>`,
    color: "#747474",
    background: "#fafafcd9",
    allowOutsideClick: true,
    allowEscapeKey: true,
    showConfirmButton: true,
    focusConfirm: true,
    confirmButtonColor: "#6d81ad",
    confirmButtonText: "Ok",
    backdrop: `rgba(239, 240, 248, 0.1) left top no-repeat`,
  });
}

/**
 * Displays a warning popup with the specified text.
 *
 * @param {String} text Text to display in advance to generic information in the warning popup.
 */
function alertWarning(text) {
  Swal.fire({
    iconHtml: `<i class="warning-icon fa-duotone fa-circle-info"></i>`,
    title: "Warning",
    confirmButtonColor: "#6d81ad",
    text: text,
  });
}

/**
 * Assesses the response object; Alerts an error popup if the response yields a failure code.
 *
 * @param {JSON} response JSON response sent by the MUSIAL web api.
 */
function assessResponse(response) {
  if (response.data.code == REQUEST_FAILURE) {
    alertError(response.data.cause);
    return false;
  } else {
    return true;
  }
}

/**
 * Provides a blob as a downloadable file.
 *
 * @param {Blob} blob The file-like blob object whose content is stored.
 * @param {String} name The name of the file to store the specified blob.
 */
function downloadBlob(blob, name) {
  var download_link = document.createElement("a");
  download_link.href = window.URL.createObjectURL(new Blob([blob]));
  download_link.download = name;
  download_link.click();
  download_link.remove();
}

/**
 * Displays the session state in the session indicatior element.
 */
function displaySessionState() {
  axios
    .get(_URL + "/session/status")
    .then((response) => {
      switch (String(response.data.code)) {
        case SESSION_STATE_ACTIVE:
          $("#menu-active-session-indicator")[0].classList =
            "p-2 fa-duotone fa-hexagon-check";
          break;
        case SESSION_STATE_FAILED:
          $("#menu-active-session-indicator")[0].classList =
            "p-2 fa-duotone fa-hexagon-exclamation";
          break;
        case SESSION_STATE_NONE:
          $("#menu-active-session-indicator")[0].classList =
            "p-2 fa-duotone fa-hexagon";
          break;
      }
    })
    .catch((error) => {
      alertError(error.message);
    });
}

/**
 * Displays a notification with the specified text.
 *
 * @param {String} text Text to display in the notification.
 */
function displayNotification(text) {
  $("body").append(
    `<div class='notification'><i class="fa-duotone fa-circle-info fa-fade fa-xs"></i> ` +
      text +
      `</div>`
  );
}

/**
 * Removes all notification elements from the document.
 */
function removeNotification() {
  $(".notification").remove();
}

/**
 * Requests to write specified content into the session log.
 *
 * @param {String} content Content to write to session log.
 */
function log_interaction(content) {
  axios.put(
    _URL + "/log_interaction",
    pako.deflate(JSON.stringify({ content: content })),
    {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "zlib",
      },
    }
  );
}
