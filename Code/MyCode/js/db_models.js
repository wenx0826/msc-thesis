const createModel = (db, record) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("models", "readwrite");
      const store = tx.objectStore("models");
      // 确保记录有时间戳
      const recordWithTimestamp = {
        ...record,
        storedAt: record.storedAt || new Date().toISOString(),
      };
      const addReq = store.add(recordWithTimestamp);
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
            svg: r.svg,
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

const getModelById = (db, id) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("models", "readonly");
      const store = tx.objectStore("models");
      const getReq = store.get(id);
      getReq.onsuccess = (evt) => {
        const record = evt.target.result;
        if (record) {
          resolve(record);
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

// const updateModel = (db, id, updatedFields) => {
//   return new Promise((resolve, reject) => {
//     try {
//       const tx = db.transaction("models", "readwrite");
//       const store = tx.objectStore("models");
//       const getReq = store.get(id);
//       getReq.onsuccess = (evt) => {
//         const record = evt.target.result;
//         if (record) {
//           const updatedRecord = { ...record, ...updatedFields };
//           const putReq = store.put(updatedRecord);
//           putReq.onsuccess = () => resolve(updatedRecord);
//           putReq.onerror = (err) => reject(err);
//         } else {
//           reject(new Error("Model not found"));
//         }
//       };
//       getReq.onerror = (err) => reject(err);
//     } catch (err) {
//       reject(err);
//     }
//   });
// };

// 通用保存函数 - 既可以创建也可以更新
const updateModel = (db, record) => {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("models", "readwrite");
      const store = tx.objectStore("models");

      // 确保记录有时间戳
      const recordWithTimestamp = {
        ...record,
        storedAt: record.storedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 使用 put 方法：如果有ID且存在则更新，否则创建新记录
      const putReq = store.put(recordWithTimestamp);
      putReq.onsuccess = (evt) => resolve(evt.target.result);
      putReq.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};
