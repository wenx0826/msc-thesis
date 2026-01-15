const fileName = "mydetails.js";
const renderModelSelect = (modelId) => {
  const activeModelId = Store.getActiveModelId();
  //   const trace = getActiveModelTrace();
  //   if (trace) {
  //     trace.selections.forEach((serializedRange) => {
  //       const range = deserializeRange(serializedRange);
  //       renderSelection(range, modelId);
  //     });

  //   }
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
      }
    });
  });
  // }
};

// Example for CustomEvent with payload
$(document).on("wf:call-clicked", function (e) {
  console.log(`${fileName}: Event Listener 'wf:call-clicked' listened`);
  // console.log('wf:details-updated detail:', e.detail);
  // console.log('!!! Savewf:details-updated detail model:', save);
  const nn = e.detail.nn;
  const tagName = nn.prop("tagName");
  const endpoint = nn.attr("endpoint");
  console.log(
    "!!! Savewf:details-updated detail tagName:",
    tagName,
    "endpoint:",
    endpoint
  );

  console.log("!!! Savewf:details-updated detail call:q!!!!");
  // const id = nn.attr('id')
  // const state = nn.attr('state')
  // save['activity_red_states'][id] = state
  console.log(
    "!!! Savewf:details-updated detail call:q save:",
    document.getElementById("dat_details")
  );
  const $modelSelect = $(
    `#dat_details select[data-relaxngui-path=" > call > parameters > model"]`
  );
  renderModelSelect();
  // }

  // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
  // $('#dat_details select[data-relaxngui-path=" > call > parameters > type"]').val(endpoint);
});
