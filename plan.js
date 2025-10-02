document.addEventListener("DOMContentLoaded", () => {
    const addBtn = document.getElementById("addPlanBtn");
    const planList = document.getElementById("planList");
  
    addBtn.addEventListener("click", () => {
      const title = document.getElementById("planTitle").value.trim();
      const date = document.getElementById("planDate").value;
      if (!title) return alert("กรอกชื่อแผนงานก่อน!");
  
      const li = document.createElement("li");
      li.className = "plan-item";
      li.innerHTML = `
        <div class="plan-info">
          <span class="plan-title">${title}</span>
          <span class="plan-date">กำหนดส่ง: ${date || "ไม่ระบุ"}</span>
        </div>
        <div class="plan-actions">
          <button class="btn tiny">✏️</button>
          <button class="btn tiny success">✅</button>
          <button class="btn tiny danger">🗑️</button>
        </div>
      `;
      planList.appendChild(li);
  
      document.getElementById("planTitle").value = "";
      document.getElementById("planDate").value = "";
    });
  });
  