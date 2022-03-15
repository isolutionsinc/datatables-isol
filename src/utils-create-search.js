export const createDivs = (columns, table) => {
  const container = document.createElement("div");
  container.classList.add("container");
  const row = document.createElement("div");
  row.classList.add("row");
  columns.forEach((column, i) => {
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

    const inputField = document.createElement("input");
    inputField.classList.add("form-control");
    inputField.classList.add("pl-3");
    inputField.id = `${column.data}Search`;
    inputField.type = "search";
    inputField.addEventListener("keyup", function () {
      console.log(this.value);
      table.columns(i).search(this.value).draw();
    });

    inputPrepend.appendChild(inputSpan);
    inputGroup.appendChild(inputPrepend);
    inputGroup.appendChild(inputField);
    col.appendChild(inputGroup);
    row.appendChild(col);
  });
  const searchSection = document.getElementById("searchSection");
  searchSection.appendChild(row);
};
