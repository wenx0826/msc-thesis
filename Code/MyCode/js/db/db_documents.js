//Documents

const getDocumentList = (db) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("documents", "readonly");
      const store = tx.objectStore("documents");
      const getAllReq = store.getAll();
      getAllReq.onsuccess = (evt) => {
        const docs = (evt.target.result || []).map((r) => ({
          id: r.id,
          name: r.name,
        }));
        resolve(docs);
      };
    } catch (err) {
      reject(err);
    }
  });
};

const createDocument = (db, name, content) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("documents", "readwrite");
      const store = tx.objectStore("documents");
      const record = { name, content, storedAt: new Date().toISOString() };
      const addReq = store.add(record);
      addReq.onsuccess = (evt) => resolve(evt.target.result);
      addReq.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};

const getDocumentContentById = (db, id) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("documents", "readonly");
      const store = tx.objectStore("documents");
      const getReq = store.get(id);
      getReq.onsuccess = (evt) => {
        const record = evt.target.result;
        if (record) {
          resolve(record.content);
        } else {
          reject(new Error("Document not found"));
        }
      };
      getReq.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};

const deleteDocumentById = (db, id) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("documents", "readwrite");
      const store = tx.objectStore("documents");
      const deleteReq = store.delete(id);
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};

// Delete document + its traces + models linked by those traces (if not used elsewhere)
const deleteDocumentCascadeById = (db, documentId) => {
  return new Promise((resolve, reject) => {
    let tx;
    try {
      // One atomic transaction across all related stores
      tx = db.transaction(["documents", "traces", "models"], "readwrite");

      const docStore = tx.objectStore("documents");
      const traceStore = tx.objectStore("traces");
      const modelStore = tx.objectStore("models");

      // 1) Load all traces for this document
      const traceByDocIndex = traceStore.index("document_id");
      const tracesReq = traceByDocIndex.getAll(IDBKeyRange.only(documentId));

      tracesReq.onerror = () => reject(tracesReq.error);

      tracesReq.onsuccess = async (evt) => {
        const traces = evt.target.result || [];
        const modelIds = Array.from(
          new Set(
            traces
              .map((t) => t.model_id)
              .filter((v) => v !== undefined && v !== null)
          )
        );

        // 2) Delete all traces belonging to this document
        // (assumes traces have primary key "id" like your other stores)
        for (const t of traces) {
          if (t && t.id !== undefined && t.id !== null) {
            traceStore.delete(t.id);
          }
        }

        // 3) For each linked model_id, delete model ONLY if no traces from other docs reference it
        // We check "is this model used by any trace where document_id != documentId?"
        const traceByModelIndex = traceStore.index("model_id");

        await Promise.all(
          modelIds.map(
            (mid) =>
              new Promise((res, rej) => {
                const req = traceByModelIndex.getAll(IDBKeyRange.only(mid));
                req.onerror = () => rej(req.error);
                req.onsuccess = (e2) => {
                  const allTracesForModel = e2.target.result || [];

                  const usedByOtherDocs = allTracesForModel.some(
                    (tr) => tr.document_id !== documentId
                  );

                  if (!usedByOtherDocs) {
                    modelStore.delete(mid);
                  }
                  res();
                };
              })
          )
        );

        // 4) Finally delete the document itself
        docStore.delete(documentId);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    } catch (err) {
      // If transaction creation fails etc.
      if (tx) {
        try {
          tx.abort();
        } catch (_) {}
      }
      reject(err);
    }
  });
};
