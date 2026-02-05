console.log("=== base_override.js loaded ===");

const Original = WFAdaptorManifestationBase;

function Patched(...args) {
  console.log("=== Creating Patched instance ===");

  // Create instance using original constructor
  const inst = Reflect.construct(Original, args);

  // Save original methods
  const originalUpdateDetails = inst.update_details;

  // Override update_details
  inst.update_details = function (svgid) {
    // Call original first
    originalUpdateDetails.call(this, svgid);

    // Add custom event dispatch logic
    var node = inst.adaptor.description.get_node_by_svg_id(svgid).get(0);

    if (node) {
      const nodeType = $(node).prop("tagName");

      if (nodeType && nodeType.includes("call")) {
        var nn = $X($(node).serializeXML());
        nn.removeAttr("svg-id");
        nn.removeAttr("svg-type");
        nn.removeAttr("svg-subtype");
        nn.removeAttr("svg-label");

        document.dispatchEvent(
          new CustomEvent("wf:call-clicked", {
            detail: { nn },
          }),
        );
      }
    }
  };

  // Create custom event handlers for element.call
  const originalDblclick = inst.events.dblclick.bind(inst);
  const originalMouseover = inst.events.mouseover.bind(inst);

  // Custom dblclick handler for call elements
  const callDblclickHandler = function (svgid, e) {
    console.log(`[CALL] Double click on: ${svgid}`);
    // Add your custom double-click logic here
    // For now, just call the original handler
    return originalDblclick.call(this, svgid, e);
  };

  // Custom mouseover handler for call elements
  const callMouseoverHandler = function (svgid, e) {
    console.log(`[CALL] Mouseover on: ${svgid}`);
    return originalMouseover.call(this, svgid, e);
  };

  // Patch ONLY element.call adaptor
  if (inst.elements.call && inst.elements.call.adaptor) {
    console.log("=== Patching element.call adaptor ===");

    // Add dblclick support (it doesn't exist in base.js)
    inst.elements.call.adaptor.dblclick = callDblclickHandler;

    // Override mouseover
    inst.elements.call.adaptor.mouseover = callMouseoverHandler;

    console.log(
      "=== element.call now supports dblclick and custom mouseover ===",
    );
  }

  console.log("=== Instance patched ===");
  return inst;
}

// Replace global reference
WFAdaptorManifestationBase = Patched;
console.log("=== WFAdaptorManifestationBase has been patched ===");
