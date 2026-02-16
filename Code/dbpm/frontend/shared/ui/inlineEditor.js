const VIEW_SELECTOR = ".inline-editor__view";
const INPUT_CLASS = "inline-editor__input";
const INPUT_SELECTOR = "." + INPUT_CLASS;

export default function init({
  $scope = $(document),
  trigger = "manual", // "click" | "manual"
  autoGrow = false,
  saveOnBlur = false, // ✅ A方案：强制 false（或者外部传 false）
  onSave = (newValue, $view) => {},
  normalize = (v) => String(v ?? "").trim() || "Untitled",
} = {}) {
  let active = null; // { $view, $input, oldValue, id }

  function getId($view) {
    return $view.data("id") ?? $view.closest("[data-id]").data("id") ?? null;
  }

  function setText($view, value) {
    $view.text(value);
  }

  function getText($view) {
    return $view.text();
  }

  function resize($input) {
    if (!autoGrow) return;
    const el = $input[0];
    if (!el) return;
    el.style.width = "auto";
    el.style.width = el.scrollWidth + "px";
  }

  // ---------- outside commit ----------
  let outsideHandler = null;

  function bindOutsideCommit() {
    if (outsideHandler) return;

    outsideHandler = function (e) {
      if (!active) return;

      const $t = $(e.target);

      // 点在 input 内：不算 outside
      if ($t.closest(INPUT_SELECTOR).length) return;

      // ✅ outside：吃掉这一下点击（避免 row click / 跳转）
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      commit();
    };

    // capture = true：比 table 的 click 冒泡更早
    document.addEventListener("mousedown", outsideHandler, true);
  }

  function unbindOutsideCommit() {
    if (!outsideHandler) return;
    document.removeEventListener("mousedown", outsideHandler, true);
    outsideHandler = null;
  }

  function cleanup() {
    if (!active) return;
    unbindOutsideCommit(); // ✅ 先解绑
    active.$input.remove(); // ✅ 再移除 input
    active.$view.show(); // ✅ show view
    active = null;
  }

  function startEdit($view) {
    const oldValue = getText($view).trim();
    const id = getId($view);

    const $input = $(`<input type="text" class="${INPUT_CLASS}">`);
    $input.val(oldValue);
    $input.data("oldValue", oldValue);

    if (autoGrow) {
      const cs = window.getComputedStyle($view[0]);
      $input.css({
        font: cs.font,
        padding: cs.padding,
        borderRadius: cs.borderRadius,
      });
    }

    $view.hide();
    $view.after($input);

    active = { $view, $input, oldValue, id };

    resize($input);

    // ✅ 只挡 pointerdown，避免 row 的 mousedown 逻辑先跑（可选，但建议）
    $input.on("mousedown.inlineEditor", (e) => e.stopPropagation());

    // ✅ A方案核心：进入编辑立刻开启 outside 捕获
    bindOutsideCommit();

    $input.trigger("focus");
    $input[0].select();
  }

  async function commit() {
    if (!active) return;

    const { $view, $input, oldValue } = active;
    const newValue = normalize($input.val());

    setText($view, newValue);
    cleanup();

    try {
      const ret = onSave(newValue, $view);
      if (ret && typeof ret.then === "function") await ret;
    } catch (e) {
      setText($view, oldValue);
      console.error("InlineEditor save failed (rolled back):", e);
    }
  }

  function cancel() {
    if (!active) return;
    setText(active.$view, active.oldValue);
    cleanup();
  }

  if (trigger === "click") {
    $scope.on("click.inlineEditor", VIEW_SELECTOR, function (e) {
      // 如果你担心这一点会立刻触发 outside（一般不会，因为 outside 只认 input 外）
      // e.stopPropagation();
      startEdit($(this));
    });
  }

  $scope.on("input.inlineEditor", INPUT_SELECTOR, function () {
    if (!active || active.$input[0] !== this) return;
    resize(active.$input);
  });

  $scope.on("keydown.inlineEditor", INPUT_SELECTOR, function (e) {
    if (!active || active.$input[0] !== this) return;

    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  });

  // ✅ A方案：不绑定 focusout 保存
  // if (saveOnBlur) { ... }  // 删掉或永远不进

  return {
    isEditing() {
      return !!active;
    },
    commit,
    cancel,
    startEdit,
  };
}
