/* MUSIAL (Webserver) | Simon Hackl - simon.hackl@uni-tuebingen.de | v1.2.0 | GPL-3.0 license | github.com/Integrative-Transcriptomics/MUSIAL-WEB */

/**
 * Tabulator (see {@link https://tabulator.info/docs/5.5/release}) instance to display interactive table.
 */
var _OVERVIEW_TABLE;
/**
 *{@link Array} of {@link String} values that match either `<FieldName> <FilterKeyword> <FieldValue>` or `groupby <FieldName>`. See {@link https://tabulator.info/docs/5.5/filter} for <FilterKeyword> options available.
 */
var _OVERVIEW_TABLE_FILTERS_AND_GROUPS = [];
/**
 * TODO
 */
var _SESSION_DATA = {
  SET: false,
  FILTERED_SAMPLES: [],
  SAMPLES: {},
  FEATURES: {},
  VARIANTS: {},
};
/**
 * The active record; Either `null` or one of the {@link String} values `samples`, `features` or `variants`.
 */
var _ACTIVE_RECORD = null;
/**
 * {@link Array} of EChart instances (see {@link https://echarts.apache.org/en/option.html#title}).
 */
var _CHARTS = [];
/**
 * {@link Array} of {@link ResizeObserver} instances (see {@link https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver}).
 */
var _CHART_OBSERVERS = [];
/**
 * Constant definition of a SweetAlert2 (see {@link https://sweetalert2.github.io/}) popup to display in case of a server error.
 */
const SWAL_SERVER_ERROR_CONFIGURATION = {
  title: "Faulty Session Data",
  html:
    `Please check your input data. You can access the server log <a href='` +
    _URL +
    `/session/log' target='_blank'>here</a>. If you cannot solve your problem, feel free to <a href='https://github.com/Integrative-Transcriptomics/MUSIAL-WEB/issues' target='_blank'>open an issue</a>.`,
  color: "#747474",
  background: "#fafafcd9",
  allowOutsideClick: true,
  allowEscapeKey: true,
  showConfirmButton: true,
  focusConfirm: true,
  confirmButtonColor: "#6d81ad",
  confirmButtonText: "Ok",
  backdrop: `rgba(239, 240, 248, 0.1) left top no-repeat`,
};
/**
 * Constant definition of a SweetAlert2 (see {@link https://sweetalert2.github.io/}) popup to display in case of no session data.
 */
const SWAL_NO_SESSION_CONFIGURATION = {
  title: "No Session Data",
  iconHtml:
    `<img src="` +
    BACTERIA_GIF +
    `" style="height: 100%; width: 100%; pointer-events: none; user-select: none;">`,
  html:
    `You must submit a request on the <a href='` +
    _URL +
    `/upload'>Upload</a> page before you can access any results.`,
  color: "#747474",
  background: "transparent",
  heightAuto: false,
  allowOutsideClick: false,
  allowEscapeKey: false,
  showConfirmButton: false,
  backdrop: `rgba(239, 240, 248, 0.1) left top no-repeat`,
};
/**
 * Constant definition of a SweetAlert2 (see {@link https://sweetalert2.github.io/}) popup to display in case of session data retrieval.
 */
const SWAL_PREPARE_RESULTS_CONFIGURATION = {
  title: "Retrieving Session Data",
  iconHtml:
    `<img src="` +
    BACTERIA_GIF +
    `" style="height: 100%; width: 100%; pointer-events: none; user-select: none;">`,
  html: `The results of your analysis will be displayed shortly.`,
  color: "#747474",
  background: "transparent",
  heightAuto: false,
  allowOutsideClick: false,
  allowEscapeKey: false,
  showConfirmButton: false,
  backdrop: `rgba(239, 240, 248, 0.1) left top no-repeat`,
};

/*
 * Request session status and initialize data retrieval as soon as this script loads into an HTML document.
 */
axios
  .get(_URL + "/session/status")
  .then((response) => {
    switch (String(response.data.code)) {
      case API_PARAMETERS.SESSSION_STATE_FAILED:
        _SESSION_DATA.SET = false;
        Swal.fire(SWAL_SERVER_ERROR_CONFIGURATION);
        break;
      case API_PARAMETERS.SESSION_STATE_NONE:
        _SESSION_DATA.SET = false;
        Swal.fire(SWAL_NO_SESSION_CONFIGURATION);
        break;
      case API_PARAMETERS.SESSION_STATE_ACTIVE:
        if (!_SESSION_DATA.SET) {
          Swal.fire(SWAL_PREPARE_RESULTS_CONFIGURATION);
          axios
            .get(_URL + "/session/data", {
              headers: {
                "Content-Type": "application/json",
              },
            })
            .then((response) => {
              if (assessResponse(response)) {
                Swal.close();
                _SESSION_DATA.SET = true;
                let responseContent = JSON.parse(response.data.content);
                _SESSION_DATA.SAMPLES = responseContent[0];
                $("#main-results-table-set-samples-button").html(
                  `samples <span class="badge">` +
                    _SESSION_DATA.SAMPLES.records.length +
                    `</span>`
                );
                _SESSION_DATA.FILTERED_SAMPLES = [];
                for (let sample_entry of _SESSION_DATA.SAMPLES.records) {
                  _SESSION_DATA.FILTERED_SAMPLES.push(sample_entry.name);
                }
                _SESSION_DATA.FEATURES = responseContent[1];
                $("#main-results-table-set-features-button").html(
                  `features <span class="badge">` +
                    _SESSION_DATA.FEATURES.records.length +
                    `</span>`
                );
                _SESSION_DATA.VARIANTS = responseContent[2];
                $("#main-results-table-set-variants-button").html(
                  `variants <span class="badge">` +
                    _SESSION_DATA.VARIANTS.records.length +
                    `</span>`
                );
              } else {
                _SESSION_DATA.SET = false;
              }
            })
            .catch((error) => {
              alertError(error.message);
            })
            .finally(() => {
              displaySamplesRecord();
            });
        }
        break;
    }
  })
  .catch((error) => {
    alertError(error.message);
  });

