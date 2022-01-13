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

// Functions

const setColumns = (column, sortEmptyToBottom = sortEmptyToBottom) => {
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
      // console.log({ data, type, row, meta });
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

const buildExpandTableRowHtml = (rowData, expand) => {
  const rows = expand
    .map((e) => {
      const { title, data, render, className = "" } = e;
      const renderedData = render
        ? e.render(rowData[data])
        : rowData[data]
        ? rowData[data]
        : "";
      return `<tr><td class="expand title" id="${data}" width="20%">${title}</td><td class="expand data ${className}" id="${data}">${renderedData}</td></tr>`;
    })
    .join(" ");
  return `<table class="table subTable">${rows}</table>`;
};

// exposing loadData to FileMaker Script
window.loadData = function (fmData) {
  const fmJson = JSON.parse(fmData); // data from FM is a string

  let { data, config, columns } = fmJson;
  const {
    expand,
    script,
    dataPath,
    sortEmptyToBottom = false,
    dtFormat = "MM/DD/YY",
    globals: globalConfig = {},
  } = config;

  // extract data from path if provided
  if (dataPath) {
    data = data[dataPath];
  }
  // convert data into array if it is an object
  if (!Array.isArray(data)) {
    data = Object.values(data);
  }

  const dtPayload = { ...defaultConfig, ...globalConfig };

  // set render methods for columns and expand
  columns.forEach(setColumns);
  expand.forEach(setColumns);

  // add expand column to table and shift the current default sort over
  if (expand) {
    columns = [expandColumn, ...columns];
    dtPayload.order[0]++;
  }
  // ???
  template = columns
    .map((elm) => elm.data)
    .reduce((acc, curr) => ((acc[curr] = ""), acc), {});
  // ???

  const dataUpdated = data.map((elm) => {
    return { ...template, ...elm };
  });
  // ???
  const ell = (c) => {
    return function (data, type, row) {
      return data.length > c ? data.substr(0, c) + "..." : data;
    };
  };
  // ???
  dataUpdated.forEach(function (d) {
    d.render = d.ellipsis ? ell(d.ellipsis) : undefined;
  });
  dtPayload.columns = columns;
  dtPayload.data = dataUpdated;

  // Create the DataTable, after destroying it if already exists
  table && table.destroy();
  table = $("#example").DataTable(dtPayload);

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
      console.log({ childHtml });
      row.child(childHtml, "expand").show();
      console.log(row.child().html());
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
        row: dataUpdated[row],
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

    // // console.log(e.target.closest(".expand").id);
  });

  $.fn.dataTable.ext.errMode = "none";
};
