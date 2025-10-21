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
