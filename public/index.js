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
  var data = obj.data;
  var config = obj.config;
  const globalConfig = config.globals || {};
  var script = config.script
var columns = obj.columns;

const template = columns
  .map((elm) => elm.data)
  .reduce((acc, curr) => ((acc[curr] = ""), acc), {});

console.log(template)


const dataUpdated = data.map((elm) => {
  return { ...template, ...elm };
});

console.log("data updated", dataUpdated)
const ell = (c) =>{
  return function(data,type,row){
    return data.length > c ? data.substr(0,c)+'...' : data;
  }
}


const addImgSrc = (c) =>{ 
    console.log(1)
    const img = "<img src='"+c+"' onerror='this.onerror=null' alt=''/>";
    console.log("IMG",img);
    return img
  }

const globals = {...defaultConfig,...globalConfig};

dataUpdated.forEach(function(d){

  d.thumbnail_url = addImgSrc(d.thumbnail_url);
  d.render= d.ellipsis ? ell(d.ellipsis) : undefined;
});
globals.columns = columns;
globals.data = dataUpdated;

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


