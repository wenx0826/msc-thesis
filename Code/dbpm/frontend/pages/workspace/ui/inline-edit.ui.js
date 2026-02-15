// inline-edit.js

export function createInlineEdit({
  selector = ".inline-edit",
  onSave = (root, value) => {},
  normalize = (v) => v.trim() || "Untitled",
  saveOnBlur = true,
} = {}) {
  function qs(root, s) {
    return root.querySelector(s);
  }

  function setValue(root, value) {
    const view = qs(root, ".inline-edit__view");
    const input = qs(root, ".inline-edit__input");

    view.textContent = value;
    input.value = value;
    root.dataset.value = value;
  }

  function getValue(root) {
    return qs(root, ".inline-edit__view").textContent.trim();
  }

  function resize(input) {
    input.style.width = "auto";
    input.style.width = input.scrollWidth + "px";
  }

  function enterEdit(root) {
    if (root.classList.contains("is-editing")) return;

    const view = qs(root, ".inline-edit__view");
    const input = qs(root, ".inline-edit__input");

    input.value = view.textContent.trim();
    input.dataset.prev = input.value;

    root.classList.add("is-editing");
    resize(input);
    input.focus();
    input.select();
  }

  async function commit(root) {
    if (!root.classList.contains("is-editing")) return;

    const input = qs(root, ".inline-edit__input");
    const prev = input.dataset.prev;
    const next = normalize(input.value);

    root.classList.remove("is-editing");
    setValue(root, next);

    try {
      const result = onSave(root, next);
      if (result instanceof Promise) {
        await result;
      }
    } catch (e) {
      setValue(root, prev);
      console.error("Save failed", e);
    }
  }

  function cancel(root) {
    const input = qs(root, ".inline-edit__input");
    setValue(root, input.dataset.prev);
    root.classList.remove("is-editing");
  }

  // 初始化已有元素
  document.querySelectorAll(selector).forEach((root) => {
    const value =
      root.dataset.value ||
      qs(root, ".inline-edit__view")?.textContent ||
      qs(root, ".inline-edit__input")?.value ||
      "";

    setValue(root, value.trim());
  });

  // 事件委托
  document.addEventListener("click", (e) => {
    const view = e.target.closest(".inline-edit__view");
    if (!view) return;
    const root = view.closest(selector);
    if (!root) return;
    enterEdit(root);
  });

  document.addEventListener("input", (e) => {
    const input = e.target.closest(".inline-edit__input");
    if (!input) return;
    resize(input);
  });

  document.addEventListener("keydown", (e) => {
    const input = e.target.closest(".inline-edit__input");
    if (!input) return;
    const root = input.closest(selector);

    if (e.key === "Enter") {
      e.preventDefault();
      commit(root);
    }

    if (e.key === "Escape") {
      e.preventDefault();
      cancel(root);
    }
  });

  if (saveOnBlur) {
    document.addEventListener("focusout", (e) => {
      const input = e.target.closest(".inline-edit__input");
      if (!input) return;
      const root = input.closest(selector);
      commit(root);
    });
  }

  // 👇 对外暴露 API
  return {
    setValue,
    getValue,
    setById(id, value) {
      const root = document.querySelector(`${selector}[data-id="${id}"]`);
      if (root) setValue(root, value);
    },
    getById(id) {
      const root = document.querySelector(`${selector}[data-id="${id}"]`);
      return root ? getValue(root) : null;
    },
  };
}
