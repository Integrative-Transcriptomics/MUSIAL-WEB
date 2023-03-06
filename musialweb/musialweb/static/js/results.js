var table;
var tableDefinition = undefined;
var tableData = undefined;
var tableActiveType = undefined;
var tableFilter = [];
var tableGroup = [];
var tableCurrentSamples = [];
var tableCurrentFeatures = [];

axios
  .get(WWW + "/has_session")
  .then((response) => {
    if (response.data != SUCCESS_CODE) {
      $("#main-results").find("*").attr("disabled", true);
      Swal.fire({
        title: "No Active Session",
        html: `You have to be in an active session to use this page.`,
        color: "#747474",
        background: "#fafafcd9",
        allowOutsideClick: true,
        allowEscapeKey: true,
        showConfirmButton: true,
        focusConfirm: true,
        confirmButtonColor: "#39c093cc",
        confirmButtonText: "START SESSION",
        backdrop: `
          rgba(239, 240, 248, 0.1)
          left top
          no-repeat
        `,
      }).then((_) => {
        window.location.href = WWW + "/upload";
      });
    } else {
      $("#main-results").find("*").attr("disabled", false);
      table = new Tabulator("#main-results-content-table", {
        placeholder: `Select Samples, Genes or Variants at <span class="tag-dark text-upper">display content</span>`,
        maxHeight: "60vh",
      });
    }
  })
  .catch((error) => {
    handleError(error);
  });

