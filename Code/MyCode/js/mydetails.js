const fileName = "mydetails.js";
const renderModelSelect = (modelId) => {
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

  $.each(traces, function (index, trace) {
    var documentId = trace.document_id;
    console.log("documentId:", documentId);
    const docName = getDocumentNameById(documentId);
    const $documentGroup = $("optgroup").attr("label", docName);
    $modelSelect.append(
      $("<option>")
        .val(documentId)
        .text("Model " + documentId)
    );
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
