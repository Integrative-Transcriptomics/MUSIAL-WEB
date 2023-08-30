var _OVERVIEW_TABLE;
var _SESSION_DATA = {
  hasData: false,
  samplesRecord: {},
  featuresRecord: {},
  variantsRecord: {},
};
var tableDefinition = undefined;
var tableData = undefined;
var tableActiveType = undefined;
var tableFilter = [];
var tableGroup = [];
var tableCurrentSamples = [];
var tableCurrentFeatures = [];

axios
  .get(_URL + "/session_status")
  .then((response) => {
    switch (String(response.data)) {
      case API_PARAMETERS["SESSION_CODE_FAILED"]:
        Swal.fire({
          title: "Faulty Session Data",
          html: `Your request failed. Please check your input data.
            You can access the server log by clicking the <i class="fa-duotone fa-hexagon-exclamation"></i> icon.
            If you cannot solve your problem, feel free to <a href='https://github.com/Integrative-Transcriptomics/MUSIAL-WEB/issues' target='_blank'>open an issue</a>.`,
          color: "#747474",
          background: "#fafafcd9",
          allowOutsideClick: true,
          allowEscapeKey: true,
          showConfirmButton: true,
          focusConfirm: true,
          confirmButtonColor: "#6d81ad",
          confirmButtonText: "Ok",
          backdrop: `
          rgba(239, 240, 248, 0.1)
          left top
          no-repeat
        `,
        });
        break;
      case API_PARAMETERS["SESSION_CODE_NONE"]:
        Swal.fire({
          title: "No Session Data",
          iconHtml:
            `<img src="` +
            BACTERIA_GIF +
            `" style="height: 100%; width: 100%; pointer-events: none; user-select: none;">`,
          html:
            `You must submit a request at the <a href='` +
            _URL +
            `/upload'>Upload</a> page before you can access any results.`,
          color: "#747474",
          background: "#fafafcd9",
          allowOutsideClick: true,
          allowEscapeKey: true,
          showConfirmButton: true,
          focusConfirm: true,
          confirmButtonColor: "#6d81ad",
          confirmButtonText: "Ok",
          backdrop: `
          rgba(239, 240, 248, 0.1)
          left top
          no-repeat
        `,
        });
        break;
      case API_PARAMETERS["SESSION_CODE_ACTIVE"]:
        if (!_SESSION_DATA.hasData) {
          axios
            .get(_URL + "/session_data")
            .then((response) => {
              let responseData = JSON.parse(
                response.data
                  .replaceAll("\n", "")
                  .replaceAll("\\", "")
                  .replaceAll("NaN", '"null"')
              );
              _SESSION_DATA.hasData = true;
              _SESSION_DATA.samplesRecord = responseData[0];
              _SESSION_DATA.featuresRecord = responseData[1];
              _SESSION_DATA.variantsRecord = responseData[2];
            })
            .catch((error) => {
              displayError(error.message);
            })
            .finally(() => {
              showSamplesInTable();
            });
        }
        break;
    }
  })
  .catch((error) => {
    displayError(error.message);
  });

function constructTableColumns(columnFields) {
  let columnDefinitions = [];
  for (let columnField of columnFields) {
    columnDefinitions.push({
      title: columnField.replace(".", " "),
      field: columnField,
    });
  }
  return columnDefinitions;
}

function showTableContent(record) {
  if (_SESSION_DATA.hasData) {
    _OVERVIEW_TABLE = new Tabulator("#main-results-content-table", {
      nestedFieldSeparator: "$",
      movableColumns: true,
      columnDefaults: {
        width: "8vw",
      },
      columns: constructTableColumns(record.columns),
      data: record.records,
    });
    $("#results-set-samples-table").removeClass("active-content");
    $("#results-set-features-table").removeClass("active-content");
    $("#results-set-variants-table").removeClass("active-content");
    return true;
  } else {
    return false;
  }
}

function showSamplesInTable() {
  showTableContent(_SESSION_DATA.samplesRecord);
  $("#results-set-samples-table").addClass("active-content");
}

function showFeaturesInTable() {
  showTableContent(_SESSION_DATA.featuresRecord);
  $("#results-set-features-table").addClass("active-content");
}

function showVariantsInTable() {
  showTableContent(_SESSION_DATA.variantsRecord);
  $("#results-set-variants-table").addClass("active-content");
}

function downloadSessionStorage() {
  displayToast(
    "Request submitted. Your download will start once complete.",
    4000
  );
  axios
    .get(_URL + "/download_session_storage", { responseType: "blob" })
    .then((response) => {
      console.log(response);
      downloadBlob(response.data, "storage.json.br");
    })
    .catch((error) => {
      displayError(error.message);
    });
}
