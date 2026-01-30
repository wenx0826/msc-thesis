const renderModelSelect = (modelValue) => {
  const activeModelId = activeModelStore.getModelId();

  const $modelSelect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`,
  );
  $modelSelect.parent().show();
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
  const tagName = nn.prop("tagName");
  const endpoint = nn.attr("endpoint");

  const typeValue = nn.children("parameters").children("dbpm_type").text();
  const modelValue = nn
    .children("parameters")
    .children("dbpm_subprocess_model")
    .text();

  const tab = $("#dat_details");
  const firstElement = tab.children().first().children().first();

  console.log("First element of the first element of the tab:", firstElement);

  firstElement.css("visibility", "hidden");

  const $typeSeclect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_type"]`,
  );
  $typeSeclect.val(typeValue ? typeValue : "task");

  $typeSeclect.on("change", function (e) {
    const typeValue = $(this).val();
    // console.log("Type changed to:", typeValue);
    if (typeValue == "subprocess") {
      renderModelSelect(modelValue);
    } else {
      $modelSelect.val("");
      $modelSelect.parent().hide();
    }
  });
  const $modelSelect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > dbpm_subprocess_model"]`,
  );

  if (typeValue == "subprocess") {
    renderModelSelect(modelValue);
  } else {
    $modelSelect.parent().hide();
    // $modelSelect.prop("disabled", true);
  }
  // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
  // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
});
