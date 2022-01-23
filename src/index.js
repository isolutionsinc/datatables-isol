let table;
let template;

jQuery.extend(jQuery.fn.dataTableExt.oSort, {
  "non-empty-string-desc": function (str1, str2) {
    if (str1 == "" && str2 != "") return 1;
    if (str2 == "" && str1 != "") return -1;
    if (str1 == "" && str2 == "") return 0;
    return str1 < str2 ? -1 : str1 > str2 ? 1 : 0;
  },

  "non-empty-string-asc": function (str1, str2) {
    if (str1 == "" && str2 != "") return -1;
    if (str2 == "" && str1 != "") return 1;
    if (str1 == "" && str2 == "") return 0;
    return str1 < str2 ? 1 : str1 > str2 ? 1 : 0;
  },
});

// add helper functions to Handlebars
Handlebars.registerHelper("percent", function (data) {
  return numeral(data).format("0,0%");
});
Handlebars.registerHelper("numeral", function (data, format) {
  return numeral(data).format(format);
});

const defaultConfig = {
  paging: true,
  lengthChange: true,
  order: [0, "asc"],
  searching: true,
  scrollY: $(window).height() - 150,
  height: "100%",
  colReorder: true,
};

const expandColumn = {
  className: "dt-control",
  orderable: false,
  columnType: "arrow",
  data: null,
  defaultContent: "",
  width: "32px",
  render: function () {
    return '<i class="fa fa-caret-right" aria-hidden="true"></i>';
  },
};

const buildExpandTableRowHtml = (rowData, expand) => {
  const rows = expand
    .map((e) => {
      const { title, data, render, className = "" } = e;
      const rowDataLocation = data.replace("\\", "");
      const renderedData = render
        ? e.render(rowData[rowDataLocation])
        : _.get(rowData, data) || "";

      return `<tr><td class="expand title" id="${data}" width="20%">${title}</td><td class="expand data ${className}" id="${data}">${renderedData}</td></tr>`;
    })
    .join(" ");
  return `<table class="table subTable">${rows}</table>`;
};

const setColumns = (column, env) => {
  const { dtFormat, sortEmptyToBottom } = env;
  sortEmptyToBottom
    ? (column.type = $.fn.dataTable.absoluteOrder({
        value: "",
        position: "bottom",
      }))
    : (column.type = "");

  if (column.numberFormat)
    column.render = function (data) {
      return numeral(data).format(column.numberFormat);
    };

  column.defaultContent = "";

  switch (column.columnType) {
    case "percent":
      column.render = (data) => numeral(data).format("0,0%");
      break;

    case "number":
      column.render = (data) => numeral(data).format("0,0");
      break;

    case "button":
      column.render = (data) =>
        "<button class='btn btn-primary middle'>Download</button>";
      break;

    case "thumbnail":
      column.render = (data) =>
        `<img src="${data}" style="height: 100px max-width: 100px" class="img-responsive my-pointer" />`;
      column.width = "150px";
      break;

    case "img":
      column.render = (data) =>
        `<img src="${data}" class="img-responsive my-pointer" />`;
      break;

    case "dateTime":
      column.render = (data) => moment(data).format(dtFormat);
      break;
  }

  column.templateString &&
    (column.render = function (data, type, row, meta) {
      const tempString = column.templateString;
      const template = Handlebars.compile(tempString);
      return template(row);
    });

  if (column.colorSettings) {
    column.render = function (data, type, row, meta) {
      const { numberFormat, success, warning } = column.colorSettings;
      const dataFormatted =
        typeof data !== "number"
          ? data
          : numeral(data).format(numberFormat || "0,0");
      const color =
        typeof data !== "number"
          ? "light"
          : data >= success
          ? "success"
          : data >= warning
          ? "warning"
          : "danger";
      return `<div class="alert alert-${color} rounded-0 text-dark m-0">${dataFormatted}</div>`;
    };
    column.className = "compact";
  }
};

// show loading message
$("#loading").fadeIn(2000);

// Ability to show alert
const sendMessage = function (fmData) {
  const fmJson = typeof fmData === "string" ? JSON.parse(fmData) : fmData;
  $("#message").show().text(fmJson.message);
  $("#loading").hide();
};

// Ability to load data from a URL
const loadUrl = function (fmData) {
  const fmJson = JSON.parse(fmData); // data from FM is a string
  axios(fmJson.axios)
    .then(function (response) {
      // handle success
      console.log({ response });
      fmJson.data = response.data;
      loadData(fmJson);
    })
    .catch(function (error) {
      // handle error
      console.log({ error });
      sendMessage({ message: error.message });
    })
    .then(function () {
      // always executed
    });
};