/**
 * Initializes the results page with the specified record, i.e. displays the content of the record in the {@link _OVERVIEW_TABLE} and deletes all {@link _CHARTS}.
 *
 * @param {Object} record Either the `SAMPLES`, `FEATURES` or `VARIANTS` entry stored in {@link _SESSION_DATA}.
 * @returns {Boolean} Flag indicating whether the initialization was successful.
 */
function initRecord(record) {
  try {
    if (typeof _OVERVIEW_TABLE == "object") _OVERVIEW_TABLE.setData();
    _OVERVIEW_TABLE = new Tabulator("#main-results-table", {
      nestedFieldSeparator: "$",
      movableColumns: true,
      maxHeight: "50vh",
      columnDefaults: {
        width: "8vw",
        tooltip: true,
      },
      columns: patchTableColumns(record.columns),
      data: record.records,
      selectable: 1,
    });
    $("#main-results-table-set-samples-button").removeClass("active-content");
    $("#main-results-table-set-features-button").removeClass("active-content");
    $("#main-results-table-set-variants-button").removeClass("active-content");
    $("#main-results-dashboard-samples").hide();
    $("#main-results-dashboard-features").hide();
    $("#main-results-dashboard-variants").hide();
    for (let chart_observer of _CHART_OBSERVERS) {
      chart_observer.disconnect();
    }
    for (let chart of _CHARTS) {
      chart.dispose();
    }
    _CHARTS.length = 0;
    _CHART_OBSERVERS.length = 0;
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Sets the `SAMPLES` record in {@link _SESSION_DATA} as the active record.
 *
 * This affects the content of {@link _OVERVIEW_TABLE} and the composition of {@link _CHARTS}.
 */
function displaySamplesRecord() {
  _ACTIVE_RECORD = "samples";
  if (initRecord(_SESSION_DATA.SAMPLES)) {
    log_interaction("Display Sample Data.");
    $("#main-results-table-set-samples-button").addClass("active-content");
    $("#main-results-dashboard-samples").show();
    addEChartsInstance(
      $("#main-results-dashboard-samples-left")[0],
      _SESSION_DATA.SAMPLES.dashboard.overview_area
    );
    addEChartsInstance(
      $("#main-results-dashboard-samples-right")[0],
      _SESSION_DATA.SAMPLES.dashboard.clustering_allele
    );
    dashboardSamplesOverview("number_of_substitutions", {
      innerText: "substitutions",
    });
    dashboardSamplesClustering();
  }
}

/**
 * Sets the `FEATURES` record in {@link _SESSION_DATA} as the active record.
 *
 * This affects the content of {@link _OVERVIEW_TABLE} and the composition of {@link _CHARTS}.
 */
function displayFeaturesRecord() {
  _ACTIVE_RECORD = "features";
  if (initRecord(_SESSION_DATA.FEATURES)) {
    log_interaction("Display Features Data.");
    $("#main-results-table-set-features-button").addClass("active-content");
    $("#main-results-dashboard-features").show();
    addEChartsInstance(
      $("#main-results-dashboard-features-left")[0],
      _SESSION_DATA.FEATURES.dashboard.overview_parallel
    );
    _CHARTS[0].setOption({
      tooltip: {
        backgroundColor: "rgba(228, 229, 237, 0.8)",
        borderColor: "rgba(228, 229, 237, 0.8)",
        textStyle: {
          fontSize: 11,
        },
        formatter: (params, ticket, _) => {
          return (
            params.marker +
            "<b>" +
            params.seriesName +
            "</b> " +
            "<br/><b>Alleles:</b> " +
            params.data[0] +
            "<br/><b>Proteoforms:</b> " +
            params.data[1] +
            "<br/><b>Substitutions:</b> " +
            params.data[2] +
            "<br/><b>Insertions:</b> " +
            params.data[3] +
            "<br/><b>Deletions:</b> " +
            params.data[4] +
            "<br/><b>Variable Positions (%):</b> " +
            params.data[5]
          );
        },
      },
    });
    addEChartsInstance(
      $("#main-results-dashboard-features-right")[0],
      _SESSION_DATA.FEATURES.dashboard.forms_graph
    );
    dashboardFeaturesFormsGraph(_SESSION_DATA.FEATURES.records[0]["name"]);
    let featureSelectOptions = {};
    for (let featureRecord of _SESSION_DATA.FEATURES.records) {
      featureSelectOptions[featureRecord.name] = featureRecord.name;
    }
    Metro.getPlugin(
      document.getElementById("main-results-dashboard-features-forms-feature"),
      "select"
    ).data(featureSelectOptions);
  }
}

/**
 * Sets the `VARIANTS` record in {@link _SESSION_DATA} as the active record.
 *
 * This affects the content of {@link _OVERVIEW_TABLE} and the composition of {@link _CHARTS}.
 */
function displayVariantsRecord() {
  _ACTIVE_RECORD = "variants";
  if (initRecord(_SESSION_DATA.VARIANTS)) {
    log_interaction("Display Variants Data.");
    $("#main-results-table-set-variants-button").addClass("active-content");
    $("#main-results-dashboard-variants").show();
    _SESSION_DATA.VARIANTS.dashboard.variants_bar["tooltip"] = {
      trigger: "axis",
      formatter: (params, ticket, callback) => {
        let contents = [];
        for (let entry of params.filter((e) => e.componentSubType == "bar")) {
          let frequency = [];
          let quality = [];
          let coverage = [];
          for (let occurrence of entry.data[5].split(",")) {
            let fields = occurrence.split(":");
            if (fields[2] == "false") {
              frequency.push(parseFloat(fields[3]));
              quality.push(parseFloat(fields[4]));
              coverage.push(parseFloat(fields[5]));
            }
          }
          contents.push(
            "<div style='display: inline-block; margin-right: 10px;'><b>Position</b>: " +
              entry.data[0] +
              "<br>" +
              "<b>Frequency (Pass)</b>: " +
              parseFloat(entry.data[1]).toFixed(2) +
              " %<br>" +
              "<b>Reference Content</b>: " +
              entry.data[2] +
              "<br>" +
              "<b>Variant Content</b>: " +
              entry.data[3] +
              "<br>" +
              "<b>Type (SnpEff)</b>: " +
              entry.data[4] +
              "<br>" +
              "<b>Avg. Genotype Frequency</b>: " +
              (_mean(frequency) * 100).toFixed(2) +
              " %" +
              "<br>" +
              "<b>Avg. Quality</b>: " +
              _mean(quality).toFixed(2) +
              "<br>" +
              "<b>Avg. Coverage</b>: " +
              _mean(coverage).toFixed(2) +
              "<br></div>"
          );
        }
        return contents.join("");
      },
      alwaysShowContent: true,
      position: ["5%", "65%"],
      backgroundColor: "rgba(228, 229, 237, 0.5)",
      borderColor: "rgba(228, 229, 237, 0.5)",
      textStyle: {
        fontSize: 11,
      },
    };
    _SESSION_DATA.VARIANTS.dashboard.variants_bar["yAxis"][0]["axisLabel"] = {
      formatter: (value, index) => {
        return value.toFixed(1) + "%";
      },
    };
    addEChartsInstance(
      $("#main-results-dashboard-variants")[0],
      _SESSION_DATA.VARIANTS.dashboard.variants_bar
    );
    _CHARTS[0].on("legendselectchanged", (event) => {
      let series = _CHARTS[0]
        .getModel()
        .getSeries()
        .filter((series) => {
          return series.option.name == event.name;
        })[0];
      _CHARTS[0].dispatchAction({
        type: "dataZoom",
        startValue: series.option.pStart,
        endValue: series.option.pEnd,
      });
      _CHARTS[0].dispatchAction({
        type: "legendAllSelect",
      });
    });
    _CHARTS[0].dispatchAction({
      type: "legendAllSelect",
    });
  }
}

/**
 * Constructs Tabulator column definitions from a list of strings and updates relevant user interface elements with column name information.
 *
 * @param {Array} columnNames {@link Array} of {@link String}
 * @returns {Array} List of {@link Objects} that match Tabulator.js column definitions (see {@link https://tabulator.info/docs/5.5/columns#definition})
 */
function patchTableColumns(columnNames) {
  let columnDefinitions = [];
  let propertySelectOptions = {};
  for (let columnName of columnNames) {
    let titleValue = columnName
      .split(/[._]+/)
      .join(" ")
      .replaceAll("number of ", "");
    if (
      columnName.startsWith("allele") ||
      columnName.startsWith("proteoform")
    ) {
      columnDefinitions.push({
        title: titleValue,
        field: columnName,
        headerTooltip: true,
        formatter: function (cell, formatterParams, onRendered) {
          if (cell.getValue().includes(".x")) {
            return "<b style='color: #fe4848;'>disrupted</b>";
          } else if (cell.getValue() != "reference") {
            return "<b style='color: #6d81ad;'>alternative</b>";
          } else {
            return "reference";
          }
        },
      });
    } else if (columnName.startsWith("occurrence")) {
      columnDefinitions.push({
        title: titleValue,
        field: columnName,
        headerTooltip: true,
        formatter: function (cell, formatterParams, onRendered) {
          let o = cell.getValue().split(",");
          let contents = [];
          for (let e of o) {
            contents.push(
              e.split(":")[2] == "true"
                ? "<b style='color: #fe4848;'>" + e.split(":")[0] + "</b>"
                : e.split(":")[0]
            );
          }
          return contents.join(", ");
        },
      });
    } else if (
      columnName.startsWith("frequency") ||
      columnName.startsWith("variable")
    ) {
      columnDefinitions.push({
        title: titleValue,
        field: columnName,
        headerTooltip: true,
        formatter: function (cell, formatterParams, onRendered) {
          return parseFloat(cell.getValue()).toFixed(2) + " %";
        },
      });
    } else {
      columnDefinitions.push({
        title: titleValue,
        field: columnName,
        headerTooltip: true,
      });
    }
    propertySelectOptions[columnName] = titleValue;
  }
  Metro.getPlugin(
    document.getElementById("main-results-table-filter-field"),
    "select"
  ).data(propertySelectOptions);
  delete propertySelectOptions["name"];
  Metro.getPlugin(
    document.getElementById("main-results-table-group-field"),
    "select"
  ).data(propertySelectOptions);
  Metro.getPlugin(
    document.getElementById("main-results-dashboard-samples-overview-field"),
    "select"
  ).data(propertySelectOptions);
  Metro.getPlugin(
    document.getElementById("main-results-dashboard-correlation-1"),
    "select"
  ).data(propertySelectOptions);
  Metro.getPlugin(
    document.getElementById("main-results-dashboard-correlation-2"),
    "select"
  ).data(propertySelectOptions);
  if (typeof _OVERVIEW_TABLE != "undefined") {
    _OVERVIEW_TABLE_FILTERS_AND_GROUPS = [];
    applyTableFilterAndGroups();
  }
  return columnDefinitions;
}

/**
 * Returns a column vector of the {@link _OVERVIEW_TABLE}.
 *
 * @param {String} field The column (field name) to access.
 * @param {Boolean} active Whether to return only data of rows that pass the currently applied filters.
 * @returns {Array} Column vector.
 */
function getTableColumnData(field, active) {
  let column_values = [];
  let components = active
    ? _OVERVIEW_TABLE.getData("active")
    : _OVERVIEW_TABLE.getData();
  for (let component of components) {
    if (component.hasOwnProperty(field)) {
      column_values.push(component[field]);
    }
  }
  return column_values;
}

/**
 * Returns the current display of the {@link _OVERVIEW_TABLE} as a file (csv).
 */
function downloadOverviewTable() {
  log_interaction("Save '" + _ACTIVE_RECORD + "' Overview Table.");
  _OVERVIEW_TABLE.download("csv", _ACTIVE_RECORD + "_overview.csv");
}

/**
 * Updates the value of {@link _OVERVIEW_TABLE_FILTERS_AND_GROUPS} from the (filter) user interface and redraws the table.
 */
function addTableFilter() {
  var filter =
    $("#main-results-table-filter-field")[0].value +
    " " +
    $("#main-results-table-filter-type")[0].value +
    " " +
    $("#main-results-table-filter-value")[0].value;
  _OVERVIEW_TABLE_FILTERS_AND_GROUPS.push(filter);
  Metro.getPlugin("#main-results-table-manage-tags", "taginput").val(
    _OVERVIEW_TABLE_FILTERS_AND_GROUPS
  );
  applyTableFilterAndGroups();
}

/**
 * Updates the value of {@link _OVERVIEW_TABLE_FILTERS_AND_GROUPS} from the (group) user interface and redraws the table.
 */
function addTableGroup() {
  let group = "groupby " + $("#main-results-table-group-field")[0].value;
  _OVERVIEW_TABLE_FILTERS_AND_GROUPS.push(group);
  Metro.getPlugin("#main-results-table-manage-tags", "taginput").val(
    _OVERVIEW_TABLE_FILTERS_AND_GROUPS
  );
  applyTableFilterAndGroups();
}

/**
 * Initializes a new ECharts instance to {@link element} from {@link option} (see {@link https://echarts.apache.org/en/option.html#title}) and sets a new {@link ResizeObserver}. The ECharts instance and the observer are saved in {@link _CHARTS} and {@link _CHART_OBSERVERS}.
 *
 * @param {HTML} element HTML element for rendering the ECharts instance.
 * @param {object} option ECharts `option` object.
 */
function addEChartsInstance(element, option) {
  var chart = echarts.init(element, {
    devicePixelRatio: 2,
    renderer: "canvas",
    width: "auto",
    height: "auto",
  });
  var chart_observer = new ResizeObserver((entries) => {
    chart.resize({
      width: entries[0].width,
      height: entries[0].height,
    });
  });
  chart_observer.observe(element);
  chart.setOption(option);
  _CHARTS.push(chart);
  _CHART_OBSERVERS.push(chart_observer);
}

/**
 * Executes table filtering and grouping according to current values in {@link _OVERVIEW_TABLE_FILTERS_AND_GROUPS}.
 *
 * Value in {@link _OVERVIEW_TABLE_FILTERS_AND_GROUPS} is updated from user interface.
 */
function applyTableFilterAndGroups() {
  _OVERVIEW_TABLE_FILTERS_AND_GROUPS = Metro.getPlugin(
    "#main-results-table-manage-tags",
    "taginput"
  ).val();
  if (typeof _OVERVIEW_TABLE !== "undefined") {
    _OVERVIEW_TABLE.setGroupBy();
    _OVERVIEW_TABLE.clearFilter();
    var groups = [];
    var filters = [];
    for (let entry of _OVERVIEW_TABLE_FILTERS_AND_GROUPS) {
      let entryFields = entry.split(" ");
      if (entryFields[0] == "groupby") {
        groups.push(entryFields[1]);
      } else {
        filters.push({
          field: entryFields[0],
          type: entryFields[1],
          value: entryFields[2],
        });
      }
    }
    _OVERVIEW_TABLE.setGroupBy(groups);
    _OVERVIEW_TABLE.setFilter(filters);
    if (groups.length > 0 || filters.length > 0) {
      log_interaction(
        "Set Table Filter/Groups to " +
          filters
            .map((o) => {
              return [o.field, o.type, o.value].join(" ");
            })
            .join(", ") +
          "/" +
          groups.join(", ") +
          "'."
      );
    }
    _OVERVIEW_TABLE.redraw(true);
    if (_ACTIVE_RECORD == "samples") {
      _SESSION_DATA.FILTERED_SAMPLES = getTableColumnData("name", true);
    }
  }
}

/**
 * Executes data correlation tests of column vectors of the current {@link _OVERVIEW_TABLE} by request to the server. The specification is taken from the user interface (communicates with the server).
 */
function requestTableDataCorrelation() {
  var REQUEST = {
    field1: Metro.getPlugin(
      "#main-results-dashboard-correlation-1",
      "select"
    ).val(),
    field2: Metro.getPlugin(
      "#main-results-dashboard-correlation-2",
      "select"
    ).val(),
    test: Metro.getPlugin(
      "#main-results-dashboard-correlation-test",
      "select"
    ).val(),
    data_type: _ACTIVE_RECORD,
  };
  axios
    .post(_URL + "/calc/correlation", pako.deflate(JSON.stringify(REQUEST)), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "zlib",
      },
    })
    .then((response) => {
      if (assessResponse(response)) {
        $("#main-results-dashboard-correlation-results").html(
          `Test Value: ` +
            response.data.t +
            `&nbsp;&nbsp;&nbsp;P-Value: ` +
            response.data.p
        );
      }
    })
    .catch((error) => {
      alertError(error.message);
    });
}

