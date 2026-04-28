var details_updated = new Event("details:updated", {
  bubbles: true,
  cancelable: false,
});

$(document).ready(function () {
  var timer;

  $(document).on(
    "input",
    "#dat_details input, #dat_details textarea, #dat_details [contenteditable]",
    function (e) {
      clearTimeout(timer);
      timer = setTimeout(do_main_save, 5000);
    },
  );
  // only for contenteditable divs
  $(document).on("keypress", "#dat_details div[contenteditable]", function (e) {
    if (e.keyCode == 13) {
      document.execCommand("insertLineBreak");
      e.preventDefault();
    }
  });
  $(document).on("relaxngui_remove", "#dat_details", function (e) {
    clearTimeout(timer);
    do_main_save();
  });
  $(document).on("relaxngui_move", "#dat_details", function (e) {
    clearTimeout(timer);
    do_main_save();
  });
  $(document).on("relaxngui_change", "#dat_details", function (e) {
    clearTimeout(timer);
    do_main_save();
  });
});

function do_main_save() {
  //{{{
  if (save["details"].has_changed()) {
    console.log("detail.js - do_main_save - Details have changed, saving...");
    do_main_work(save["details_target"].svgid);
  }
} //}}}

function do_main_work(svgid) {
  //{{{
  var desc = save["details_target"].model;
  var node = desc.get_node_by_svg_id(svgid);
  var orignode = save["graph_adaptor"].illustrator
    .get_node_by_svg_id(svgid)
    .parents("g.element[element-id]");
  var origtype =
    orignode.attr("element-type") + "_" + orignode.attr("element-endpoint");

  var url = $("body").attr("current-instance");

  var nnew;
  if (svgid != save["details_target"].svgid) {
    let tn = desc.get_node_by_svg_id(svgid).get(0);
    let rng = desc.elements[$(tn).attr("svg-subtype")].clone();
    if (
      save["endpoints_cache"][$(tn).attr("endpoint")] &&
      save["endpoints_cache"][$(tn).attr("endpoint")].schema
    ) {
      let schema =
        save["endpoints_cache"][$(tn).attr("endpoint")].schema.documentElement;
      $(rng)
        .find(' > element[name="parameters"] > element[name="arguments"]')
        .replaceWith($(schema).clone());
    }
    if (
      save["endpoints_list"][$(tn).attr("endpoint")] &&
      (!save["endpoints_list"][$(tn).attr("endpoint")].startsWith("http") ||
        save["endpoints_list"][$(tn).attr("endpoint")].match(/^https?-/))
    ) {
      $(rng)
        .find(' > element[name="parameters"] > element[name="method"]')
        .remove();
    }
    let rngw = new RelaxNGui(rng, $("#relaxngworker"), desc.context_eval);
    nnew = $(rngw.save().documentElement);
  } else {
    save["details"].set_checkpoint();
    nnew = $(save["details"].save().documentElement);
  }
  nnew.attr("svg-id", svgid);

  const endpoint = nnew.attr("endpoint");
  const nnewArguments = nnew.children("parameters").children("arguments");
  const nnewArgBehavior = nnewArguments.children("behavior");
  const nnewArgUrl = nnewArguments.children("url");
  const nnDbpmSubprocessModel = nnew
    .children("parameters")
    .children("dbpm_subprocess_model");
  if (endpoint === "subprocess") {
    var subprocessModelId = nnew
      .children("parameters")
      .children("dbpm_subprocess_model")
      .text();
    if (subprocessModelId) {
      nnewArgBehavior.text("wait_for_running");
      nnewArgUrl.text(
        window.location.origin +
          "/persistence/models/" +
          subprocessModelId +
          ".xml",
      );
    } else {
      nnewArguments.remove();
    }
  } else {
    nnDbpmSubprocessModel.remove();
    nnewArguments.remove();
  }

  if ($("*[svg-id]", node).length > 0) {
    nnew.append(
      node.children().filter(function () {
        return this.attributes["svg-id"] != undefined;
      }),
    );
  }

  if (node[0].namespaceURI == nnew.attr("xmlns")) {
    // remove xmlns when it is the same as in the parent node
    nnew[0].removeAttribute("xmlns");
  }

  // copy all elements from different namespaces
  [...node[0].attributes].forEach((attr) => {
    if (
      attr &&
      attr.namespaceURI &&
      attr.namespaceURI != "http://cpee.org/ns/description/1.0"
    ) {
      nnew[0].setAttributeNS(attr.namespaceURI, attr.nodeName, attr.nodeValue);
    }
  });

  node.replaceWith(nnew);

  var ttarget = manifestation.adaptor.illustrator.get_node_by_svg_id(svgid);
  var tnewnode = ttarget.parents("g.element[element-id]");
  var tnewtype =
    tnewnode.attr("element-type") + "_" + tnewnode.attr("element-endpoint");

  desc.refresh(function (graphrealization) {
    var vtarget = manifestation.adaptor.illustrator.get_node_by_svg_id(svgid);
    if (vtarget.length > 0) {
      vtarget.parents("g.element[element-id]").addClass("selected");
    }
    manifestation.adaptor.illustrator
      .get_label_by_svg_id(svgid)
      .addClass("selected");
    $("#graphgrid [element-id=" + svgid + "]").addClass("selected");

    var newnode = vtarget.parents("g.element[element-id]");
    var newtype =
      newnode.attr("element-type") + "_" + newnode.attr("element-endpoint");
    var g = graphrealization.get_description();
    console.log("????? g=", g);

    // WORKAROUND: get_description() fails due to nodeType issue in wfadaptor
    // Use direct serialization instead
    // if (!g) {
    //   console.warn(
    //     "get_description() returned null, using direct serialization workaround",
    //   );
    //   try {
    //     var descRoot = desc.get_node_by_svg_id("description");
    //     if (descRoot && descRoot.length > 0) {
    //       // Clone and remove svg attributes
    //       var serxml = descRoot.clone(true);
    //       serxml.removeAttr("svg-id");
    //       serxml.removeAttr("svg-type");
    //       serxml.removeAttr("svg-subtype");
    //       serxml.removeAttr("svg-label");
    //       $("*[svg-id]", serxml).each(function () {
    //         $(this).removeAttr("svg-id");
    //         $(this).removeAttr("svg-type");
    //         $(this).removeAttr("svg-subtype");
    //         $(this).removeAttr("svg-label");
    //       });
    //       g = serxml.serializeXML();
    //       console.log(
    //         "Direct serialization workaround SUCCEEDED, g=",
    //         g ? g.substring(0, 200) + "..." : "NULL",
    //       );
    //     }
    //   } catch (e) {
    //     console.error("Direct serialization workaround FAILED:", e);
    //   }
    // }

    if (g) {
      save["graph"] = $X(g);
      save["graph"].removeAttr("svg-id");
      save["graph"].removeAttr("svg-type");
      save["graph"].removeAttr("svg-subtype");
      save["graph"].removeAttr("svg-label");

      console.log(
        "save['graph'] after cleaning:",
        save["graph"].serializePrettyXML
          ? save["graph"].serializePrettyXML().substring(0, 500)
          : new XMLSerializer()
              .serializeToString(save["graph"][0])
              .substring(0, 500),
      );
    } else {
      console.error(
        "get_description() returned null - description may be invalid",
      );
    }

    console.log("herer???", newtype, origtype);
    if (newtype != origtype) {
      // console.log("herer???", newtype, origtype);
      manifestation.update_details(svgid);
      do_main_work(svgid);
    } else {
      // $.ajax({
      //   type: "PUT",
      //   url: url + "/properties/description/",
      //   contentType: "text/xml",
      //   headers: {
      //     "Content-ID": "description",
      //     "CPEE-Event-Source": myid,
      //   },
      //   data: desc.get_description(),
      // });
      // format_instance_pos();

      // document.dispatchEvent(graph_changed);

      ////////////////////////////
      // holy shit, f***in papercut. When blur/focusout from within relaxngui,
      // click on original target after graph was updated. tsvgid has to be
      // saved in mousedown because blur/focusout is between mousedown and click.
      ////////////////////////////
      if (save["details_target"].svgid != save["details_target"].tsvgid) {
        console.log(">>>???????????? here triggered?");
        manifestation.adaptor.illustrator
          .get_label_by_svg_id(save["details_target"].tsvgid)
          .trigger("click");
      }

      console.log(
        "333333333_ Details Save: node=",
        node,
        "endpoint=",
        node.attr("endpoint"),
        node.children("parameters").children("dbpm_type").text(),
      );

      // Update the active model store with the cleaned graph
      if (save["graph"]) {
        console.log("Updating activeModel store with cleaned graph");
        Store.activeModel.state.model.data = save["graph"][0];
        console.log("Store updated. Verifying...");
        const storeData = Store.activeModel.getSerializedData();
        console.log(
          "Store serialized data (first 500 chars):",
          storeData.substring(0, 500),
        );
      }

      // manifestation.adaptor.illustrator
      //   .get_label_by_svg_id(save["details_target"].tsvgid)
      //   .trigger("click");
      saveActiveModel(
        window.Constants.MODEL_VERSION_CHANGE_TYPE.MANUAL_PROPERTIES_UPDATE,
      );
    }
  });
} //}}}
