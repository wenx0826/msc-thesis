const loadModels = async () => {
  const traces = Store.getTraces();
  for (const trace of traces) {
    const model = await getModelById(db, trace.model_id);
    Store.addModel(model);
    await renderModelInList(model);
  }
};