/**
 * Executes download of the session data (binary, brotli-compressed bytes) stored on the server (communicates with the server).
 */
function requestDownloadSession() {
  displayNotification(
    "Request has been sent to the server. Your session data will be downloaded automatically as soon as processing is complete. Please do not close this page."
  );
  axios
    .get(_URL + "/download_session")
    .then((response) => {
      if (assessResponse(response)) {
        downloadBlob(response.data, "session.json.br");
      }
    })
    .catch((error) => {
      alertError(error.message);
    })
    .finally(() => {
      removeNotification();
    });
}

/**
 * Displays a pop-up window for the specification of the sequence download request (communicates with the server).
 */
function requestDownloadSequences() {
  var SWAL_DOWNLOAD_SEQUENCES_CONFIGURATION = {
    title: "Download Sequences",
    html:
      `
    <p>Please specify the following parameters and proceed with Download.</p>
    <br>
    <div class="remark m-4">
      <div class="grid">

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">feature for which sequences should be downloaded</span></small>
          </div>
          <div class="cell-3 m-2">
            <select
              id="download-feature"
              class="input-small"
              data-role="select"
              data-prepend="Feature"
              data-filter="false"
            >
              ` +
      _SESSION_DATA.FEATURES.records
        .map((r) => '<option value="' + r.name + '">' + r.name + "</option>")
        .join("") +
      `
            </select>
          </div>
        </div>

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">sequence content</span></small>
          </div>
          <div class="cell-3 m-2">
            <select
              id="download-data-content"
              class="input-small"
              data-role="select"
              data-prepend="Content"
              data-filter="false"
            >
              <option value="nucleotide">Nucleotide</option>
              <option value="aminoacid">Aminoacid</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">align sequences</span></small>
          </div>
          <div class="cell-3 m-2">
            <input
              id="download-data-align"
              type="checkbox"
              checked
              data-role="switch"
              data-cls-switch="custom-switch-on-off"
              data-material="true"
            />
          </div>
        </div>

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">merge samples</span></small>
          </div>
          <div class="cell-3 m-2">
            <input
              id="download-data-merge"
              type="checkbox"
              checked
              data-role="switch"
              data-cls-switch="custom-switch-on-off"
              data-material="true"
            />
          </div>
        </div>

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">include conserved positions</span></small>
          </div>
          <div class="cell-3 m-2">
            <input
              id="download-data-include-conserved-positions"
              type="checkbox"
              data-role="switch"
              data-cls-switch="custom-switch-on-off"
              data-material="true"
            />
          </div>
        </div>

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">include only or exclude specified samples (default 'all')</span></small>
            <button data-role="hint" data-hint-text="Copy samples from table." data-hint-position="bottom" class="ml-1 button small rounded" onclick="Metro.getPlugin('#download-data-samples-list','taginput').val(_SESSION_DATA.ACTIVE_SAMPLES)"><i class="fa-duotone fa-paste"></i></button>
          </div>
          <div class="cell-1 mt-2 text-right">Include</div>
          <div class="cell-1 ml-2">
            <input
              id="download-data-samples"
              type="checkbox"
              data-role="switch"
              data-cls-switch="custom-switch-choice"
              data-material="true"
            />
          </div>
          <div class="cell-1 mt-2 text-left">Exclude</div>
          <div class="cell-5 m-2">
            <input id="download-data-samples-list" class="input-small" type="text" data-role="taginput" style="overflow-y: hide"/>
          </div>
        </div>

      </div>
    </div>`,
    width: "100vw",
    padding: "0.5em",
    position: "bottom",
    showCancelButton: true,
    grow: true,
    heightAuto: false,
    cancelButtonColor: "#fe4848cc",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#39c093cc",
    confirmButtonText: "Download",
    color: "#747474",
    background: "transparent",
    backdrop: `
      #fafafcd9
      left top
      no-repeat
    `,
  };
  Swal.fire(SWAL_DOWNLOAD_SEQUENCES_CONFIGURATION).then((result) => {
    if (result.isConfirmed) {
      var request = {
        feature: $("#download-feature")[0].value,
        content: $("#download-data-content")[0].value,
        align: $("#download-data-align").is(":checked"),
        merge: $("#download-data-merge").is(":checked"),
        conserved: $("#download-data-include-conserved-positions").is(
          ":checked"
        ),
        samples: [],
      };
      let include = !$("#download-data-samples").is(":checked");
      let specified_samples = Metro.getPlugin(
        "#download-data-samples-list",
        "taginput"
      ).val();
      if (specified_samples.length == 0) {
        request["samples"] = _clone(_SESSION_DATA.FILTERED_SAMPLES);
      } else if (include) {
        request["samples"] = specified_samples;
      } else {
        request["samples"] = _clone(_SESSION_DATA.FILTERED_SAMPLES).filter(
          (s) => {
            return !specified_samples.includes(s);
          }
        );
      }
      displayNotification(
        "The results of your request will be downloaded automatically as soon as processing is complete. If you close this page, the process will be canceled."
      );
      axios
        .post(
          _URL + "/download_sequences",
          pako.deflate(JSON.stringify(request)),
          {
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "zlib",
            },
            responseType: "blob",
          }
        )
        .then((response) => {
          if (assessResponse(response)) {
            downloadBlob(response.data, request.feature + "_sequences.fasta");
          }
        })
        .catch((error) => {
          alertError(error.message);
        })
        .finally(() => {
          removeNotification();
        });
    }
  });
}

