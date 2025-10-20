const deleteAllModels = (db) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("models", "readwrite");
      const store = tx.objectStore("models");
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};

const createModel = (db, content) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("models", "readwrite");
      const store = tx.objectStore("models");
      //   const record = { file, storedAt: new Date().toISOString() };
      const addReq = store.add({ content });
      addReq.onsuccess = (evt) => resolve(evt.target.result);
      addReq.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};

const getModelList = () => {
  return new Promise((resolve, reject) => {
    const dbReq = indexedDB.open("MyLocalDB", 2);
    dbReq.onerror = (e) => reject(e);
    dbReq.onsuccess = (e) => {
      const db = e.target.result;
      try {
        const tx = db.transaction("models", "readonly");
        const store = tx.objectStore("models");
        const getAllReq = store.getAll();
        getAllReq.onsuccess = (evt) => {
          const models = (evt.target.result || []).map((r) => ({
            id: r.id,
            content: r.content,
          }));
          resolve(models);
        };
        getAllReq.onerror = (err) => reject(err);
      } catch (err) {
        reject(err);
      }
    };
  });
};

const getModelContentById = (db, id) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("models", "readonly");
      const store = tx.objectStore("models");
      const getReq = store.get(id);
      getReq.onsuccess = (evt) => {
        const record = evt.target.result;
        if (record) {
          resolve(record.content);
        } else {
          reject(new Error("Model not found"));
        }
      };
      getReq.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};
