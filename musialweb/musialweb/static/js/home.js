/* MUSIAL (Webserver) | Simon Hackl - simon.hackl@uni-tuebingen.de | v1.2.0 | GPL-3.0 license | github.com/Integrative-Transcriptomics/MUSIAL-WEB */

/**
 * Returns the example dataset from the webserver as download.
 */
function getExampleData() {
  log_interaction("Request Example Data.");
  axios
    .get(_URL + "/example/data")
    .then((response) => {
      if (assessResponse(response)) {
        downloadBlob(response.data, "example_data.zip");
      }
    })
    .catch((error) => {
      alertError(error.message);
    });
}

/**
 * Starts the example session at the webserver.
 */
function startExampleSession() {
  log_interaction("Request Example Session.");
  axios
    .get(_URL + "/example/session")
    .then((response) => {
      if (assessResponse(response)) {
        window.location.href = _URL + "/results";
      }
    })
    .catch((error) => {
      alertError(error.message);
    });
}

/**
 * Redirect to the source code of the project in a new tab.
 */
function redirectSource() {
  window.open(
    "https://github.com/Integrative-Transcriptomics/MUSIAL",
    "_blank"
  );
}

/**
 * Redirect to the help page of the project in a new tab.
 */
function redirectHelp() {
  window.open(_URL + "/help", "_blank");
}