function setTableToSamples() {
  if ($("#results-set-samples-table").hasClass("active-content")) {
    return;
  }
  var clickHandler = (e, component, onRendered) => {
    var field = component._cell.column.field;
    var target = component._cell.value;
    var container = document.createElement("div");
    var html;
    container.classList.add("grid");
    container.id = "tabulator-popup";
    var feature = field.split("§")[1];
    axios
      .get(WWW + "/get_feature_annotation?target=" + feature + "%" + target)
      .then((response) => {
        html = "";
        for (let key of Object.keys(response.data)) {
          if (key == "Variants") {
            html +=
              `<div class="row">
              <div class="cell text-left">
              <span class="input-info-tag">` +
              key +
              `</span>
              </div>
              </div>`;
            html += `<div class="tabulator-popup-variants">`;
            for (let variant of response.data[key].split(";")) {
              html +=
                `<span>` + variant.replace("!", "&#8674;") + `</span><br>`;
            }
            html += `</div>`;
          } else {
            html +=
              `<div class="row">
              <div class="cell text-left">
              <span class="input-info-tag">` +
              key +
              `</span>
              </div >
              <div class="cell text-right">
              <span>` +
              response.data[key] +
              `</span>
              </div>
              </div>`;
          }
        }
      })
      .finally((_) => {
        container.innerHTML = html;
      });
    return container;
  };
  var cell_formatter = (target, formatterParams, onRendered) => {
    if (
      target._cell.column.field == "Reference Alleles[%]" ||
      target._cell.column.field.includes("Reference Proteoforms[%]")
    ) {
      var content = document.createElement("span");
      var values = target._cell.getValue();
      content.classList.add(formatterParams.type);
      content.innerHTML = values.join("/");
      onRendered(function () {
        peity(content, "donut", {
          fill: ["#6d81ad", "#fe4848cc"],
        });
      });
      return content;
    } else {
      return target._cell.getValue();
    }
  };
  table = new Tabulator("#main-results-content-table", {
    columns: [],
    maxHeight: "60vh",
    columnDefaults: {
      width: "9vw",
      resizable: "header",
      formatter: cell_formatter,
      tooltip: function (e, cell, onRendered) {
        var el = document.createElement("p");
        el.classList.add("hint");
        el.innerText = cell.getValue();
        return el;
      },
      headerTooltip: function (e, column, onRendered) {
        var el = document.createElement("p");
        el.classList.add("hint");
        el.innerText = column.getDefinition().title;
        return el;
      },
    },
    placeholder: `<span class="tag-dark text-upper">no data to display</span>`,
  });
  axios
    .get(WWW + "/get_samples_table")
    .then((response) => {
      handleResponseCode(response);
      try {
        var dataKeys = Object.keys(response.data[0]);
        // Add default columns.
        table.addColumn({ title: "Name", field: "Name" });
        table.addColumn({
          title: "Nucleotide Variants Counts",
          width: "36vw",
          columns: [
            {
              title: "Substitutions",
              field: "Substitutions",
              width: "12vw",
            },
            {
              title: "Insertions",
              field: "Insertions",
              width: "12vw",
            },
            {
              title: "Deletions",
              field: "Deletions",
              width: "12vw",
            },
          ],
        });
        // Add annotation columns.
        var annotationColumns = [];
        for (let dataKey of dataKeys.filter((k) => k.startsWith("AN§"))) {
          annotationColumns.push({
            field: dataKey,
            title: dataKey.replace("AN§", ""),
            width: "8vw",
            resizable: true,
          });
        }
        if (annotationColumns.length > 0) {
          table.addColumn(
            {
              title: "Annotations",
              columns: annotationColumns,
              width: (8 * annotationColumns.length).toString() + "vw",
            },
            false
          );
        }
        // Add allele columns.
        var alleleColumns = [];
        for (let dataKey of dataKeys.filter((k) => k.startsWith("AL§"))) {
          alleleColumns.push({
            field: dataKey,
            title: dataKey.replace("AL§", ""),
            width: "8vw",
            resizable: true,
            tooltip: function (e, cell, onRendered) {
              var el = document.createElement("p");
              el.classList.add("hint");
              el.innerText = "Click for details";
              return el;
            },
            clickPopup: clickHandler,
          });
        }
        if (alleleColumns.length > 0) {
          table.addColumn({
            title: "Reference Alleles[%]",
            field: "Reference Alleles[%]",
            width: "12vw",
            sorter: function (a, b, _, _, _, _, _) {
              console.log(a, b);
              return b[0] - a[0];
            },
            tooltip: function (e, cell, onRendered) {
              let proportion = Math.round(
                (cell.getValue()[0] / cell.getValue()[1]) * 100
              ).toString();
              var el = document.createElement("p");
              el.classList.add("hint");
              el.innerText =
                "Proportion of reference alleles (blue): " + proportion + "%";
              return el;
            },
            clickPopup: clickHandler,
          });
          table.addColumn(
            {
              title: "Alleles",
              columns: alleleColumns,
              width: (8 * alleleColumns.length).toString() + "vw",
            },
            false
          );
        }
        // Add proteoform columns.
        var proteoformColumns = [];
        for (let dataKey of dataKeys.filter((k) => k.startsWith("PF§"))) {
          proteoformColumns.push({
            field: dataKey,
            title: dataKey.replace("PF§", ""),
            width: "8vw",
            resizable: true,
            tooltip: function (e, cell, onRendered) {
              var el = document.createElement("p");
              el.classList.add("hint");
              el.innerText = "Click for details";
              return el;
            },
            clickPopup: clickHandler,
          });
        }
        if (proteoformColumns.length > 0) {
          table.addColumn({
            title: "Reference Proteoforms[%]",
            field: "Reference Proteoforms[%]",
            width: "12vw",
            sorter: function (a, b, _, _, _, _, _) {
              return b[0] - a[0];
            },
            tooltip: function (e, cell, onRendered) {
              let proportion = Math.round(
                (cell.getValue()[0] / cell.getValue()[1]) * 100
              ).toString();
              var el = document.createElement("p");
              el.classList.add("hint");
              el.innerText =
                "Proportion of reference proteoforms (blue): " +
                proportion +
                "%";
              return el;
            },
          });
          table.addColumn(
            {
              title: "Proteoforms",
              columns: proteoformColumns,
              width: (8 * proteoformColumns.length).toString() + "vw",
            },
            false
          );
        }
        table.setData(response.data);
        setTableFieldInputValues(dataKeys);
        $("#results-set-samples-table").addClass("active-content");
        $("#results-set-genes-table").removeClass("active-content");
        $("#results-set-variants-table").removeClass("active-content");
        tableActiveType = "samples";
      } catch (error) {
        handleError(error);
      }
      updateTableSelectionForExport();
    })
    .catch((error) => {
      handleError(error);
    });
}

