var _OVERVIEW_TABLE;
var _SESSION_DATA = {
  hasData: false,
  samplesRecord: {},
  featuresRecord: {},
  variantsRecord: {},
};
var _CHARTS = [];
var tableDefinition = undefined;
var tableData = undefined;
var tableActiveType = undefined;
var tableFilter = [];
var tableGroup = [];
var tableCurrentSamples = [];
var tableCurrentFeatures = [];

axios
  .get(_URL + "/session/status")
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
            .get(_URL + "/session/data")
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
              showSamples();
            });
        }
        break;
    }
  })
  .catch((error) => {
    displayError(error.message);
  });

function showContent(record) {
  if (_SESSION_DATA.hasData) {
    _OVERVIEW_TABLE = new Tabulator("#main-results-table", {
      nestedFieldSeparator: "$",
      movableColumns: true,
      maxHeight: "50vh",
      columnDefaults: {
        width: "8vw",
        tooltip: true,
      },
      columns: constructTableColumns(record.columns),
      data: record.records,
    });
    $("#main-results-table-set-samples-button").removeClass("active-content");
    $("#main-results-table-set-features-button").removeClass("active-content");
    $("#main-results-table-set-variants-button").removeClass("active-content");
    $("#main-results-dashboard-samples").hide();
    $("#main-results-dashboard-features").hide();
    $("#main-results-dashboard-variants").hide();
    _CHARTS = [];
    return true;
  } else {
    return false;
  }
}

function showSamples() {
  if (showContent(_SESSION_DATA.samplesRecord)) {
    $("#main-results-table-set-samples-button").addClass("active-content");
    $("#main-results-dashboard-samples").show();
    constructEChartInstance(
      $("#main-results-dashboard-samples-left")[0],
      _SESSION_DATA.samplesRecord.dashboard.variants_area
    );
    constructEChartInstance(
      $("#main-results-dashboard-samples-mid")[0],
      _SESSION_DATA.samplesRecord.dashboard.clustering_scatter
    );
    constructEChartInstance(
      $("#main-results-dashboard-samples-right")[0],
      _SESSION_DATA.samplesRecord.dashboard.correlation_bar
    );
    let featureSelectOptions = {};
    for (let featureRecord of _SESSION_DATA.featuresRecord.records) {
      featureSelectOptions[featureRecord.name] = featureRecord.name;
    }
    Metro.getPlugin(
      document.getElementById(
        "main-results-dashboard-samples-clustering-features"
      ),
      "select"
    ).data(featureSelectOptions);
  }
}

function showFeatures() {
  if (showContent(_SESSION_DATA.featuresRecord)) {
    $("#main-results-table-set-features-button").addClass("active-content");
  }
}

function showVariants() {
  if (showContent(_SESSION_DATA.variantsRecord)) {
    $("#main-results-table-set-variants-button").addClass("active-content");
  }
}

function constructTableColumns(columnFields) {
  let columnDefinitions = [];
  let selectOptions = {};
  for (let columnField of columnFields) {
    let titleValue = columnField
      .split(/[._]+/)
      .join(" ")
      .replaceAll("number of ", "");
    if (
      columnField.startsWith("allele") ||
      columnField.startsWith("proteoform")
    ) {
      columnDefinitions.push({
        title: titleValue,
        field: columnField,
        headerTooltip: true,
        formatter: function (cell, formatterParams, onRendered) {
          return cell.getValue() != "reference"
            ? "<b style='color: #fe4848;'>alternative</b>"
            : "reference";
        },
      });
    } else {
      columnDefinitions.push({
        title: titleValue,
        field: columnField,
        headerTooltip: true,
      });
    }
    selectOptions[columnField] = titleValue;
  }
  Metro.getPlugin(
    document.getElementById("main-results-table-group-field"),
    "select"
  ).data(selectOptions);
  Metro.getPlugin(
    document.getElementById("main-results-table-filter-field"),
    "select"
  ).data(selectOptions);
  Metro.getPlugin(
    document.getElementById("main-results-dashboard-samples-correlation-1"),
    "select"
  ).data(selectOptions);
  Metro.getPlugin(
    document.getElementById("main-results-dashboard-samples-correlation-2"),
    "select"
  ).data(selectOptions);
  if (typeof _OVERVIEW_TABLE != "undefined") {
    resetTableFilter();
    resetTableGroup();
  }
  return columnDefinitions;
}

function constructEChartInstance(element, option) {
  var chart = echarts.init(element, {
    devicePixelRatio: 2,
    renderer: "canvas",
    width: "auto",
    height: "auto",
  });
  new ResizeObserver((entries) => {
    chart.resize({
      width: entries[0].width,
      height: entries[0].height,
    });
  }).observe(element);
  chart.setOption(option);
  _CHARTS.push(chart);
}

function addTableFilter() {
  if (typeof _OVERVIEW_TABLE == "undefined") {
    return;
  }
  var filters = _OVERVIEW_TABLE.getFilters();
  filters.push({
    field: $("#main-results-table-filter-field")[0].value,
    type: $("#main-results-table-filter-type")[0].value,
    value: $("#main-results-table-filter-value")[0].value,
  });
  _OVERVIEW_TABLE.setFilter(filters);
  _OVERVIEW_TABLE.redraw(true);
}

