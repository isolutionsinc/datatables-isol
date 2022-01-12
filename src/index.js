const Handlebars = require("handlebars");
const temp = Handlebars.compile("Name: {{name}}");

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

Handlebars.registerHelper("percent", function (data) {
  return numeral(data).format("0,0%");
});

Handlebars.registerHelper("numeral", function (data, format) {
  return numeral(data).format(format);
});

let table;
let rows = "";
let template;

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

// exposing loadData to FileMaker Script
window.loadData = function (json) {
  const obj = JSON.parse(json); // data from FM is a string
  const { data, config, columns } = obj;
  const {
    expand,
    script,
    sortEmptyToBottom = false,
    dtFormat = "MM/DD/YY",
    globals: globalConfig = {},
  } = config;

  const dtPayload = { ...defaultConfig, ...globalConfig };

  const buildExpandTableRow = (d) => {
    const data = d; // `d` is the original data object for the row
    const tableStr = `<table class=" table subTable">`;
    const tableEnd = `</table>`;
    expand.forEach((e) => {
      const tempString = e.templateString || "";
      const template = Handlebars.compile(tempString);
      const templateRow = template(d);
      rows =
        rows +
        `<tr><td class="expand title" id="${e.data}" width="20%">${
          e.title
        }</td><td class="expand data" id="${e.data}">${
          e.columnType === "template" ? templateRow : d[e.data] || ""
        }</td></tr>`;
      return rows;
    });
    return tableStr + rows + tableEnd;
  };

  columns.forEach((elm) => {
    sortEmptyToBottom
      ? (elm.type = $.fn.dataTable.absoluteOrder({
          value: "",
          position: "bottom",
        }))
      : (elm.type = "");

    if (elm.numberFormat)
      elm.render = function (data, type, row, meta) {
        return numeral(data).format(elm.numberFormat);
      };

    switch (elm.columnType) {
      case "percent":
        elm.render = function (data, type, row, meta) {
          return numeral(data).format("0,0%");
        };
        break;

      case "number":
        elm.render = function (data, type, row, meta) {
          return numeral(data).format("0,0");
        };
        break;

      case "button":
        elm.render = function (data, type, row, meta) {
          return "<button class='btn btn-primary middle'>Download</button>";
        };
        break;

      case "thumbnail":
        elm.render = function (data, type, row, meta) {
          return `<img src="${data}" style="height: 100px max-width: 100px" class="img-responsive my-pointer" />`;
        };
        elm.width = "150px";
        break;

      case "img":
        elm.render = function (data, type, row, meta) {
          return `<img src="${data}" class="img-responsive my-pointer" />`;
        };
        break;

      case "dateTime":
        elm.render = function (data, type, row, meta) {
          return moment(data).format(dtFormat);
        };
        break;
    }

    elm.templateString &&
      (elm.render = function (data, type, row, meta) {
        console.log({ data, type, row, meta });
        const tempString = elm.templateString;
        const template = Handlebars.compile(tempString);
        return template(row);
      });

    if (elm.colorSettings) {
      elm.render = function (data, type, row, meta) {
        const { numberFormat, success, warning } = elm.colorSettings;
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
      elm.className = "compact";
    }

    return elm;
  });

  // console.log(columns);

  if (expand) {
    columns.unshift(expandColumn);
    dtPayload.order[0]++;
  }

  template = columns
    .map((elm) => elm.data)
    .reduce((acc, curr) => ((acc[curr] = ""), acc), {});

  const dataUpdated = data.map((elm) => {
    return { ...template, ...elm };
  });

  const ell = (c) => {
    return function (data, type, row) {
      return data.length > c ? data.substr(0, c) + "..." : data;
    };
  };

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
      row.child(buildExpandTableRow(row.data()), "expand").show();
      $(row.child()).addClass("smallTable"); // row.child(className="expand")
      tr.addClass("shown");
      tdi.first().addClass("fa-caret-down").removeClass("fa-caret-right");
    }
  });

  table.on("user-select", function (e, dt, type, cell, originalEvent) {
    if ($(cell.node()).hasClass("dt-control")) {
    }
  });

  // hide result count when paging is off
  dtPayload.paging === false && $("#example_info").remove();

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

    // console.log(e.target.closest(".expand").id);
  });

  // console.log({ dtPayload });

  $.fn.dataTable.ext.errMode = "none";
};