/**
 * Displays a pop-up window for the specification of the table download request (communicates with the server).
 */
function requestDownloadTable() {
  var SWAL_DOWNLOAD_TABLE_CONFIGURATION = {
    title: "Download Variants Table",
    html:
      `
    <p>Please specify the following parameters and proceed with Download.</p>
    <br>
    <div class="remark m-4">
      <div class="grid">

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">feature for which sequences should be downloaded</span></small>
          </div>
          <div class="cell-3 m-2">
            <select
              id="download-feature"
              class="input-small"
              data-role="select"
              data-prepend="Feature"
              data-filter="false"
            >
              ` +
      _SESSION_DATA.FEATURES.records
        .map((r) => '<option value="' + r.name + '">' + r.name + "</option>")
        .join("") +
      `
            </select>
          </div>
        </div>

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">sequence content</span></small>
          </div>
          <div class="cell-3 m-2">
            <select
              id="download-data-content"
              class="input-small"
              data-role="select"
              data-prepend="Content"
              data-filter="false"
            >
              <option value="nucleotide">Nucleotide</option>
              <option value="aminoacid">Aminoacid</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">merge samples</span></small>
          </div>
          <div class="cell-3 m-2">
            <input
              id="download-data-merge"
              type="checkbox"
              checked
              data-role="switch"
              data-cls-switch="custom-switch-on-off"
              data-material="true"
            />
          </div>
        </div>

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">include conserved positions</span></small>
          </div>
          <div class="cell-3 m-2">
            <input
              id="download-data-include-conserved-positions"
              type="checkbox"
              data-role="switch"
              data-cls-switch="custom-switch-on-off"
              data-material="true"
            />
          </div>
        </div>

        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">include only or exclude specified samples</span></small>
            <button data-role="hint" data-hint-text="Copy samples from table." data-hint-position="bottom" class="ml-1 button small rounded" onclick="Metro.getPlugin('#download-data-samples-list','taginput').val(_SESSION_DATA.ACTIVE_SAMPLES)"><i class="fa-duotone fa-paste"></i></button>
          </div>
          <div class="cell-1 mt-2 text-right">Include</div>
          <div class="cell-1 ml-2">
            <input
              id="download-data-samples"
              type="checkbox"
              data-role="switch"
              data-cls-switch="custom-switch-choice"
              data-material="true"
            />
          </div>
          <div class="cell-1 mt-2 text-left">Exclude</div>
          <div class="cell-5 m-2">
            <input id="download-data-samples-list" class="input-small" type="text" data-role="taginput" style="overflow-y: hide"/>
          </div>
        </div>
      </div>
    </div>`,
    width: "100vw",
    padding: "0.5em",
    position: "bottom",
    showCancelButton: true,
    grow: true,
    heightAuto: true,
    cancelButtonColor: "#fe4848cc",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#39c093cc",
    confirmButtonText: "Download",
    color: "#747474",
    background: "transparent",
    backdrop: `
      #fafafcd9
      left top
      no-repeat
    `,
  };
  Swal.fire(SWAL_DOWNLOAD_TABLE_CONFIGURATION).then((result) => {
    if (result.isConfirmed) {
      var request = {
        feature: $("#download-feature")[0].value,
        content: $("#download-data-content")[0].value,
        merge: $("#download-data-merge").is(":checked"),
        conserved: $("#download-data-include-conserved-positions").is(
          ":checked"
        ),
        samples: [],
      };
      let include = !$("#download-data-samples").is(":checked");
      let specified_samples = Metro.getPlugin(
        "#download-data-samples-list",
        "taginput"
      ).val();
      if (specified_samples.length == 0) {
        request["samples"] = _clone(_SESSION_DATA.FILTERED_SAMPLES);
      } else if (include) {
        request["samples"] = specified_samples;
      } else {
        request["samples"] = _clone(_SESSION_DATA.FILTERED_SAMPLES).filter(
          (s) => {
            return !specified_samples.includes(s);
          }
        );
      }
      displayNotification(
        "The results of your request will be downloaded automatically as soon as processing is complete. If you close this page, the process will be canceled."
      );
      axios
        .post(_URL + "/download_table", pako.deflate(JSON.stringify(request)), {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "zlib",
          },
        })
        .then((response) => {
          if (assessResponse(assessResponse)) {
            downloadBlob(response.data, request.feature + "_variants.tsv");
          }
        })
        .catch((error) => {
          alertError(error.message);
        })
        .finally(() => {
          removeNotification();
        });
    }
  });
}

