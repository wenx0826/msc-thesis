const renderModelSelect = (modelValue) => {
  const activeModelId = activeModelStore.getModelId();
  const $modelSelect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`,
  );
  $modelSelect.parent().parent().show();
  $modelSelect.empty();
  $("<option>").val("").text("--- Please select ---").appendTo($modelSelect);
  const documentList = documentsStore.getDocuments();
  console.log("Document List:", documentList);
  for (const { id: docId, name: docName } of documentList) {
    $optGroup = $("<optgroup>").attr("label", docName).appendTo($modelSelect);
    const models = modelsStore
      .getModels()
      .filter((m) => m.documentId === docId);
    for (const { meta } of models) {
      const { id: modelId, name: modelName } = meta;
      const $option = $("<option>")
        .val(modelId)
        .text(modelName)
        .appendTo($optGroup);
      if (modelId == modelValue) $option.prop("selected", true);
      if (modelId == activeModelId) $option.prop("disabled", true);
    }
  }
};

$(document).on("wf:call-clicked", function (e) {
  console.log(`Event Listener 'wf:call-clicked' listened`);
  const nn = e.detail.nn;
  const svgid = save["details_target"].svgid;

  const model = save["details_target"].model;
  // console.log(`Event Listener 'wf:call-clicked' listened`, nn, svgid);
  const tagName = nn.prop("tagName");
  const endpoint = nn.attr("endpoint");
  const $argumentsDiv = $(
    `#dat_details div[data-relaxngui-path=" > call > parameters > arguments[data-main]"]`,
  );
  $argumentsDiv.css({ visibility: "hidden", height: "0px" });
  // var orignode = save["graph_adaptor"].illustrator
  //   .get_node_by_svg_id(svgid)
  //   .parents("g.element[element-id]");

  // console.log("??? Details Save: svgid=", svgid);
  // var desc = save["details_target"].model;
  // console.log("Details Save: desc=", desc);
  // var node = desc.get_node_by_svg_id(svgid);
  // console.log("Details Save: node=", node);

  // console.log("Original node in SVG:!!", $(orignode).serializePrettyXML());

  const typeValue = nn.children("parameters").children("dbpm_type").text();
  const modelValue = nn
    .children("parameters")
    .children("dbpm_subprocess_model")
    .text();

  const $idInput = $(`#dat_details input[data-relaxngui-path=" > call[id]"`);
  if ($idInput.length > 0) {
    $idInput.parent().css({ visibility: "hidden", height: "0px" });
  }

  const $endpointInput = $(
    `#dat_details input[data-relaxngui-path=" > call[endpoint]"]`,
  );
  if ($endpointInput.length > 0) {
    $endpointInput.parent().css({ visibility: "hidden", height: "0px" });
  }

  const isSubprocess = endpoint === "subprocess" ? true : false;

  const $typeSeclect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_type"]`,
  );

  $typeSeclect.val(isSubprocess ? "subprocess" : "task");

  $typeSeclect.on("change", function (e) {
    const typeValue = $(this).val();

    // Find the hidden endpoint field in the form - try different path

    if (typeValue == "subprocess") {
      if ($endpointInput.length > 0) {
        $endpointInput.val("subprocess");
      }
      renderModelSelect(modelValue);
    } else {
      if ($endpointInput.length > 0) {
        $endpointInput.val("");
      }
      $modelSelect.val("");
      $modelSelect.parent().parent().hide();
    }

    // // Manually trigger save
    // if (typeof do_main_save === "function") {
    //   do_main_save();
    // }
  });

  const $modelSelect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`,
  );

  if (isSubprocess) {
    renderModelSelect(modelValue);
  } else {
    $modelSelect.parent().parent().hide();
    // $modelSelect.prop("disabled", true);
  }
  // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
  // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
});
