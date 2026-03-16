let outsideHandler = null;

function bindOutsideCommit() {
  if (outsideHandler) return;

  outsideHandler = function (e) {
    if (!active) return;

    // 点在 input 上/或 view 上（可选）就不算 outside
    const $t = $(e.target);
    if ($t.closest("." + INPUT_CLASS).length) return;

    // ✅ 正在编辑且点在外面：吃掉这次点击，避免触发 row click / 跳转
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    commit();
  };

  // capture = true：比你 table 的冒泡 click 更早触发
  document.addEventListener("pointerdown", outsideHandler, true);
}

function unbindOutsideCommit() {
  if (!outsideHandler) return;
  document.removeEventListener("pointerdown", outsideHandler, true);
  outsideHandler = null;
}