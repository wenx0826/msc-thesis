const loadModels = async () => {
  const traces = Store.getAllTraces();
  for (const trace of traces) {
    const model = await getModelById(db, trace.model_id);
    Store.addModel(model);
    await renderModelInList(model);
  }
};
