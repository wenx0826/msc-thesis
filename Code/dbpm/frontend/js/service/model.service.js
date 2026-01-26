const modelService = {
  async generateModel(userInput, rpstXml) {
    const model = activeModelStore.getModel() || {};
    // activeModelStore.setStatus("generating");
    const llm = workspaceStore.getLlmModel();
    try {
      const generatedModel = await API.model.generateModel({
        userInput,
        rpstXml,
        llm,
      });
      return generatedModel;
    } catch (error) {
      console.error("Error generating model:", error);
      return;
    }
    // await API.model
    //   .generateModel({
    //     userInput,
    //     rpstXml,
    //     llm,
    //   })
    //   .then((data) => {
    //     activeModelStore.setModel({ ...model, data });
    //   })
    //   .catch((error) => {
    //     console.error("Error generating model:", error);
    //     // activeModelStore.setError(String(error));
    //     // activeModelStore.setStatus("error");
    //   });
  },
  generateModelByPrompt(userInput) {
    this.generateModel(userInput, activeDocumentStore.getSerializedData());
  },
  async generateModelBySelections() {
    const generatedModel = await this.generateModel(
      activeDocumentStore.getSelectedText(),
      window.Constants.EMPTY_MODEL,
    );
    if (workspaceStore.hasActiveModel()) {
      // console.log("Generated Model!!!:", generatedModel);
      const model = activeModelStore.getModel();
      model.data = generatedModel;
      activeModelStore.setModel(model);
    } else {
      this.createModel(generatedModel);
    }
  },

  injectWxMetadata(xmlString, { before }) {
    // const parser = new DOMParser();
    // const data = parser.parseFromString(xmlString, "application/xml");

    // const newData = document.implementation.createDocument(
    //   "",
    //   "description",
    //   null,
    // );
    // const root = newData.documentElement;

    // const beforeElement = newData.createElement("wx:beforeMetadata");
    // beforeElement.textContent = before;

    // root.appendChild(beforeElement);
    // const importedNode = newData.importNode(data.documentElement, true);
    // root.appendChild(importedNode);

    // return new XMLSerializer().serializeToString(newData);

    const parser = new DOMParser();
    const data = parser.parseFromString(xmlString, "application/xml");

    const parseError = data.getElementsByTagName("parsererror")[0];
    if (parseError) {
      throw new Error("Invalid XML: " + parseError.textContent);
    }

    const WX_NS = "https://example.com/wx";

    // 1) 外层普通标签 <description>
    const newDoc = document.implementation.createDocument(
      "",
      "description",
      null,
    );
    const root = newDoc.documentElement;

    // 2) 你自己的“命名空间容器”标签（不带前缀也行）
    const wxContainer = newDoc.createElement("wxmeta");
    wxContainer.setAttribute("xmlns:wx", WX_NS); // 只在这里声明 wx 前缀
    root.appendChild(wxContainer);

    // 3) 容器里面放带 wx: 前缀的元素（WRX / 元数据）
    const beforeEl = newDoc.createElementNS(WX_NS, "wx:beforeMetadata");
    beforeEl.textContent = before ?? "";
    wxContainer.appendChild(beforeEl);

    // 你还可以继续塞 WRX 节点：
    // const wrx = newDoc.createElementNS(WX_NS, "wx:WRX");
    // wxContainer.appendChild(wrx);

    // 4) 原 XML 原封不动 import 进来
    const importedOriginal = newDoc.importNode(data.documentElement, true);
    root.appendChild(importedOriginal);

    return new XMLSerializer().serializeToString(newDoc);
  },
  async createModel(generatedModel) {
    console.log("Creating Model!!!:", generatedModel);
    let model = {};
    const generatedModelNumber = projectStore.getModelNumber() + 1;
    projectService.updateGeneratedModelNumber(generatedModelNumber);
    const name = `Model_${generatedModelNumber}`;
    model.meta = { name };
    model.data = this.injectWxMetadata(generatedModel, {
      before: "Before metadata",
      after: "After metadata",
    });

    const documentId = Store.workspace.getActiveDocumentId();
    const trace = {
      documentId,
      selections: Store.activeDocument.getSerializedTemporarySelections(),
    };
    const { modelMeta, trace: createdTrace } =
      await API.model.createModelAndTrace({
        model,
        trace,
      });

    Store.models.addModel({
      meta: modelMeta,
      documentId,
    });
    Store.activeModel.setModelById(modelMeta.id);
    Store.workspace.setActiveModelId(modelMeta.id);
    Store.activeDocument.setTemporarySelections([]);
    Store.activeDocument.addTrace(createdTrace);
    Store.projectGraph.addModelNodeAndEdge(modelMeta, documentId);
    // selections = selections.map((range) => serializeRange(range));
    // const selections = JSON.parse(
    //   JSON.stringify(activeDocumentStore.getSerializedTemporarySelections()),
    // );

    // const selections = [
    //   ...activeDocumentStore.getSerializedTemporarySelections(),
    // ];
    // selections.forEach((selection) => {
    //   selection.id = crypto.randomUUID();
    // });

    // API.trace.createTrace(createdTrace).then(() => {

    // });
  },
  async updateActiveModelData() {
    const activeModelId = Store.workspace.getActiveModelId();
    const data = Store.activeModel.getSerializedData();
    API.model.updateModelDataById(activeModelId, data);
    // await modelsStore.updateModelDataById(activeModelId, data);
  },
};