/**
 * Computes the mean of an 1D array.
 *
 * @param {Array<Numer>} arr1D List of numbers.
 * @returns {Float} Mean of input list.
 */
function _mean(arr1D) {
  if (arr1D.length < 1) {
    return;
  }
  return arr1D.reduce((p, c) => p + c) / arr1D.length;
}

/**
 * Transposes a matrix.
 *
 * @param {Array} arr2D List of lists.
 * @returns {Array} Transposed input list.
 */
function _transpose(arr2D) {
  return arr2D[0].map((x, i) => arr2D.map((x) => x[i]));
}

/**
 * Clones an object.
 *
 * @param {Object} o Object to clone.
 * @returns {Object} Cloned object.
 */
function _clone(o) {
  return JSON.parse(JSON.stringify(o));
}

function dashboardSamplesOverview(val, option) {
  log_interaction("Set Sample Overview to '" + val + "'.");
  let counts = _SESSION_DATA.SAMPLES.counts[val];
  let axisTitle =
    option.innerText.charAt(0).toUpperCase() + option.innerText.slice(1);
  let axisData = Array.from(Object.keys(counts));
  if (val.startsWith("number_of_")) {
    axisData = [...Array(Math.max(...axisData) + 1).keys()].map((x) =>
      String(x)
    );
  }
  let seriesData = [];
  for (const [key, value] of Object.entries(counts)) {
    seriesData.push([axisData.indexOf(key), value]);
  }
  _CHARTS[0].setOption({
    title: {
      top: 0,
      left: 0,
      text: "No. Samples by " + axisTitle,
      textStyle: { fontWeight: "lighter" },
    },
    xAxis: [
      {
        type: "category",
        gridIndex: 0,
        data: axisData,
        name: axisTitle,
        nameLocation: "center",
        nameGap: "25",
      },
    ],
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(228, 229, 237, 0.8)",
      borderColor: "rgba(228, 229, 237, 0.8)",
      textStyle: {
        fontSize: 11,
      },
      formatter: (params, ticket, callback) => {
        return (
          "<b>" +
          axisTitle +
          ":</b> " +
          params[0].axisValue +
          "<br/><b>No. Samples:</b> " +
          params[0].value[1]
        );
      },
    },
    series: [
      {
        name: axisTitle,
        type: "bar",
        itemStyle: { color: "#fe4848", borderRadius: 1 },
        data: seriesData,
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
    ],
  });
}