function setTableToGenes() {
  if ($("#results-set-genes-table").hasClass("active-content")) {
    return;
  }
  var cell_formatter = (target, formatterParams, onRendered) => {
    if (target._cell.column.field == "Structure") {
      if (target._cell.getValue() == "True") {
        let featureName = target._cell.row.data.Name;
        return (
          `<button class="tabulator-structure-button" data-role="hint" data-hint-text="Show protein dashboard for ` +
          featureName +
          `" onclick="getProteinDashboard('` +
          featureName +
          `');">
        <i class="fa-solid fa-chart-pie"></i>
        </button>`
        );
      } else {
        return `None`;
      }
    } else if (!target._cell.column.field.endsWith("Variability")) {
      return target._cell.getValue();
    } else {
      var content = document.createElement("span");
      var values = target._cell.getValue();
      content.classList.add(formatterParams.type);
      content.innerHTML = values.join(",");
      onRendered(function () {
        peity(content, "bar", {
          width: "95%",
          fill: (_) => {
            return "#fe4848cc";
          },
        });
      });
      return content;
    }
  };
  table = new Tabulator("#main-results-content-table", {
    columns: [],
    maxHeight: "60vh",
    columnDefaults: {
      width: "9vw",
      resizable: true,
      formatter: cell_formatter,
      tooltip: function (e, cell, onRendered) {
        var el = document.createElement("p");
        el.classList.add("hint");
        el.innerText = cell.getValue();
        return el;
      },
      headerTooltip: function (e, column, onRendered) {
        var el = document.createElement("p");
        el.classList.add("hint");
        el.innerText = column.getDefinition().title;
        return el;
      },
    },
    placeholder: `<span class="tag-dark text-upper">no data to display</span>`,
    rowContextMenu: [
      {
        label: "View Protein Dashboard",
        action: function (e, row) {
          if (row.getData().Structure == "True") {
            getProteinDashboard(row.getData().Name);
          } else {
            displayWarningPopup(
              "Currently, it is not possible to create a protein dashboard if no protein structure is provided."
            );
          }
        },
      },
    ],
  });
  axios
    .get(WWW + "/get_genes_table")
    .then((response) => {
      handleResponseCode(response);
      try {
        var dataKeys = Object.keys(response.data[0]);
        // Add default columns.
        table.addColumn({ title: "Name", field: "Name" });
        table.addColumn({
          title: "Chromosome",
          field: "Chromosome",
          width: "9vw",
        });
        table.addColumn({
          title: "Start",
          field: "Start",
          width: "7vw",
        });
        table.addColumn({
          title: "End",
          field: "End",
          width: "7vw",
        });
        table.addColumn({
          title: "Orientation",
          field: "Orientation",
          width: "7vw",
        });
        table.addColumn({
          title: "Coding",
          field: "Coding",
          width: "7vw",
        });
        table.addColumn({
          title: "Structure",
          field: "Structure",
          width: "9vw",
        });
        table.addColumn({
          title: "No. Alleles",
          field: "Alleles",
          width: "10vw",
        });
        table.addColumn({
          title: "Alleles' Variability",
          field: "Alleles' Variability",
          width: "12vw",
          tooltip: function (e, cell, onRendered) {
            var el = document.createElement("p");
            el.classList.add("hint");
            el.innerText =
              "Histogram of alleles' variable positions wrt. reference from 0% to >10%";
            return el;
          },
          sorter: function (a, b, _, _, _, _, _) {
            let sumA = 0;
            let sumB = 0;
            for (let i = 0; i < 20; i++) {
              sumA += a[i] * (i + 1);
              sumB += b[i] * (i + 1);
            }
            return sumA - sumB;
          },
        });
        table.addColumn({
          title: "No. Proteoforms",
          field: "Proteoforms",
          width: "10vw",
        });
        table.addColumn({
          title: "Proteoforms' Variability",
          field: "Proteoforms' Variability",
          width: "12vw",
          tooltip: function (e, cell, onRendered) {
            var el = document.createElement("p");
            el.classList.add("hint");
            el.innerText =
              "Histogram of proteoforms' variable positions wrt. reference from 0% to >10%";
            return el;
          },
          sorter: function (a, b, _, _, _, _, _) {
            let sumA = 0;
            let sumB = 0;
            for (let i = 0; i < 20; i++) {
              sumA += a[i] * (i + 1);
              sumB += b[i] * (i + 1);
            }
            return sumA - sumB;
          },
        });
        // Add annotation columns.
        var annotationColumns = [];
        for (let dataKey of dataKeys.filter((k) => k.startsWith("AN§"))) {
          annotationColumns.push({
            field: dataKey,
            title: dataKey.replace("AN§", ""),
            width: "8vw",
            resizable: true,
          });
        }
        if (annotationColumns.length > 0) {
          table.addColumn(
            {
              title: "Annotations",
              columns: annotationColumns,
              width: (8 * annotationColumns.length).toString() + "vw",
            },
            false
          );
        }
        table.setData(response.data);
        setTableFieldInputValues(dataKeys);
        $("#results-set-samples-table").removeClass("active-content");
        $("#results-set-genes-table").addClass("active-content");
        $("#results-set-variants-table").removeClass("active-content");
        tableActiveType = "genes";
      } catch (error) {
        handleError(error);
      }
      updateTableSelectionForExport();
    })
    .catch((error) => {
      handleError(error);
    });
}

