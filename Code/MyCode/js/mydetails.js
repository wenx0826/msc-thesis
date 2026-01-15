const fileName = "mydetails.js";
// let $modelSelect, $typeSeclect;

const renderModelSelect = (modelValue) => {
  const activeModelId = Store.getActiveModelId();

  const $modelSelect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > model"]`
  );
  $("<option>").val("").text("--- Please select --- ").appendTo($modelSelect);

  const traces = Store.getTraces();
  const documentList = Store.getDocumentList();
  $.each(documentList, function (index, document) {
    const $optGroup = $("<optgroup>")
      .attr("label", document.name)
      .appendTo($modelSelect);

    const docModels = Store.getDoucmentModels(document.id);
    $.each(docModels, function (idx, model) {
      const modelTrace = traces.find(
        (trace) =>
          trace.model_id == model.id && trace.document_id == document.id
      );
      if (modelTrace) {
        var $option = $("<option>")
          .val(model.id)
          .text(model.name)
          .appendTo($optGroup);

        if (model.id == activeModelId) {
          $option.prop("disabled", true);
        }
        if (model.id == modelValue) {
          $option.prop("selected", true);
        }
      }
    });
  });
};

// Example for CustomEvent with payload
$(document).on("wf:call-clicked", function (e) {
  console.log(`${fileName}: Event Listener 'wf:call-clicked' listened`);
  const nn = e.detail.nn;
  const tagName = nn.prop("tagName");
  const endpoint = nn.attr("endpoint");
  console.log(
    "!!! Savewf:details-updated detail tagName:",
    tagName,
    "endpoint:",
    endpoint
  );
  console.log("nn:", nn);
  //   const typeValue = nn.children("parameters").children("type").val();
  //   console.log(
  //     "Type value from call's children parameters's children type:",
  //     typeValue
  //   );

  const typeValue = nn.children("parameters").children("type").text();
  const modelValue = nn.children("parameters").children("model").text();
  console.log(
    "Type value from call's children parameters's children type:",
    typeValue
  );
  console.log(
    "Model value from call's children parameters's children model:",
    modelValue
  );

  console.log("Value of <type> tag:", typeValue);
  //   console.log(
  //     `${fileName}: Call clicked - tagName: ${tagName}, endpoint: ${endpoint}, type: ${type}`
  //   );

  // const id = nn.attr('id')
  // const state = nn.attr('state')
  // save['activity_red_states'][id] = state
  console.log(
    "!!! Savewf:details-updated detail call:q save:",
    document.getElementById("dat_details")
  );
  const $typeSeclect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > type"]`
  );
  $typeSeclect.append(
    $("<option>")
      .val("task")
      .text("Task")
      .prop("selected", typeValue == "task")
  );
  $typeSeclect.append(
    $("<option>")
      .val("subprocess")
      .text("Subprocess")
      .prop("selected", typeValue == "subprocess")
  );

  const $modelSelect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > model"]`
  );
  renderModelSelect(modelValue);
  // }

  // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
  // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
});