function dashboardSamplesClustering() {
  let cluster_type = Metro.getPlugin(
    "#main-results-dashboard-samples-clustering-type",
    "select"
  ).val();
  log_interaction("Set Sample Clustering to '" + cluster_type + "'.");
  let option = _SESSION_DATA.SAMPLES.dashboard["clustering_" + cluster_type];
  option["tooltip"] = {
    trigger: "item",
    backgroundColor: "rgba(228, 229, 237, 0.8)",
    borderColor: "rgba(228, 229, 237, 0.8)",
    textStyle: {
      fontSize: 11,
    },
    formatter: (params, ticket, callback) => {
      if (params.seriesName == "Reference") {
        content = `<b>Reference</b> (` + params.data.weight + ` Sample(s))`;
      } else if (params.seriesName == "Unassigned") {
        content = params.data.weight + ` unassigned Sample(s)</br>`;
        content += `<table><tbody>`;
        for (let c of params.data.name) {
          let content_fields = c.split(".");
          content +=
            `<tr><td><p class='mr-2'>` +
            content_fields[0] +
            `</p></td><td>` +
            content_fields.slice(1).join(".") +
            `</td></tr>`;
        }
        content += `</tbody></table>`;
      } else {
        cluster_index = parseInt(params.seriesName.split(" ")[1]);
        content =
          params.data.weight +
          ` Sample(s) assigned to ` +
          params.seriesName +
          ` (` +
          option["clustering"]["clusters"][cluster_index]["size"] +
          ` Samples) with Persitance ` +
          parseFloat(params.data.assignment_probability).toFixed(2) +
          `</br>`;
        content += `<table><tbody>`;
        for (let c of params.data.name) {
          let content_fields = c.split(".");
          if (
            option["clustering"]["clusters"][cluster_index][
              "conserved"
            ].includes(c)
          ) {
            content +=
              `<tr><td><b class='mr-2'>` +
              content_fields[0] +
              `</b></td><td><b>` +
              content_fields.slice(1).join(".") +
              `</b></td></tr>`;
          } else {
            content +=
              `<tr><td><p class='mr-2'>` +
              content_fields[0] +
              `</p></td><td>` +
              content_fields.slice(1).join(".") +
              `</td></tr>`;
          }
        }
        content += `</tbody></table>`;
      }
      return content;
    },
  };
  _CHARTS[1].setOption(option, true, false);
}

