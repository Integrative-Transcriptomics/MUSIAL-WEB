SUCCESS_CODE = ""; // Code returned by the server for succ. requests.
FAILURE_CODE = ""; // Code returned by the server for faulty requests.
RESULT = ""; // Server session key to store results.
LOG = ""; // Server session key to store application log.
WWW = ""; // URL to access server.

/**
 *
 */
function init() {
  SUCCESS_CODE = API_PARAMETERS["SUCCESS_CODE"];
  FAILURE_CODE = API_PARAMETERS["FAILURE_CODE"];
  RESULT = API_PARAMETERS["RESULT_KEY"];
  LOG = API_PARAMETERS["APPLICATION_LOG_KEY"];
  WWW = API_PARAMETERS["URL"];
  checkForSession();
  $("#menu")[0].style.display = "flex";
  $(".main")[0].style.display = "block";
  $("#menu-active-session-indicator").on("click", () => {
    axios
      .get(WWW + "/log")
      .then((response) => {
        let text = "";
        console.log(response);
        if (response.data == FAILURE_CODE) {
          text = `No application log was retrievable from our server. This may be caused by:
          <ul>
            <li>No log data is stored in your session.</li>
            <li>Your session was deleted.</li>
            <li>No connection to the server could be established.</li>
          </ul>`;
        } else {
          text = response.data[LOG];
        }
        Swal.fire({
          iconHtml: `<i style="color: #6d81ad;" class="fa-duotone fa-notebook fa-lg"></i>`,
          title: "Application Log",
          html:
            `
          <div class="p-2 text-ultralight text-left" style="white-space: pre-line; border-radius: 4px; background-color: #cbd0e0;">
          ` +
            text +
            `
          </div>
          `,
          width: "60vw",
          padding: "0.5em",
          position: "center",
          showCancelButton: false,
          grow: true,
          heightAuto: true,
          confirmButtonColor: "#6d81ad",
          confirmButtonText: "Close",
          color: "#747474",
          background: "#fafafcd9",
          backdrop: `
            rgba(239, 240, 248, 0.1)
            left top
            no-repeat
          `,
        });
      })
      .catch((error) => {
        handleError(error);
      });
  });
}

/**
 *
 * @param {*} response
 */
function handleResponseCode(response) {
  if (response.data == FAILURE_CODE) {
    Swal.fire({
      iconHtml: `<i class="error-icon fa-duotone fa-triangle-exclamation"></i>`,
      title: "Error",
      confirmButtonColor: "#6d81ad",
      color: "#747474",
      background: "#fafafcd9",
      backdrop: `
            rgba(96, 113, 150, 0.4)
            left top
            no-repeat
          `,
      html: `
        <div class="remark secondary text-left">
            An error occurred.
            Please check your input/session data.
            You can access the server log by clicking the <i class="fa-duotone fa-circle-notch" style="color: #fe4848;"></i> icon.
            If you cannot solve your problem, feel free to open an issue <a href='https://github.com/Integrative-Transcriptomics/MUSIAL/issues' target='_blan'>here</a>.
        </div>
      `,
    });
  }
}

/**
 *
 * @param {*} text
 */
function displayWarning(text) {
  Swal.fire({
    iconHtml: `<i class="warning-icon fa-duotone fa-circle-info"></i>`,
    title: "Caution",
    confirmButtonColor: "#6d81ad",
    text: text,
  });
}

/**
 *
 * @param {*} error
 */
function handleError(error) {
  Swal.fire({
    iconHtml: `<i class="error-icon fa-duotone fa-triangle-exclamation"></i>`,
    title: "Error",
    confirmButtonColor: "#6d81ad",
    color: "#747474",
    background: "#fafafcd9",
    backdrop: `
            rgba(96, 113, 150, 0.4)
            left top
            no-repeat
          `,
    html:
      `
        <div class="remark secondary text-left">
            An error occurred.
            Please check your input/session data.
            You can access the server log by clicking the <i class="fa-duotone fa-circle-notch" style="color: #fe4848;"></i> icon.
            If you cannot solve your problem, feel free to open an issue <a href='https://github.com/Integrative-Transcriptomics/MUSIAL/issues' target='_blan'>here</a>.
        </div>
        <div class="remark secondary text-left"><span class="input-info-tag">LOG:</span><br>
            ` +
      error.message +
      `
        </div>
      `,
  });
}

/**
 *
 * @param {*} blob
 * @param {*} name
 */
function downloadBlob(blob, name) {
  var download_link = document.createElement("a");
  download_link.href = window.URL.createObjectURL(new Blob([blob]));
  download_link.download = name;
  download_link.click();
  download_link.remove();
}

/**
 *
 */
function checkForSession() {
  let COLOR_NONE = "#eff0f8";
  let COLOR_OK = "#39c093";
  let COLOR_ERROR = "#fe4848";
  axios
    .get(WWW + "/has_session")
    .then((response) => {
      if (response.data == SUCCESS_CODE) {
        $("#menu-active-session-indicator")[0].style.color = COLOR_OK;
        $("#menu-link-results").attr("disabled", false);
      } else if (response.data == FAILURE_CODE) {
        $("#menu-active-session-indicator")[0].style.color = COLOR_NONE;
        $("#menu-link-results").attr("disabled", true);
      } else if (response.data == APPLICATION_ISSUE_CODE) {
        $("#menu-active-session-indicator")[0].style.color = COLOR_ERROR;
        $("#menu-link-results").attr("disabled", true);
      } else {
        $("#menu-active-session-indicator")[0].style.color = COLOR_NONE;
        $("#menu-link-results").attr("disabled", true);
      }
    })
    .catch((error) => {
      handleError(error);
    });
}

function htmlToElement(html) {
  var template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

/***
 *
 */
function displayLoader(text, timeout) {
  var loaderContainer = document.createElement("div");
  loaderContainer.id = "loader-container";
  loaderContainer.innerHTML =
    `<img src="` +
    LOADING_GIF +
    `" style="height: 100px; width: 100px; pointer-events: none; user-select: none;">`;
  loaderContainer.style.cssText =
    "position:absolute; right:1vh; bottom:1vh; width:100px; height:100px; opacity:1.0; z-index:10; background: transparent;";
  document.body.appendChild(loaderContainer);
  Metro.toast.create(
    `<small>` + text + `</small>`,
    () => {},
    timeout,
    "loader-toast"
  );
}

/**
 *
 */
function hideLoader() {
  $("#loader-container")[0].remove();
  $(".loader-toast")[0].remove();
}
