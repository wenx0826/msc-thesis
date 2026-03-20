const OriginalWFAdaptorManifestationBase = WFAdaptorManifestationBase;
const events = {};

function getNode(svgid) {
  var node = this.adaptor.description.get_node_by_svg_id(svgid).get(0);
  if (node) {
    return node;
  }
  return null;
}

function checkCall(node) {
  if (node) {
    const nodeType = node.tagName;
    return nodeType && nodeType.includes("call");
  }
  return false;
}

function checkSubprocess(call) {
  if (call) {
    const endpoint = call.getAttribute("endpoint");
    return endpoint === "subprocess";
  }
  return false;
}

function dispatchEvent(event, detail) {
  document.dispatchEvent(
    new CustomEvent(event, {
      detail,
    }),
  );
}

function CustomizedWFAdaptorManifestationBase(...args) {
  const inst = Reflect.construct(OriginalWFAdaptorManifestationBase, args);

  const originalUpdateDetails = inst.update_details;
  inst.update_details = function (svgid) {
    originalUpdateDetails.call(inst, svgid);
    var node = getNode.call(inst, svgid);
    const isCall = checkCall(node);
    if (isCall) {
      dispatchEvent("wf:call-clicked", { node });
    }
  };

  // const originalDblclick = inst.events.dblclick;
  const originalMouseover = inst.events.mouseover;
  const originalMouseout = inst.events.mouseout;

  if (inst.elements.call && inst.elements.call.adaptor) {
    inst.elements.call.adaptor.mouseover = (svgid, e) => {
      originalMouseover.call(inst, svgid, e);
      const node = getNode.call(inst, svgid);
      const isSubprocess = checkSubprocess(node);
      if (isSubprocess) {
        dispatchEvent("wf:subprocess-hovered", { node });
      }
    };

    inst.elements.call.adaptor.mouseout = (svgid, e) => {
      originalMouseout.call(inst, svgid, e); // Call original mouseover logic
      const node = getNode.call(inst, svgid);
      const isSubprocess = checkSubprocess(node);
      if (isSubprocess) {
        dispatchEvent("wf:subprocess-unhovered", { node });
      }
    };

    inst.elements.call.adaptor.dblclick = (svgid, e) => {
      const node = getNode.call(inst, svgid);
      const isSubprocess = checkSubprocess(node);
      if (isSubprocess) {
        dispatchEvent("wf:subprocess-dblclicked", { node });
      }
    };
  }
  return inst;
}

WFAdaptorManifestationBase = CustomizedWFAdaptorManifestationBase;
