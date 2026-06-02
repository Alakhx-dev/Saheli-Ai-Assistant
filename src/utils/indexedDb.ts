class CharacterDB {
  private dbName = "SaheliCharacterDB";
  private storeName = "characters";
  private db: IDBDatabase | null = null;

  private init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async saveCustomCharacter(userId: string, id: string, name: string, url: string, timestamp: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      
      const request = store.put({
        key: `${userId}_${id}`,
        userId,
        id,
        name,
        url,
        timestamp,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCustomCharacters(userId: string): Promise<Array<{ id: string; name: string; url: string; timestamp: number; scale?: number; xOffset?: number; yOffset?: number }>> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        // Filter by userId and map to target format
        const filtered = results
          .filter((item: any) => item.userId === userId)
          .map((item: any) => ({
            id: item.id,
            name: item.name || "Custom companion",
            url: item.url,
            timestamp: item.timestamp,
            scale: item.scale,
            xOffset: item.xOffset,
            yOffset: item.yOffset,
          }))
          .sort((a: any, b: any) => b.timestamp - a.timestamp); // newest first

        resolve(filtered);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteCustomCharacter(userId: string, id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(`${userId}_${id}`);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateCharacterAdjustments(userId: string, id: string, scale: number, xOffset: number, yOffset: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      
      const key = `${userId}_${id}`;
      const getReq = store.get(key);
      
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) {
          reject(new Error("Character record not found"));
          return;
        }
        
        record.scale = scale;
        record.xOffset = xOffset;
        record.yOffset = yOffset;
        
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      
      getReq.onerror = () => reject(getReq.error);
    });
  }
}

export const characterDb = new CharacterDB();
