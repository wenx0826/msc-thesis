// inline-editor-jq.js（你也可以直接放页面里）
const VIEW_SELECTOR = ".inline-editor__view";
const INPUT_CLASS = "inline-editor__input";
const EDITING_CLASS = "is-editing";
export default function init({
  $scope = $(document),
  trigger,
  autoGrow = true,
  saveOnBlur = true,
  onSave = (id, value, $view) => {},
  normalize = (v) => String(v ?? "").trim() || "Untitled",
} = {}) {
  let active = null; // { $view, $input, oldVal, id }

  function getId($view) {
    // 优先 view 自己 data-id，其次找最近的 [data-id]
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

  function cleanup() {
    if (!active) return;
    active.$input.remove();
    active.$view.show();
    active = null;
  }

  function startEdit($view) {
    console.log(
      "Entering edit mode for:",
      $view,
      active,
      $view[0] === active?.$view[0],
    );
    // 如果正在编辑别的：先提交（你也可以改成 cancel）
    // if (active && active.$view[0] !== $view[0]) {
    //   commit();
    // }
    // if (active) return;

    const oldVal = getText($view).trim();
    // const id = getId($view);
    // console.log("Starting edit:", { id, oldVal });
    const $input = $(`<input type="text" class="${INPUT_CLASS}">`);
    $input.val(oldVal);
    $input.data("oldVal", oldVal);

    // 让 input 继承 view 的字体/内边距，让视觉一致
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

    active = { $view, $input, oldVal, id };

    resize($input);
    $input.trigger("focus");
    $input[0].select();
  }

  async function commit() {
    if (!active) return;

    const { $view, $input, oldVal, id } = active;
    const next = normalize($input.val());

    // 乐观更新 UI
    setText($view, next);

    // 先清理，避免 blur/keydown 重入
    cleanup();

    try {
      const ret = onSave(id, next, $view);
      if (ret && typeof ret.then === "function") await ret;
    } catch (e) {
      // 保存失败回滚
      setText($view, oldVal);
      console.error("InlineEditor save failed (rolled back):", e);
    }
  }

  function cancel() {
    if (!active) return;
    setText(active.$view, active.oldVal);
    cleanup();
  }
  if (trigger === "click") {
    $scope.on("click.inlineEditor", VIEW_SELECTOR, function () {
      startEdit($(this));
    });
  }

  // input 输入自动拉长
  $scope.on("input.inlineEditor", "." + INPUT_CLASS, function () {
    if (!active || active.$input[0] !== this) return;
    resize(active.$input);
  });

  // 键盘：Enter 保存 / Esc 取消
  $scope.on("keydown.inlineEditor", "." + INPUT_CLASS, function (e) {
    if (!active || active.$input[0] !== this) return;

    if (e.key === "startEdit") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  });

  // blur 保存
  if (saveOnBlur) {
    $scope.on("focusout.inlineEditor", "." + INPUT_CLASS, function () {
      if (!active || active.$input[0] !== this) return;
      commit();
    });
  }

  // -------- 对外 API --------
  return {
    isEditing() {
      return !!active;
    },
    commit,
    cancel,
    setById(id, value) {
      // 兼容 data-id 在 view 或父级的两种写法
      const safe = CSS.escape(String(id));
      let $view = $scope.find(`${VIEW_SELECTOR}[data-id="${safe}"]`);
      if ($view.length === 0) {
        $view = $scope.find(`[data-id="${safe}"] ${VIEW_SELECTOR}`);
      }
      if ($view.length) setText($view.eq(0), String(value ?? ""));
    },
    getById(id) {
      const safe = CSS.escape(String(id));
      let $view = $scope.find(`${VIEW_SELECTOR}[data-id="${safe}"]`);
      if ($view.length === 0) {
        $view = $scope.find(`[data-id="${safe}"] ${VIEW_SELECTOR}`);
      }
      return $view.length ? getText($view.eq(0)).trim() : null;
    },
    // destroy() {
    //   cancel();
    //   $scope.off(".inlineEditor");
    // },
  };
}
