const activeModelService = {
  generateModel(userInput, rpstXml) {
    // const activeModel = this.getModel();
    // const model = rpstXml ? rpstXml : {};
    const model = rpstXml ? this.getModel() : {};
    activeModelStore.setStatus("generating");
    const llm = window.Store.project.getLlmModel();
    API.model
      .generateModel({
        userInput,
        rpstXml: rpstXml ? rpstXml : window.Constants.EMPTY_MODEL,
        llm,
      })
      .then((data) => {
        activeModelStore.setModel({ ...model, data });
      })
      .catch((error) => {
        console.error("Error generating model:", error);
        activeModelStore.setError(String(error));
        activeModelStore.setStatus("error");
      });
    /*const activeModel = this.getModel();
      const model = rpstXml ? rpstXml : {};
      console.log("Generating model with input:", userInput, rpstXml);
      this.setStatus("generating");
     
      API.Model.generateModel({ userInput, rpstXml, llm })
        .then((data) => data)
        .catch((error) => {
          console.error("Error generating model:", error);
          activeModelStore.setError(String(error));
          activeModelStore.setStatus("error");
        });
      */
    // return new Promise
  },
  regenerateModel(userInput) {
    console.log("Regenerating model...");
    console.log("Applying prompt to active model:", userInput);
    const activeModel = this.getModel();
    console.log("description of active model:", activeModel.data);
    const rpstXml = $(activeModel.data).children().serializePrettyXML();
    console.log("Regenerate RPST XML of active model:", rpstXml);

    // console.log("RPST XML of active model:", rpstXml);
    this.generateModel(userInput, rpstXml);
    // const activeModel = this.getActiveModel();
    // if (activeModel) {
    //   this.generateModel(activeModel.source_text, activeModel.rpst_xml);
    // }
  },
  generateModelByPrompt(userInput) {
    const activeModel = this.getModel();
    rpstXml = activeModel
      ? $(activeModel.data).children().serializePrettyXML()
      : window.Constants.EMPTY_MODEL;
    this.generateModel(userInput, rpstXml);
  },
  generateModelBySelections(userInput) {
    console.log(" Generating new model with selected text:??????");
    // const rpstXml = window.Constants.EMPTY_MODEL;
    this.generateModel(userInput);
  },
  async keepModel(selections) {
    const model = activeModelStore.getModel();
    const modelNumber = projectStore.getModelNumber() + 1;
    const name = `Model_${modelNumber}`;
    model.name = name;
    const modelId = await API.model.createModel(model);
    // API.model.createModel(model).then((modelId) => {
    //   model.id = modelId;
    //   //   projectStore.addModel(model);
    //   activeModelStore.setModel(model);
    // });
    selections = selections.map((range) => serializeRange(range));
    const trace = {
      documentId: activeDocumentStore.getId(),
      modelId,
      selections,
    };
    API.trace.createTrace(trace).then(() => {
      activeDocumentStore.addTrace(trace);
      // projectStore.setModelNumber(modelNumber);
      // projectStore.addModel(model);
      // activeModelStore.setModel(model);
    });
  },
};