function resetTableFilter() {
  if (typeof _OVERVIEW_TABLE == "undefined") {
    return;
  }
  _OVERVIEW_TABLE.clearFilter();
  _OVERVIEW_TABLE.redraw(true);
}

function addTableGroup() {
  if (typeof _OVERVIEW_TABLE == "undefined") {
    return;
  }
  var groups = _OVERVIEW_TABLE.options.groupBy;
  if (!groups) groups = [];
  groups.push($("#main-results-table-group-field")[0].value);
  _OVERVIEW_TABLE.setGroupBy(groups);
  _OVERVIEW_TABLE.redraw(true);
}

function resetTableGroup() {
  if (typeof _OVERVIEW_TABLE == "undefined") {
    return;
  }
  _OVERVIEW_TABLE.setGroupBy();
  _OVERVIEW_TABLE.redraw(true);
}

function dashboardSamplesCorrelation() {
  var REQUEST = {
    field1: Metro.getPlugin(
      "#main-results-dashboard-samples-correlation-1",
      "select"
    ).val(),
    field2: Metro.getPlugin(
      "#main-results-dashboard-samples-correlation-2",
      "select"
    ).val(),
    test: Metro.getPlugin(
      "#main-results-dashboard-samples-correlation-test",
      "select"
    ).val(),
  };
  axios
    .post(
      _URL + "/calc/sample_correlation",
      pako.deflate(JSON.stringify(REQUEST)),
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Encoding": "zlib",
        },
      }
    )
    .then((response) => {
      let titleText = "Not applicable!";
      let testName = "N/A";
      let testValue = 0.0;
      if (response.data[3] == "0") {
        testName = response.data[0];
        testValue = response.data[1];
        titleText = "P-value: " + response.data[2];
      }
      _CHARTS[2].setOption({
        title: [
          {
            top: "0",
            left: 0,
            text: "Correlation Test",
            textStyle: { fontWeight: "lighter", fontStyle: "oblique" },
          },
          {
            top: "5%",
            left: "center",
            text: titleText,
            textStyle: {
              fontWeight: "bold",
              fontStyle: "normal",
              fontSize: 12,
            },
          },
        ],
        tooltip: {
          trigger: "item",
          axisPointer: { type: "shadow" },
          formatter: (params) => {
            return params.seriesName + "<br/>" + "Test value: " + params.value;
          },
        },
        series: [
          {
            name: testName,
            type: "bar",
            data: [testValue],
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: { color: "#6d81ad", borderRadius: 2 },
          },
        ],
      });
    })
    .catch((error) => {
      displayError(error.message);
    });
}

function dashboardSamplesClustering() {
  var REQUEST = {
    type: Metro.getPlugin(
      "#main-results-dashboard-samples-clustering-type",
      "select"
    ).val(),
    features: Metro.getPlugin(
      "#main-results-dashboard-samples-clustering-features",
      "select"
    ).val(),
  };
  axios
    .post(
      _URL + "/calc/sample_clustering",
      pako.deflate(JSON.stringify(REQUEST)),
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Encoding": "zlib",
        },
      }
    )
    .then((response) => {
      const umap = [];
      const sampleNames = Object.keys(response.data);
      if (response.data !== "1") {
        for (let sampleName in response.data) {
          umap.push(response.data[sampleName]["transform"]);
        }
        _CHARTS[1].setOption({
          tooltip: {
            trigger: "item",
            formatter: (params) => {
              console.log(params);
              let sampleName = sampleNames[params.dataIndex];
              return (
                sampleName +
                "<br/><u>Profile</u><br/>" +
                response.data[sampleName]["profile"]
                  .split(":")
                  .map((p) => {
                    return p.replaceAll(".", " ");
                  })
                  .join("<br/>")
              );
            },
          },
          series: [
            {
              name: "UMAP Clustering",
              type: "scatter",
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: umap,
              symbolSize: 4,
              itemStyle: {
                color: "#444444",
              },
            },
          ],
        });
      }
    })
    .catch((error) => {
      displayError(error.message);
    });
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

function downloadOverviewTable() {
  Swal.fire({
    title: "Download Overview Table",
    html: `
    <p>Please specify the following parameters and proceed with Download.</p>
    <br>
    <div class="remark m-4">
      <div class="grid">
        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="input-info-tag text-upper">the file format of the downloaded table</span></small>
          </div>
          <div class="cell-3 m-2">
            <select
              id="download-data-fileformat"
              class="input-small"
              data-role="select"
              data-prepend="Type"
              data-filter="false"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
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
    background: "#fafafcd9",
    backdrop: `
      rgba(239, 240, 248, 0.1)
      left top
      no-repeat
    `,
  }).then((result) => {
    if (result.isConfirmed) {
      _OVERVIEW_TABLE.download(
        $("#download-data-fileformat")[0].value,
        "overview_table." + $("#download-data-fileformat")[0].value
      );
    }
  });
}
