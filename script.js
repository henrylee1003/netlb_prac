const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");

// 建立一個任務 DOM
function createTaskItem(text) {
  const li = document.createElement("li");
  li.className = "item";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const label = document.createElement("label");
  label.textContent = text;

  const delBtn = document.createElement("button");
  delBtn.className = "delete";
  delBtn.textContent = "delete";

  // 完成/取消完成
  checkbox.addEventListener("change", () => {
    li.classList.toggle("done", checkbox.checked);
  });

  // 刪除
  delBtn.addEventListener("click", () => {
    li.remove();
  });

  li.appendChild(checkbox);
  li.appendChild(label);
  li.appendChild(delBtn);

  return li;
}

// 新增任務
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  taskList.appendChild(createTaskItem(text));
  taskInput.value = "";
  taskInput.focus();
}

addBtn.addEventListener("click", addTask);

// 按 Enter 也可以新增
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});