function dashboardFeaturesFormsGraph(feature) {
  log_interaction("Display Feature Graph for Feature '" + feature + "'.");
  _CHARTS[1].showLoading({
    color: "#6d81ad",
    text: "Loading...",
    maskColor: "rgb(250, 250, 252, 0.8)",
  });
  axios
    .post(
      _URL + "/calc/forms_graph",
      pako.deflate(JSON.stringify({ feature: feature })),
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Encoding": "zlib",
        },
      }
    )
    .then((response) => {
      if (assessResponse(response)) {
        _CHARTS[1].setOption({
          title: {
            top: 0,
            left: 0,
            text: feature + " Forms Graph",
            textStyle: { fontWeight: "lighter", fontStyle: "oblique" },
          },
          tooltip: {
            alwaysShowContent: true,
            position: ["1%", "7%"],
            triggerOn: "click",
            className: "dashboard-features-graph-tooltip",
            backgroundColor: "rgba(228, 229, 237, 0.8)",
            borderColor: "rgba(228, 229, 237, 0.8)",
            textStyle: {
              fontSize: 10,
            },
            formatter: (params, ticket, _) => {
              if (!params.data.isNode) {
                return;
              } else {
                content = "";
                content +=
                  `<b>` +
                  params.data.name +
                  `</b><button class="plain" style="cursor: pointer;" onclick="document.getElementsByClassName('dashboard-features-graph-tooltip')[0].style.display = 'None'"><i class="fa-thin fa-xmark"></i></button><hr>`;
                content +=
                  `<b>Frequency: </b>` +
                  parseFloat(params.data.annotations["frequency"]).toFixed(2) +
                  `%`;
                content +=
                  `<br/><b>Variable Positions: </b>` +
                  parseFloat(
                    params.data.annotations["variable_positions"]
                  ).toFixed(2) +
                  `%`;
                content +=
                  `<br/><b>Substitutions: </b>` +
                  params.data.annotations["number_of_substitutions"];
                content +=
                  `<br/><b>Insertions: </b>` +
                  params.data.annotations["number_of_insertions"];
                content +=
                  `<br/><b>Deletions: </b>` +
                  params.data.annotations["number_of_deletions"];
                content += `<br/><b>Variants: </b>`;
                if (params.data.annotations["variants"] == "") {
                  content += `None`;
                } else {
                  content +=
                    `<p class="dashboard-features-graph-tooltip-variants">` +
                    params.data.annotations["variants"]
                      .replaceAll(":", "")
                      .replaceAll(";", "</br>") +
                    `</p>`;
                }
                return content;
              }
            },
          },
          legend: {
            show: true,
            textStyle: { fontSize: 10, color: "#747474" },
            backgroundColor: "rgba(250, 250, 252, 0.7)",
            bottom: "1%",
            right: "1%",
            orient: "vertical",
            selectedMode: false,
            data: [
              {
                name: "Proteoforms",
                icon: "path://M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM184 128h92c50.8 0 92 41.2 92 92s-41.2 92-92 92H208v48c0 13.3-10.7 24-24 24s-24-10.7-24-24V288 152c0-13.3 10.7-24 24-24zm92 136c24.3 0 44-19.7 44-44s-19.7-44-44-44H208v88h68z",
                itemStyle: {
                  color: "#607196",
                },
              },
              {
                name: "Alleles",
                icon: "path://M256,512A256,256,0,1,0,256,0a256,256,0,1,0,0,512zm0-400c9.1,0,17.4,5.1,21.5,13.3l104,208c5.9,11.9,1.1,26.3-10.7,32.2s-26.3,1.1-32.2-10.7L321.2,320H190.8l-17.4,34.7c-5.9,11.9-20.3,16.7-32.2,10.7s-16.7-20.3-10.7-32.2l104-208c4.1-8.1,12.4-13.3,21.5-13.3zm0,77.7L214.8,272h82.3L256,189.7z",
                itemStyle: {
                  color: "#9ba6bd",
                },
              },
              {
                name: "Reference",
                icon: "circle",
                itemStyle: {
                  color: "#FFBA08",
                },
              },
              {
                name: "Disordered",
                icon: "circle",
                itemStyle: {
                  color: "#FE4848",
                },
              },
              {
                name: "Form Relation",
                icon: "path://M0 256c0-8.8 7.2-16 16-16H624c8.8 0 16 7.2 16 16s-7.2 16-16 16H16c-8.8 0-16-7.2-16-16z",
                itemStyle: {
                  color: "#cbd0e0",
                },
              },
              {
                name: "Allele to Proteoform Interconnection",
                icon: "path://M416 256a32 32 0 1 1 -64 0 32 32 0 1 1 64 0zm-160 0a32 32 0 1 1 -64 0 32 32 0 1 1 64 0zM64 288a32 32 0 1 1 0-64 32 32 0 1 1 0 64z",
                itemStyle: {
                  color: "#cbd0e0",
                },
              },
            ],
          },
          series: [
            {
              type: "graph",
              layout: "force",
              force: {
                repulsion: 20,
                gravity: 0.1,
                friction: 0.4,
                edgeLength: 10,
                layoutAnimation: true,
              },
              roam: true,
              data: response.data.nodes,
              links: response.data.links,
              top: "10%",
              bottom: "10%",
              emphasis: {
                focus: "adjacency",
                label: {
                  show: true,
                  color: "#747474",
                  backgroundColor: "rgba(228, 229, 237, 0.8)",
                  borderColor: "rgba(228, 229, 237, 0.8)",
                  fontSize: 10,
                },
                edgeLabel: {
                  show: true,
                  color: "#747474",
                  backgroundColor: "rgba(228, 229, 237, 0.8)",
                  borderColor: "rgba(228, 229, 237, 0.8)",
                  fontSize: 10,
                  formatter: (params) => {
                    if (params.data.type == "relation") {
                      let source_name = params.data.source.replace(
                        "Proteoform ",
                        "Pf. "
                      );
                      let target_name = params.data.target.replace(
                        "Proteoform ",
                        "Pf. "
                      );
                      return (
                        source_name +
                        " -" +
                        params.data.value +
                        " Variant(s)→ " +
                        target_name
                      );
                    } else if (params.data.type == "interconnection") {
                      let source_name = params.data.source.replace(
                        "Allele ",
                        "Al. "
                      );
                      let target_name = params.data.target.replace(
                        "Proteoform ",
                        "Pf. "
                      );
                      return (
                        source_name +
                        " (" +
                        params.data.share +
                        " Sample(s)) → " +
                        target_name
                      );
                    }
                  },
                },
              },
              label: {
                show: false,
              },
            },
            {
              type: "graph",
              name: "Proteoforms",
            },
            {
              type: "graph",
              name: "Alleles",
            },
            {
              type: "graph",
              name: "Reference",
            },
            {
              type: "graph",
              name: "Disordered",
            },
            {
              type: "graph",
              name: "Form Relation",
            },
            {
              type: "graph",
              name: "Allele to Proteoform Interconnection",
            },
          ],
        });
      }
    })
    .catch((error) => {
      alertError(error.message);
    })
    .finally(() => {
      _CHARTS[1].hideLoading();
    });
}

function dashboardFeaturesProteoforms() {
  var sel = Metro.getPlugin(
    "#main-results-dashboard-features-forms-feature",
    "select"
  ).val();
  log_interaction("Request Proteoform Dashboard for Feature '" + sel + "'.");
  var dashboard = window.open(
    _URL + "/ext/proteoforms_dashboard?target=" + sel,
    "_blank"
  );
  dashboard.location;
}
