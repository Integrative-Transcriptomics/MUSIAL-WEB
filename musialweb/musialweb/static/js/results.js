var _OVERVIEW_TABLE;
var _OVERVIEW_TABLE_FILTERS_AND_GROUPS = [];
var _SESSION_DATA = {
  SET: false,
  SAMPLES: {},
  FEATURES: {},
  VARIANTS: {},
};
var ACTIVE_CATEGORY = null;
var _CHARTS = [];
var _CHART_OBSERVERS = [];

const mean = (data) => {
  if (data.length < 1) {
    return;
  }
  return data.reduce((p, c) => p + c) / data.length;
};

axios
  .get(_URL + "/session/status")
  .then((response) => {
    switch (String(response.data.code)) {
      case API_PARAMETERS["SESSION_CODE_FAILED"]:
        Swal.fire({
          title: "Faulty Session Data",
          html:
            `Your request failed. Please check your input data.
            You can access the server log <a href='` +
            _URL +
            `/log' target='_blank'>here</a>.
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
          background: "transparent",
          heightAuto: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          backdrop: `
          rgba(239, 240, 248, 0.1)
          left top
          no-repeat
        `,
        });
        break;
      case API_PARAMETERS["SESSION_CODE_ACTIVE"]:
        if (!_SESSION_DATA.SET) {
          Swal.fire({
            title: "Preparing Results",
            iconHtml:
              `<img src="` +
              BACTERIA_GIF +
              `" style="height: 100%; width: 100%; pointer-events: none; user-select: none;">`,
            html: `Results of your analysis will be displayed shortly.`,
            color: "#747474",
            background: "transparent",
            heightAuto: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            backdrop: `
              rgba(239, 240, 248, 0.1)
              left top
              no-repeat
            `,
          });
          axios
            .get(_URL + "/session/data", {
              headers: {
                "Content-Type": "application/json",
              },
            })
            .then((response) => {
              if (response.data.code == API_PARAMETERS["SUCCESS_CODE"]) {
                Swal.close();
                _SESSION_DATA.SET = true;
                let responseContent = JSON.parse(response.data.content);
                _SESSION_DATA.SAMPLES = responseContent[0];
                $("#main-results-table-set-samples-button").html(
                  `samples <span class="badge">` +
                    _SESSION_DATA.SAMPLES.records.length +
                    `</span>`
                );
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
                Swal.fire({
                  title: "Faulty Session Data",
                  html:
                    `Failed to retrieve session results.
                    You can access the server log <a href='` +
                    _URL +
                    `/log' target='_blank'>here</a>.
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
              }
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
  if (_SESSION_DATA.SET) {
    if (typeof _OVERVIEW_TABLE == "object") _OVERVIEW_TABLE.setData();
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
  } else {
    return false;
  }
}

function showSamples() {
  if (showContent(_SESSION_DATA.SAMPLES)) {
    $("#main-results-table-set-samples-button").addClass("active-content");
    $("#main-results-dashboard-samples").show();
    constructEChartInstance(
      $("#main-results-dashboard-samples-left")[0],
      _SESSION_DATA.SAMPLES.dashboard.overview_area
    );
    constructEChartInstance(
      $("#main-results-dashboard-samples-right")[0],
      _SESSION_DATA.SAMPLES.dashboard.clustering_map_allele
    );
    dashboardSamplesOverview("number_of_substitutions", {
      innerText: "substitutions",
    });
    dashboardSamplesClustering();
    ACTIVE_CATEGORY = "samples";
  }
}

function dashboardSamplesOverview(val, option) {
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
  let option =
    _SESSION_DATA.SAMPLES.dashboard[
      "clustering_map_" +
        Metro.getPlugin(
          "#main-results-dashboard-samples-clustering-type",
          "select"
        ).val()
    ];
  option["tooltip"] = {
    trigger: "item",
    backgroundColor: "rgba(228, 229, 237, 0.8)",
    borderColor: "rgba(228, 229, 237, 0.8)",
    textStyle: {
      fontSize: 11,
    },
    formatter: (params, ticket, callback) => {
      cluster_data = option["series"].filter(
        (_) => _.name == "Cluster " + params.data[3]
      );
      if (cluster_data.length > 0) {
        cluster_data = cluster_data[0].data;
        feature_distances = cluster_data.map((_) => _[3]);
        unit_distances = cluster_data.map((_) => _[4]);
        feature_distances_t = _transpose(feature_distances);
        feature_distances_content = `<table class="table subcompact"><thead><tr><th style="color: #747474;">Feature</th><th style="color: #747474;">Mean Hamming Distance (%)</th><th style="color: #747474;">Std. Hamming Distance (%)</th></tr></thead><tbody>`;
        for (let i = 0; i < feature_distances_t.length; i++) {
          feature_distances_content +=
            `<tr><td>` +
            option["meta"]["features"][i] +
            `</td><td>` +
            parseFloat(math.mean(feature_distances_t[i]) * 100).toPrecision(2) +
            `</td><td>` +
            parseFloat(math.std(feature_distances_t[i]) * 100).toPrecision(2) +
            `</td></tr>`;
        }
        feature_distances_content += `</tbody></table>`;
      } else {
        return;
      }
      return (
        `<b>Cluster ` +
        params.data[3] +
        `</b> | ` +
        cluster_data.length +
        ` Samples</br>` +
        feature_distances_content
      );
    },
  };
  _CHARTS[1].setOption(option, true, false);
}

function showFeatures() {
  if (showContent(_SESSION_DATA.FEATURES)) {
    $("#main-results-table-set-features-button").addClass("active-content");
    $("#main-results-dashboard-features").show();
    constructEChartInstance(
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
    constructEChartInstance(
      $("#main-results-dashboard-features-right")[0],
      _SESSION_DATA.FEATURES.dashboard.forms_graph
    );
    let featureSelectOptions = {};
    for (let featureRecord of _SESSION_DATA.FEATURES.records) {
      featureSelectOptions[featureRecord.name] = featureRecord.name;
    }
    Metro.getPlugin(
      document.getElementById("main-results-dashboard-features-forms-feature"),
      "select"
    ).data(featureSelectOptions);
    Metro.getPlugin(
      document.getElementById(
        "main-results-dashboard-features-proteoforms-feature"
      ),
      "select"
    ).data(featureSelectOptions);
    ACTIVE_CATEGORY = "features";
  }
}

function dashboardFeaturesForms() {
  var REQUEST = {
    feature: Metro.getPlugin(
      "#main-results-dashboard-features-forms-feature",
      "select"
    ).val(),
  };
  _CHARTS[1].showLoading({
    color: "#6d81ad",
    text: "Loading...",
    maskColor: "rgb(250, 250, 252, 0.8)",
  });
  axios
    .post(_URL + "/calc/forms_graph", pako.deflate(JSON.stringify(REQUEST)), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "zlib",
      },
    })
    .then((response) => {
      _CHARTS[1].setOption({
        title: {
          top: 0,
          left: 0,
          text: REQUEST.feature + " Forms Graph",
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
            fontSize: 11,
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
          textStyle: { fontSize: 8, color: "#747474" },
          backgroundColor: "rgba(228, 229, 237, 0.8)",
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
              repulsion: 5,
              gravity: 0.1,
              friction: 0.3,
              edgeLength: [1, 2, 3, 5, 8, 13, 21, 34],
              layoutAnimation: true,
            },
            roam: true,
            data: response.data[0],
            links: response.data[1],
            top: "10%",
            bottom: "10%",
            emphasis: {
              focus: "adjacency",
              label: {
                show: true,
                color: "#747474",
                backgroundColor: "rgba(228, 229, 237, 0.8)",
                borderColor: "rgba(228, 229, 237, 0.8)",
              },
              edgeLabel: {
                show: true,
                color: "#747474",
                backgroundColor: "rgba(228, 229, 237, 0.8)",
                borderColor: "rgba(228, 229, 237, 0.8)",
                formatter: (params) => {
                  if (params.data.type == "relation") {
                    return -1 * params.data.value + " Variant(s)";
                  } else if (params.data.type == "interconnection") {
                    return params.data.value + " Sample(s)";
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
    })
    .catch((error) => {
      console.log(error);
      displayError(error.message);
    })
    .finally(() => {
      _CHARTS[1].hideLoading();
    });
}

function dashboardFeaturesProteoforms() {
  var target = Metro.getPlugin(
    "#main-results-dashboard-features-proteoforms-feature",
    "select"
  ).val();
  var dashboard = window.open(
    _URL + "/extension/feature_proteoforms?target=" + target,
    "_blank"
  );
  dashboard.location;
}

function showVariants() {
  if (showContent(_SESSION_DATA.VARIANTS)) {
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
              (mean(frequency) * 100).toFixed(2) +
              " %" +
              "<br>" +
              "<b>Avg. Quality</b>: " +
              mean(quality).toFixed(2) +
              "<br>" +
              "<b>Avg. Coverage</b>: " +
              mean(coverage).toFixed(2) +
              "<br></div>"
          );
        }
        return contents.join("");
      },
      alwaysShowContent: true,
      position: ["5%", "65%"],
      backgroundColor: "rgba(228, 229, 237, 0.5)",
      borderColor: "rgba(228, 229, 237, 0.5)",
    };
    _SESSION_DATA.VARIANTS.dashboard.variants_bar["yAxis"][0]["axisLabel"] = {
      formatter: (value, index) => {
        return value.toFixed(1) + "%";
      },
    };
    constructEChartInstance(
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
    ACTIVE_CATEGORY = "variants";
  }
}

function constructTableColumns(columnFields) {
  let columnDefinitions = [];
  let propertySelectOptions = {};
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
    } else if (columnField.startsWith("occurrence")) {
      columnDefinitions.push({
        title: titleValue,
        field: columnField,
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
      columnField.startsWith("frequency") ||
      columnField.startsWith("variable")
    ) {
      columnDefinitions.push({
        title: titleValue,
        field: columnField,
        headerTooltip: true,
        formatter: function (cell, formatterParams, onRendered) {
          return parseFloat(cell.getValue()).toFixed(2) + " %";
        },
      });
    } else {
      columnDefinitions.push({
        title: titleValue,
        field: columnField,
        headerTooltip: true,
      });
    }
    propertySelectOptions[columnField] = titleValue;
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

function constructEChartInstance(element, option) {
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

function addTableFilter() {
  _OVERVIEW_TABLE_FILTERS_AND_GROUPS.push(
    $("#main-results-table-filter-field")[0].value +
      " " +
      $("#main-results-table-filter-type")[0].value +
      " " +
      $("#main-results-table-filter-value")[0].value
  );
  Metro.getPlugin("#main-results-table-manage-tags", "taginput").val(
    _OVERVIEW_TABLE_FILTERS_AND_GROUPS
  );
  applyTableFilterAndGroups();
}

function addTableGroup() {
  _OVERVIEW_TABLE_FILTERS_AND_GROUPS.push(
    "groupby " + $("#main-results-table-group-field")[0].value
  );
  Metro.getPlugin("#main-results-table-manage-tags", "taginput").val(
    _OVERVIEW_TABLE_FILTERS_AND_GROUPS
  );
  applyTableFilterAndGroups();
}

function applyTableFilterAndGroups() {
  if (typeof _OVERVIEW_TABLE == "undefined") {
    return;
  }
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
  _OVERVIEW_TABLE.redraw(true);
}

function updateTableFilterAndGroups() {
  _OVERVIEW_TABLE_FILTERS_AND_GROUPS = Metro.getPlugin(
    "#main-results-table-manage-tags",
    "taginput"
  ).val();
  applyTableFilterAndGroups();
}

function dataCorrelation() {
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
    data_type: ACTIVE_CATEGORY,
  };
  axios
    .post(_URL + "/calc/correlation", pako.deflate(JSON.stringify(REQUEST)), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "zlib",
      },
    })
    .then((response) => {
      testValue = "Failed";
      pValue = "Failed";
      if (response.data[3] == "0") {
        testValue = response.data[1].toString();
        pValue = response.data[2].toString();
      }
      $("#main-results-dashboard-correlation-results").html(
        `Test Value: ` + testValue + `&nbsp;&nbsp;&nbsp;P-Value: ` + pValue
      );
    })
    .catch((error) => {
      displayError(error.message);
    });
}

function downloadSessionData() {
  displayToast(
    "Request submitted. Your download will start once complete.",
    4000
  );
  axios
    .get(_URL + "/download_session_data", { responseType: "blob" })
    .then((response) => {
      downloadBlob(response.data, "session.json.br");
    })
    .catch((error) => {
      displayError(error.message);
    });
}

function downloadOverviewTable() {
  _OVERVIEW_TABLE.download("csv", ACTIVE_CATEGORY + "_overview.csv");
}

function downloadSequences() {
  Swal.fire({
    title: "Download Sequences",
    html: `
    <p>Please specify the following parameters and proceed with Download.</p>
    <br>
    <div class="remark m-4">
      <div class="grid">
        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">the content to use for the sequences</span></small>
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
              id="download-data-align-sequences"
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
            <small><span class="rounded input-info-tag text-upper">group by allele or proteoform</span></small>
          </div>
          <div class="cell-3 m-2">
            <input
              id="download-data-group"
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
              checked
              data-role="switch"
              data-cls-switch="custom-switch-on-off"
              data-material="true"
            />
          </div>
        </div>
        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">include indels</span></small>
          </div>
          <div class="cell-3 m-2">
            <input
              id="download-data-include-indels"
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
            <small><span class="rounded input-info-tag text-upper">include only or exclude specified samples</span></small>
            <button class="button small rounded data-download-copy-from-table-button m-2" onclick="pasteSamplesFromTable('#download-data-samples-list')"><i class="fa-regular fa-paste"></i></button>
          </div>
          <div class="cell-1 mt-2 text-right">Include</div>
          <div class="cell-1 ml-2">
            <input
              id="download-data-samples-mode"
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
        <div class="row">
          <div class="cell-3 m-2 text-left">
            <small><span class="rounded input-info-tag text-upper">include only or exclude specified features</span></small>
            <button class="button small rounded data-download-copy-from-table-button m-2" onclick="pasteFeaturesFromTable('#download-data-features-list')"><i class="fa-regular fa-paste"></i></button>
          </div>
          <div class="cell-1 mt-2 text-right">Include</div>
          <div class="cell-1 ml-2">
            <input
              id="download-data-features-mode"
              type="checkbox"
              data-role="switch"
              data-cls-switch="custom-switch-choice"
              data-material="true"
            />
          </div>
          <div class="cell-1 mt-2 text-left">Exclude</div>
          <div class="cell-5 m-2">
            <input id="download-data-features-list" class="input-small" type="text" data-role="taginput" >
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
      /*var request = {
        MODULE: "EXTRACT",
        contentMode: $("#download-data-content")[0].value.toUpperCase(),
        outputMode:
          "SEQUENCE" +
          ($("#download-data-align-sequences").is(":checked")
            ? "_ALIGNED"
            : ""),
        excludeIndels: !$("#download-data-include-indels").is(":checked"),
        excludeConservedPositions: !$(
          "#download-data-include-conserved-positions"
        ).is(":checked"),
        filterVariantsBy: {},
        grouped: $("#download-data-group").is(":checked"),
        inputFile: "",
        outputDirectory: "",
      };
      if ($("#download-data-samples-mode").is(":checked")) {
        request["excludeSamples"] = $("#download-data-samples-list")[0]
          .value.split(",")
          .filter((e) => e !== "");
      } else {
        request["includeSamples"] = $("#download-data-samples-list")[0]
          .value.split(",")
          .filter((e) => e !== "");
      }
      if ($("#download-data-features-mode").is(":checked")) {
        request["excludeFeatures"] = $("#download-data-features-list")[0]
          .value.split(",")
          .filter((e) => e !== "");
      } else {
        request["includeFeatures"] = $("#download-data-features-list")[0]
          .value.split(",")
          .filter((e) => e !== "");
      }
      displayLoader(
        "Processing Request (Your files will be downloaded automatically)",
        10e9
      );
      axios
        .post(
          WWW + "/download_sequences",
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
          Swal.close();
          handleResponseCode(response);
          downloadBlob(response.data, "sequences.zip");
        })
        .catch((error) => {
          handleError(error);
        })
        .finally(hideLoader());*/
    }
  });
}

function _transpose(arr2D) {
  return arr2D[0].map((x, i) => arr2D.map((x) => x[i]));
}