const loadData = (fmData) => {
  const fmJson = typeof fmData === "string" ? JSON.parse(fmData) : fmData;
  let { data, config, columns } = fmJson;
  const {
    expand,
    script,
    dataPath,
    sortEmptyToBottom = false,
    dtFormat = "MM/DD/YY",
    globals: globalConfig = {},
  } = config;

  const dataFormat =
    Array.isArray(data) && data.length == 0
      ? "empty"
      : Array.isArray(Object.entries(data)[0][1])
      ? "objectOfArraysOfObjects"
      : !Array.isArray(data)
      ? "notArray"
      : "array";

  // extract data from path if provided
  if (dataPath && dataFormat !== "empty") {
    data = _.get(data, dataPath);
  }

  switch (dataFormat) {
    case "array":
      break;
    case "notArray":
      // convert data into array if it is an object
      data = Object.values(data);
      break;
    case "objectOfArraysOfObjects":
      // merge values and make unique if an array of objects is the value provided
      console.log({ dataFormat });
      data = Object.entries(data).map((datum) => {
        return {
          key: datum[0],
          ...datum[1].reduce((acc, val) =>
            _.mergeWith(acc, val, (newValue, srcValue) => {
              const result = newValue
                ? [
                    ...new Set([
                      ...(Array.isArray(newValue) ? newValue : [newValue]),
                      ...(Array.isArray(srcValue) ? srcValue : [srcValue]),
                    ]),
                  ]
                : srcValue;
              return Array.isArray(result) && result.length === 1
                ? result[0]
                : result;
            })
          ),
        };
      });

      break;

    default:
      break;
  }

  const dtPayload = { ...defaultConfig, ...globalConfig };

  // set render methods for columns and expand
  columns.forEach((column) =>
    setColumns(column, { dtFormat, sortEmptyToBottom })
  );
  expand &&
    expand.forEach((column) =>
      setColumns(column, { dtFormat, sortEmptyToBottom })
    );

  // add expand column to table and shift the current default sort over
  if (expand) {
    columns = [expandColumn, ...columns];
    dtPayload.order[0]++;
  }

  dtPayload.columns = columns;
  dtPayload.data = data;

  // Create the DataTable, after destroying it if already exists
  table && table.destroy();
  try {
    table = $("#example").DataTable(dtPayload);
  } catch (error) {
    console.log({ error });
  }

  // Add the click handler to the row, after removing it if already exists
  $("#example tbody").off("click");
  $("#example tbody").on("click", "td.dt-control", function (e) {
    var tr = $(this).closest("tr");
    var tdi = tr.find("i.fa");
    var row = table.row(tr);

    if (row.child.isShown()) {
      // This row is already open - close it
      row.child.hide();
      tr.removeClass("shown");
      tdi.first().addClass("fa-caret-right").removeClass("fa-caret-down");
    } else {
      // Open this row
      const childHtml = buildExpandTableRowHtml(row.data(), expand);
      row.child(childHtml, "expand").show();
      $(row.child()).addClass("smallTable"); // row.child(className="expand")
      tr.addClass("shown");
      tdi.first().addClass("fa-caret-down").removeClass("fa-caret-right");
    }
    e.stopPropagation();
  });

  // hide result count when paging is off
  dtPayload.paging === false && $("#example_info").remove();

  // add click event for rows
  $("#example tbody").on(
    "click",
    "td:not(.dt-control):not(.expand)",
    function () {
      var cell = table.cell(this);
      const cellObj = cell[0][0];
      const value = cell.data();
      const col = table.column(this).index();
      const row = table.row(this).index();
      const json = {
        location: "row",
        value,
        column: columns[col],
        row: data[row],
      };
      script && FileMaker.PerformScript(script, JSON.stringify(json));
    }
  );
  // add click event for expand sections
  $("#example tbody").on("click", ".data, .title", function (e) {
    const row = table
      .row(this.closest(".smallTable").previousElementSibling)
      .data();
    const json = {
      location: "expand",
      row,
      value: row[e.target.id],
      expand: {
        id: e.target.closest(".expand").id,
        classList: e.target.classList,
      },
    };

    script && FileMaker.PerformScript(script, JSON.stringify(json));
  });

  $("#loading").hide();

  $.fn.dataTable.ext.errMode = "none";
};

// exposing loadData to FileMaker Script
window.loadData = loadData;
window.loadUrl = loadUrl;
window.sendMessage = sendMessage;

FileMaker.PerformScript("Set Webviewer DATA");
