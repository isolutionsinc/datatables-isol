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

Handlebars.registerHelper("lastValueOfPath", function (data, separator) {
  return data.split(separator).pop();
});

Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});

const defaultConfig = {
  paging: true,
  lengthChange: true,
  order: [0, "asc"],
  searching: true,
  scrollY: document.documentElement.clientHeight - 94,
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

const objectToArray = ({ funcData, filter }) => {
  filter = typeof filter === "string" ? JSON.parse(filter) : filter;
  const entries = Object.entries(funcData);
  const filteredEntries = entries.filter((v) => filter[v[0]]);
  return filteredEntries.map((v) => ({
    key: v[0],
    value: v[1],
    title: filter[v[0]],
  }));
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
        `<img src="${data}" style="height: 100px max-width: 100px" class="img-responsive my-pointer" onerror="this.style.display='none'" />`;
      column.width = "150px";
      break;

    case "img":
      column.render = (data) =>
        `<img src="${data}" class="img-responsive my-pointer" onerror="this.style.display='none'" />`;
      break;

    case "dateTime":
      column.render = (data) => moment(data).format(dtFormat);
      break;

    case "daysSince":
      column.render = (data) =>
        Math.floor(
          moment.duration(moment(new Date()).diff(moment(data))).asDays()
        );
      break;

    case "timeSince":
      column.render = (data) => moment(moment(data)).fromNow();
      break;
  }

  column.templateString &&
    (column.render = function (data, type, row, meta) {
      const tempString = column.templateString;
      const template = Handlebars.compile(tempString);
      return template(row);
    });

  // if (column.highlightColumn) {
  //   column.render = function (data, type, row, meta) {
  //     return `<div class="highlight rounded-0 m-0">${data}</div>`;
  //   };
  // }

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
  }
};

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
      fmJson.data = response.data;
      loadData(fmJson);
    })
    .catch(function (error) {
      // handle error
      sendMessage({
        message: fmJson.axios.message
          ? `${fmJson.axios.message}: ${error.message}`
          : error.message,
      });
    })
    .then(function () {
      // always executed
    });
};

const loadData = (fmData) => {
  const fmJson = typeof fmData === "string" ? JSON.parse(fmData) : fmData;
  let { data, config, columns } = fmJson;
  const {
    filterBy,
    expand,
    script,
    dataPath,
    propFilter,
    dataType,
    sortEmptyToBottom = false,
    dtFormat = "MM/DD/YY",
    globals: globalConfig = {},
  } = config;
  console.log("DEBUG");

  const dataFormat = dataType
    ? dataType
    : Array.isArray(data) && data.length == 0
    ? "empty"
    : typeof data[0] === "string"
    ? "simpleArray"
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
    case "singleObject":
      data = objectToArray({ funcData: data, filter: propFilter });
      break;
    case "array":
      break;
    case "notArray":
      // convert data into array if it is an object
      data = Object.values(data);
      break;
    case "simpleArray":
      data = data.map((value) => {
        return { value };
      });
      break;
    case "objectOfArraysOfObjects":
      // merge values and make unique if an array of objects is the value provided
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

  if (filterBy) {
    data = data.filter((row) => filterBy.values.includes(row[filterBy.column]));
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

  dtPayload.rowCallback = (row, data, index) => {
    const highlight = data.bool_highlight;
    if (highlight == 1) {
      $(row).addClass("highlight");
    }
    const highlight_green = data.bool_highlight_submitted;
    if (highlight_green == 1) {
      $(row).addClass("highlight-green");
    }
  };
  dtPayload.columns = columns;
  dtPayload.data = data;
  dtPayload.oLanguage = { sSearch: "Filter:" };

  // Create the DataTable, after destroying it if already exists
  table && table.destroy();
  try {
    table = $("#example").DataTable(dtPayload);
  } catch (error) {}

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
      global.lastRow = $(this).closest("tr");
      const json = {
        index: row,
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
    global.lastRow = $(this).closest("tr.expand").prev();
    const row = table
      .row(this.closest(".smallTable").previousElementSibling)
      .data();
    const index = table
      .row(this.closest(".smallTable").previousElementSibling)
      .index();
    const json = {
      index: index,
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
  document.querySelector(
    "#example > tbody > tr.odd.shown > td:nth-child(5) > i"
  );
  $.fn.dataTable.ext.errMode = "none";

  const dtHeadHeight =
    $(".dataTables_filter").outerHeight() +
    $(".dataTables_scrollHead").outerHeight() +
    5;
  const dtHeight = `${window.innerHeight - dtHeadHeight}px`;

  $(".dataTables_scrollBody").css("max-height", dtHeight);

  table.columns.adjust().draw();
};

// SELECT BUTTON

const highlightRowAdd = (columnNumber) => {
  $($(lastRow.children()[columnNumber]).children()[0])
    .removeClass("fa-square-o")
    .addClass("fa-check-square-o");
  $(lastRow).addClass("highlight");
};

const highlightRowRemove = (columnNumber) => {
  $($(lastRow.children()[columnNumber]).children()[0])
    .removeClass("fa-check-square-o")
    .addClass("fa-square-o");
  $(lastRow).removeClass("highlight");
};

// SELECT BUTTON

// FAVORITES BUTTON

const favoriteRowAdd = (columnNumber) => {
  $($(lastRow.children()[columnNumber]).children()[0])
    .removeClass("fa-bookmark-o")
    .addClass("fa-bookmark");
};

const favoriteRowRemove = (columnNumber) => {
  $($(lastRow.children()[columnNumber]).children()[0])
    .removeClass("fa-bookmark")
    .addClass("fa-bookmark-o");
};

// FAVORITES BUTTON

const removeLastRow = () => {
  const LastRowSelected = $(lastRow);
  const LastRowSelectedNext = LastRowSelected.next();
  const isExpanded = LastRowSelectedNext.hasClass("expand");

  LastRowSelected.hide();
  if (isExpanded) LastRowSelectedNext.hide();
};

// exposing loadData to FileMaker Script
window.favoriteRowAdd = favoriteRowAdd;
window.favoriteRowRemove = favoriteRowRemove;
window.removeLastRow = removeLastRow;
window.highlightRowAdd = highlightRowAdd;
window.highlightRowRemove = highlightRowRemove;
window.loadData = loadData;
window.loadUrl = loadUrl;
window.sendMessage = sendMessage;

// const scriptName = "Exit Script"
const scriptName = "Set Webviewer DATA";

try {
  FileMaker.PerformScriptWithOption(scriptName, "", 3);
  // show loading message
  $("#loading").fadeIn(2000).fadeOut(5000);
} catch (error) {
  setTimeout(() => {
    FileMaker.PerformScriptWithOption(scriptName, "", 3);
    // show loading message
    $("#loading").fadeIn(2000).fadeOut(5000);
  }, 400);
}
