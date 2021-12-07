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
let template;
// exposing loadData to FileMaker Script
window.loadData = function (json) {
  var obj = JSON.parse(json); // data from FM is a string
  console.log(obj);
  var data = obj.data;
  var config = obj.config;
  // const clickType = config.clickType || "cell"
  const globalConfig = config.globals || {};
  var script = config.script
var columns = obj.columns;

columns.forEach(elm => {
elm.columnType ==="img"? 
  elm.render = function (data, type, row, meta) {
    return `<img src="${data}" oneerror='this.oneerror=null' alt='' class="img-responsive" />`
}:null
  return elm;
})
 template = columns
  .map((elm) => elm.data)
  .reduce((acc, curr) => ((acc[curr] = ""), acc), {});



const dataUpdated = data.map((elm) => {
  return { ...template, ...elm };
});

const ell = (c) =>{
  return function(data,type,row){
    return data.length > c ? data.substr(0,c)+'...' : data;
  }
}


// const addImgSrc = (c) =>{ 
//     const img = "<img src='"+c+"' onerror='this.onerror=null' alt=''/>";
//     return img
//   }

const globals = {...defaultConfig,...globalConfig};

dataUpdated.forEach(function(d){
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

  
  $("#example tbody").on("click", "td", function () {
  var cell = table.cell(this);
  const cellObj = cell[0][0];
const value = cell.data()
const col = table.column(this).index();
const row = table.row(this).index();
console.log("ROW",dataUpdated[row]);
const json = {value, column:columns[col],row:dataUpdated[row]}
console.log(json);
FileMaker.PerformScript(script, JSON.stringify(json));

 });
}
 $.fn.dataTable.ext.errMode = "none";
}