const Handlebars = require("handlebars");
const temp = Handlebars.compile("Name: {{name}}");

var table;

const defaultConfig = {
  paging: true,
  lengthChange: true,
  order: [1, "asc"],
  searching: true,
  scrollY: $(window).height() - 150,
  height: "100%",
  colReorder: true,
};
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

const expandColumn = {
  className: "dt-control",
  orderable: false,
  columnType: "arrow",
  data: null,
  defaultContent: "",
  width: "55px",
  render: function () {
    return '<i class="fa fa-caret-right" aria-hidden="true"></i>';
  },
};

// exposing loadData to FileMaker Script
window.loadData = function (json) {
  var obj = JSON.parse(json); // data from FM is a string

  const { data, config, columns } = obj;
  const {
    expand,
    globals: globalConfig = {},
    dtFormat = "MM/DD/YY",
    script,
    sortEmptyToBottom: sort = true,
  } = config;

  let expandClickSet = true;

  var nameType = $.fn.dataTable.absoluteOrder({
    value: "",
    position: "bottom",
  });
  let rows = "";

  const globals = { ...defaultConfig, ...globalConfig };

  const buildExpandTableRow = (d) => {
    const data = d; // `d` is the original data object for the row
    rows = "";
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
    sort ? (elm.type = nameType) : (elm.type = "");
    elm.columnType === "button"
      ? (elm.render = function (data, type, row, meta) {
          return "<button class='btn btn-primary middle'>Download</button>";
        })
      : null;
    elm.columnType === "thumbnail"
      ? (elm.render = function (data, type, row, meta) {
          return `<img src="${data}" oneerror='this.oneerror=null' alt='' class="img-responsive thumbnail my-pointer" />`;
        })
      : null;
    elm.columnType === "img"
      ? (elm.render = function (data, type, row, meta) {
          return `<img src="${data}" oneerror='this.oneerror=null' alt='' class="my-pointer img-responsive" />`;
        })
      : null;

    elm.columnType === "dateTime"
      ? (elm.render = function (data, type, row, meta) {
          return moment(data).format(dtFormat);
        })
      : null;
    elm.columnType === "template"
      ? (elm.render = function (data, type, row, meta) {
          const tempString = elm.templateString;
          const template = Handlebars.compile(tempString);
          return template(row);
        })
      : null;
    return elm;
  });

  if (expand) {
    columns.unshift(expandColumn);
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
  globals.columns = columns;
  globals.data = dataUpdated;

  // Create the DataTable, after destroying it if already exists
  if (table) table.destroy();
  table = $("#example").DataTable(globals);

  // Add the click handler to the row, after removing it if already exists
  if (script) {
    $("#example tbody").off("click");
    $("#example tbody").on("click", "td.dt-control", function (e) {
      var tr = $(this).closest("tr");
      var tdi = tr.find("i.fa");
      var row = table.row(tr);

      if (row.child.isShown()) {
        // This row is already open - close it
        row.child.hide();
        tr.removeClass("shown");
        tdi.first().removeClass("fa-caret-down");
        tdi.first().addClass("fa-caret-right");
      } else {
        // Open this row
        row.child(buildExpandTableRow(row.data()), "expand").show();
        $(row.child()).addClass("smallTable"); // row.child(className="expand")
        tr.addClass("shown");
        tdi.first().removeClass("fa-caret-right");
        tdi.first().addClass("fa-caret-down");
      }
    });

    table.on("user-select", function (e, dt, type, cell, originalEvent) {
      if ($(cell.node()).hasClass("dt-control")) {
      }
    });

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
        console.log(this);
        FileMaker.PerformScript(script, JSON.stringify(json));
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
          id: e.target.id,
          classList: e.target.classList,
        },
      };

      FileMaker.PerformScript(script, JSON.stringify(json));
      console.log({
        a: e,
      });
    });
  }
  $.fn.dataTable.ext.errMode = "none";
};
