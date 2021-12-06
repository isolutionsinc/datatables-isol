//Here we're importing items we'll need. You can add other imports here.
import "./style.css";
var table;
const defaultConfig = {
  paging: true,
  lengthChange: true,
  searching: true,
  scrollY: $(window).height() - 150,
  height:"100%",
  colReorder: true,
 
};

// exposing loadData to FileMaker Script
window.loadData = function (json) {
  var obj = JSON.parse(json); // data from FM is a string
  console.log(obj);
  var data = obj.data;
  var config = obj.config;
  const globalConfig = config.globals || {};
  var script = config.script
  console.log(globalConfig);
var columns = obj.columns;


const ell = (c) =>{
  return function(data,type,row){
    return data.length > c ? data.substr(0,c)+'...' : data;
  }
}

console.log("default",defaultConfig);
const globals = {...defaultConfig,...globalConfig};
columns.forEach(function(column){
  column.render= column.ellipsis ? ell(column.ellipsis) : undefined;
});
globals.columns = columns;
globals.data = data;
  // create column headers from data
  // var firstRecord = data[0];
  // var columns = Object.keys(firstRecord.fieldData).map(function (key) {
  //   console.log("key", key);
  //   var field = firstRecord[key];
  //   var visible = true;
  //   if (key === "Id") visible = false;
  //   return {
  //     title: key,
  //     data: "fieldData." + key,
  //     visible: visible,
  //   };
  // });
console.log(globals);
  // Create the DataTable, after destroying it if already exists
  if (table) table.destroy();
  table = $("#example").DataTable(globals);

  // Add the click handler to the row, after removing it if already exists
 if (script) {
  $("#example tbody").off("click");
  $("#example tbody").on("click", "tr", function () {
    var record = table.row(this).data();
    var json = JSON.stringify(record);

    FileMaker.PerformScript(script, json);
  });
}
  // $('#example tbody').on('mousemove', 'tr', function(e) {
  //   var rowData = table.row(this).data()
  //   console.log(rowData);
  //   // return
  //   $("#tooltip").text("Hi").animate({ left: e.pageX, top: e.pageY }, 1)
  //   if (!$("#tooltip").is(':visible')) $("#tooltip").show()
  // })
  // $('#example tbody').on('mouseleave', function(e) {
  //   $("#tooltip").hide()
  // })  
  $.fn.dataTable.ext.errMode = "none";
};


