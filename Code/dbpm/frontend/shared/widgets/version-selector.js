// frontend/shared/widgets/version-selector.js
export default function initVersionSelector({
  $select, // ✅ required
  versions = [],
  selectedId = null, // only selection control
  getId = (v) => v?.id,
  labelOf = ({ index }) => `v${index + 1}`,
  titleOf = ({ v }) => v?.name ?? "",
  stopRowClick = true,
  onSelect = ({ version }) => {},
} = {}) {
  if (!$select || !$select.length) {
    throw new Error("[version-selector] $select is required");
  }

  let state = { versions, selectedId };

  function resolveSelectedIndex() {
    const vs = state.versions || [];
    if (!vs.length) return -1;

    // If selectedId provided → try match
    if (state.selectedId != null) {
      const id = String(state.selectedId);
      const idx = vs.findIndex((v) => String(getId(v)) === id);
      if (idx >= 0) return idx;
    }

    // Default → last option
    return vs.length - 1;
  }

  function buildOptionsHtml(selectedIndex) {
    const vs = state.versions || [];

    return vs
      .map((v, index) => {
        const id = String(getId(v));
        const label = labelOf({ v, index });
        const title = titleOf({ v, index });
        const selected = index === selectedIndex ? "selected" : "";
        return `<option value="${id}" title="${title}" ${selected}>${label}</option>`;
      })
      .join("");
  }

  function render() {
    const vs = state.versions || [];
    const selectedIndex = resolveSelectedIndex();

    $select.html(buildOptionsHtml(selectedIndex));

    if (selectedIndex === -1) {
      $select.val("");
      state.selectedId = null;
      return;
    }

    const id = String(getId(vs[selectedIndex]));
    $select.val(id);
    state.selectedId = id;
  }

  function emitSelect() {
    const versions = state.versions || [];
    const selectedId = $select.val();
    const version =
      versions.find((v) => String(getId(v)) === selectedId) || null;

    onSelect({ version });
  }

  function bind() {
    if (stopRowClick) {
      $select.on("mousedown.versionSelector", (e) => e.stopPropagation());
      $select.on("click.versionSelector", (e) => e.stopPropagation());
    }

    $select.on("change.versionSelector", emitSelect);
  }

  function destroy() {
    $select.off(".versionSelector");
  }

  function update(next = {}) {
    state = { ...state, ...next };
    render();
  }

  // init
  render();
  bind();

  return {
    update,
    destroy,
    render,
    setSelectedId(id) {
      state.selectedId = id;
      render();
    },
    getSelectedId() {
      return state.selectedId;
    },
  };
}
