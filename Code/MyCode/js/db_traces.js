const createTrace = (db, data) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("traces", "readwrite");
      const store = tx.objectStore("traces");
      const addReq = store.add({
        ...data,
        createdAt: new Date().toISOString(),
      });
      addReq.onsuccess = (evt) => resolve(evt.target.result);
      addReq.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};

const getTracesByDocumentId = (db, documentId) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("traces", "readonly");
      const store = tx.objectStore("traces");
      const index = store.index("documentId");
      const getReq = index.getAll(IDBKeyRange.only(documentId));
      getReq.onsuccess = (evt) => {
        resolve(evt.target.result || []);
      };
      getReq.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};
