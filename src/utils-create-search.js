export const createDivs = (columns, table) => {
  const container = document.createElement("div");
  container.classList.add("container");
  const row = document.createElement("div");
  row.classList.add("row");
  columns.forEach((column, i) => {
    const columnType = column.columnType;
    if (!column.searchable) {
      return;
    }
    const col = document.createElement("div");
    col.classList.add("col-3");

    const inputGroup = document.createElement("div");
    inputGroup.classList.add("input-group");
    inputGroup.classList.add("input-group-sm");
    inputGroup.classList.add("mb-2");

    const inputPrepend = document.createElement("div");
    inputPrepend.classList.add("input-group-prepend");

    const inputSpan = document.createElement("span");
    inputSpan.classList.add("input-group-text");
    inputSpan.id = "searchLabel";
    inputSpan.innerHTML = column.title;

    const inputField = document.createElement("select");
    inputField.classList.add("custom-select");
    inputField.classList.add("pl-3");
    inputField.id = `${column.data}Search`;
    inputField.addEventListener("change", function () {
      console.log(i, this.value);
      table.columns(i).search(this.value).draw();
    });
    const option = document.createElement("option");
    option.value = "";
    option.innerHTML = "Choose . . .";
    inputField.appendChild(option);
    const uniqueData = table
      .column(i)
      .data()
      .unique()
      .filter((e) => e !== "");
    console.log(uniqueData.length);
    for (j = 0; j < uniqueData.length; j++) {
      console.log(uniqueData[j]);
      const dataPoint =
        columnType === "dateTime"
          ? moment(uniqueData[j]).format("MM/D/YYYY")
          : uniqueData[j];
      const option = document.createElement("option");
      option.value = dataPoint;
      option.innerHTML = dataPoint;
      inputField.appendChild(option);
    }
    inputPrepend.appendChild(inputSpan);
    inputGroup.appendChild(inputPrepend);
    inputGroup.appendChild(inputField);
    col.appendChild(inputGroup);
    row.appendChild(col);
  });
  const searchSection = document.getElementById("searchSection");
  searchSection.appendChild(row);
};
