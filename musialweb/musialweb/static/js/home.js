/* MUSIAL (Webserver) | Simon Hackl - simon.hackl@uni-tuebingen.de | v1.2.0 | GPL-3.0 license | github.com/Integrative-Transcriptomics/MUSIAL-WEB */

/**
 * Requests a downloadable Blob with example data from the webserver.
 */
function getExampleData() {
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
 * Requests to start an example session with information from the webserver.
 */
function startExampleSession() {
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
 * Redirects to the GitHub repository of the project in a new tab.
 */
function redirectSource() {
  window.open(
    "https://github.com/Integrative-Transcriptomics/MUSIAL",
    "_blank"
  );
}

/**
 * Redirects to the help page of the project in a new tab.
 */
function redirectHelp() {
  window.open(_URL + "/help", "_blank");
}