function setTableToVariants() {
  if ($("#results-set-variants-table").hasClass("active-content")) {
    return;
  }
  table = new Tabulator("#main-results-content-table", {
    columns: [],
    maxHeight: "60vh",
    columnDefaults: {
      width: "9vw",
      resizable: true,
      tooltip: function (e, cell, onRendered) {
        var el = document.createElement("p");
        el.classList.add("hint");
        el.innerText = cell.getValue();
        return el;
      },
      headerTooltip: function (e, column, onRendered) {
        var el = document.createElement("p");
        el.classList.add("hint");
        el.innerText = column.getDefinition().title;
        return el;
      },
    },
    placeholder: `<span class="tag-dark text-upper">no data to display</span>`,
    maxHeight: "60vh",
  });
  axios
    .get(WWW + "/get_variants_table")
    .then((response) => {
      try {
        var dataKeys = Object.keys(response.data[0]);
        // Add default columns.
        table.addColumn({ title: "Type", field: "Type", width: "8vw" });
        table.addColumn({ title: "Position", field: "Position", width: "8vw" });
        table.addColumn({
          title: "Reference",
          field: "Reference",
          width: "6vw",
        });
        table.addColumn({
          title: "Alternative",
          field: "Alternative",
          width: "6vw",
        });
        table.addColumn({
          title: "Frequency[%]",
          field: "Frequency[%]",
          width: "9vw",
        });
        table.addColumn({
          title: "Effect",
          field: "Effect",
          width: "6vw",
        });
        table.addColumn({
          title: "Occurrence",
          field: "Occurrence",
          width: "6vw",
        });
        // Add SnpEff annotation columns.
        var annotationColumns = [];
        for (let dataKey of dataKeys.filter((k) => k.startsWith("SNPEFF"))) {
          annotationColumns.push({
            field: dataKey,
            title: dataKey.replace("SNPEFF_", ""),
            width: "9vw",
            resizable: true,
          });
        }
        if (annotationColumns.length > 0) {
          table.addColumn(
            {
              title: "SnpEff",
              columns: annotationColumns,
              width: (9 * annotationColumns.length).toString() + "vw",
            },
            false
          );
        }
        table.setData(response.data);
        setTableFieldInputValues(dataKeys);
        $("#results-set-samples-table").removeClass("active-content");
        $("#results-set-genes-table").removeClass("active-content");
        $("#results-set-variants-table").addClass("active-content");
        tableActiveType = "variants";
      } catch (error) {
        handleError(error);
      }
      updateTableSelectionForExport();
    })
    .catch((error) => {
      handleError(error);
    });
}

