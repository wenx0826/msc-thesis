//Documents
const deleteAllDocuments = () => {
  return new Promise((resolve, reject) => {
    const dbReq = indexedDB.open("MyLocalDB", 1);
    dbReq.onerror = (e) => reject(e);
    dbReq.onsuccess = (e) => {
      const db = e.target.result;
      try {
        const tx = db.transaction("documents", "readwrite");
        const store = tx.objectStore("documents");
        const clearReq = store.clear();
        clearReq.onsuccess = () => resolve();
        clearReq.onerror = (err) => reject(err);
      } catch (err) {
        reject(err);
      }
    };
  });
};

const getDocumentList = () => {
  return new Promise((resolve, reject) => {
    const dbReq = indexedDB.open("MyLocalDB", 1);
    dbReq.onerror = (e) => reject(e);
    dbReq.onsuccess = (e) => {
      const db = e.target.result;
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
        getAllReq.onerror = (err) => reject(err);
      } catch (err) {
        reject(err);
      }
    };
  });
};

const createDocument = (name, content) => {
  return new Promise((resolve, reject) => {
    const dbReq = indexedDB.open("MyLocalDB", 1);
    dbReq.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    dbReq.onerror = (e) => reject(e);
    dbReq.onsuccess = (e) => {
      const db = e.target.result;
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
    };
  });
};

const getDocumentContentById = (id) => {
  return new Promise((resolve, reject) => {
    const dbReq = indexedDB.open("MyLocalDB", 1);
    dbReq.onerror = (e) => reject(e);
    dbReq.onsuccess = (e) => {
      const db = e.target.result;
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
    };
  });
};
