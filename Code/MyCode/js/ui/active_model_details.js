const renderModelSelect = (modelValue) => {
  const activeModelId = activeModelStore.getModelId();

  const $modelSelect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > model"]`,
  );
  $("<option>").val("").text("--- Please select --- ").appendTo($modelSelect);

  const documentList = documentsStore.getDocumentList();
  //
  for (const { id: docId, name: docName } of documentList) {
    $optGroup = $("<optgroup>").attr("label", docName).appendTo($modelSelect);
    const docModels = tracesStore.getDocumentModels(docId);
    for (const { id: modelId, name: modelName } of docModels) {
      const $option = $("<option>")
        .val(modelId)
        .text(modelName)
        .appendTo($optGroup);
      if (modelId == modelValue) $option.prop("selected", true);
      if (modelId == activeModelId) $option.prop("disabled", true);
    }
  }
};

// Example for CustomEvent with payload
$(document).on("wf:call-clicked", function (e) {
  //   console.log(`Event Listener 'wf:call-clicked' listened`);
  //   const nn = e.detail.nn;
  //   const tagName = nn.prop("tagName");
  //   const endpoint = nn.attr("endpoint");
  //   // console.log(
  //   //   "Savewf:details-updated detail tagName:",
  //   //   tagName,
  //   //   "endpoint:",
  //   //   endpoint,
  //   // );
  //   // console.log("nn:", nn);
  //   //   const typeValue = nn.children("parameters").children("type").val();
  //   //   console.log(
  //   //     "Type value from call's children parameters's children type:",
  //   //     typeValue
  //   //   );
  //   const typeValue = nn.children("parameters").children("type").text();
  //   const modelValue = nn.children("parameters").children("model").text();
  //   // console.log(
  //   //   "Type value from call's children parameters's children type:",
  //   //   typeValue,
  //   // );
  //   // console.log(
  //   //   "Model value from call's children parameters's children model:",
  //   //   modelValue,
  //   // );
  //   const tab = $("#dat_details");
  //   const firstElement = tab.children().first().children().first();
  //   // console.log("First element of the first element of the tab:", firstElement);
  //   // firstElement.css("visibility", "hidden");
  //   // console.log("Value of <type> tag:", typeValue);
  //   //   console.log(
  //   //     `${fileName}: Call clicked - tagName: ${tagName}, endpoint: ${endpoint}, type: ${type}`
  //   //   );
  //   // const id = nn.attr('id')
  //   // const state = nn.attr('state')
  //   // save['activity_red_states'][id] = state
  //   // console.log(
  //   //   "!!! Savewf:details-updated detail call:q save:",
  //   //   document.getElementById("dat_details"),
  //   // );
  //   const $typeSeclect = $(
  //     `#dat_details select[data-relaxngui-path=" > call > parameters > type"]`,
  //   );
  //   $typeSeclect.append(
  //     $("<option>")
  //       .val("task")
  //       .text("Task")
  //       .prop("selected", typeValue == "task"),
  //   );
  //   $typeSeclect.append(
  //     $("<option>")
  //       .val("subprocess")
  //       .text("Subprocess")
  //       .prop("selected", typeValue == "subprocess"),
  //   );
  //   const $modelSelect = $(
  //     `#dat_details select[data-relaxngui-path=" > call > parameters > model"]`,
  //   );
  //   renderModelSelect(modelValue);
  //   // }
  //   // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
  //   // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
});