function setTableFieldInputValues(values) {
  let options = {};
  for (let field of values) {
    if (field.startsWith("PF")) {
      options[field] = "Proteoform_" + field.split("§")[1];
    } else if (field.startsWith("AL")) {
      options[field] = "Allele_" + field.split("§")[1];
    } else {
      options[field] = field.includes("§") ? field.split("§")[1] : field;
    }
  }
  Metro.getPlugin(
    document.getElementById("results-table-group-field"),
    "select"
  ).data(options);
  delete options["Alleles' Variability"];
  delete options["Proteoforms' Variability"];
  delete options["Reference Alleles[%]"];
  delete options["Reference Proteoforms[%]"];
  Metro.getPlugin(
    document.getElementById("results-table-filter-field"),
    "select"
  ).data(options);
}

function addTableFilter() {
  if ($("#results-table-filter-field")[0].value == "Frequency[%]") {
    tableFilter.push({
      field: $("#results-table-filter-field")[0].value,
      type: $("#results-table-filter-type")[0].value,
      value: parseFloat($("#results-table-filter-value")[0].value),
    });
  } else if ($("#results-table-filter-type")[0].value == "keywords") {
    tableFilter.push({
      field: $("#results-table-filter-field")[0].value,
      type: $("#results-table-filter-type")[0].value,
      value: $("#results-table-filter-value")[0]
        .value.replaceAll(";", " ")
        .replaceAll(",", " "),
    });
  } else {
    tableFilter.push({
      field: $("#results-table-filter-field")[0].value,
      type: $("#results-table-filter-type")[0].value,
      value: $("#results-table-filter-value")[0].value,
    });
  }
  table.setFilter(tableFilter);
  table.redraw(true);
  updateTableSelectionForExport();
}

function resetTableFilter() {
  tableFilter = [];
  table.setFilter(tableFilter);
  table.redraw(true);
  updateTableSelectionForExport();
}

function updateTableSelectionForExport() {
  if (tableActiveType == "samples") {
    tableCurrentSamples = table.getData("active").map((row) => row["Name"]);
  } else if (tableActiveType == "genes") {
    tableCurrentFeatures = table.getData("active").map((row) => row["Name"]);
  }
}

function addTableGroup() {
  tableGroup.push($("#results-table-group-field")[0].value);
  table.setGroupBy(tableGroup);
  table.redraw(true);
}

function resetTableGroup() {
  tableGroup = [];
  table.setGroupBy(tableGroup);
  table.redraw(true);
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
      table.download(
        $("#download-data-fileformat")[0].value,
        "overview_table." + $("#download-data-fileformat")[0].value
      );
    }
  });
}

function getSession() {
  displayLoader(
    `Your request is being processed! Your files will be available shortly`
  );
  axios.get(WWW + "/result", { responseType: "blob" }).then((response) => {
    Swal.close();
    handleResponseCode(response);
    downloadBlob(response.data, "session.json.br");
  });
}

function getSequences() {
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
      var request = {
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
        `Your request is being processed! Your files will be available shortly`
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
        });
    }
  });
}

function getVariantsTable() {
  Swal.fire({
    title: "Download Variants Table",
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
          <div class="cell-5 m-2 mh-25">
            <input id="download-data-samples-list" class="input-small" type="text" data-role="taginput"/>
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
          <div class="cell-5 m-2 mh-25">
            <input id="download-data-features-list" class="input-small" type="text" data-role="taginput"/>
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
      var request = {
        MODULE: "EXTRACT",
        contentMode: $("#download-data-content")[0].value.toUpperCase(),
        outputMode: "TABLE",
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
        `Your request is being processed! Your files will be available shortly`
      );
      axios
        .post(WWW + "/download_tables", pako.deflate(JSON.stringify(request)), {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "zlib",
          },
          responseType: "blob",
        })
        .then((response) => {
          Swal.close();
          handleResponseCode(response);
          downloadBlob(response.data, "tables.zip");
        })
        .catch((error) => {
          Swal.close();
          handleError(error);
        });
    }
  });
}

function pasteSamplesFromTable(target) {
  Metro.getPlugin($(target)[0], "taginput").val(tableCurrentSamples);
}

function pasteFeaturesFromTable(target) {
  Metro.getPlugin($(target)[0], "taginput").val(tableCurrentFeatures);
}

function getProteinDashboard(identifier) {
  var dashboard = window.open(
    WWW + "/protein_dashboard?target=" + identifier,
    "_blank"
  );
  dashboard.location;
}
