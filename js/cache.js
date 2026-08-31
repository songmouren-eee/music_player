// 缓存管理（双层缓存：内存 + localStorage持久化）
const Cache = {
    // localStorage存储键名
    STORAGE_KEY: 'mp_cache_data',

    // 内存缓存（第一层，速度最快）
    _memory: {
        search: {},
        song: {}
    },

    // 缓存有效期（毫秒）
    TTL: {
        search: 10 * 60 * 1000,      // 搜索结果缓存10分钟
        song: Infinity                 // 歌曲详情缓存永久有效，直到用户手动清理
    },

    // 最大缓存数量
    MAX_CACHE: {
        search: 50,
        song: Infinity                 // 歌曲缓存不限制数量，配合永久 TTL 使用
    },

    // 初始化：从localStorage加载缓存到内存
    init() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.search) this._memory.search = data.search;
                if (data.song) this._memory.song = data.song;
                // 清理过期缓存
                this._cleanExpired();
            }
        } catch (e) {
            console.log('缓存加载失败:', e);
        }
    },

    // 持久化到localStorage
    _persist() {
        try {
            const data = {
                search: this._memory.search,
                song: this._memory.song
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            // localStorage容量满时，淘汰旧缓存后重试
            console.log('缓存持久化失败，尝试清理旧缓存:', e);
            this._evictOldCache();
            try {
                const data = {
                    search: this._memory.search,
                    song: this._memory.song
                };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            } catch (e2) {
                console.log('缓存持久化最终失败:', e2);
            }
        }
    },

    // 清理过期缓存
    _cleanExpired() {
        const now = Date.now();
        let changed = false;

        Object.keys(this._memory.search).forEach(key => {
            if (now - this._memory.search[key].time > this.TTL.search) {
                delete this._memory.search[key];
                changed = true;
            }
        });

        Object.keys(this._memory.song).forEach(key => {
            if (now - this._memory.song[key].time > this.TTL.song) {
                delete this._memory.song[key];
                changed = true;
            }
        });

        if (changed) this._persist();
    },

    // 淘汰旧缓存
    _evictOldCache() {
        // 搜索缓存淘汰
        const searchKeys = Object.keys(this._memory.search);
        if (searchKeys.length > this.MAX_CACHE.search / 2) {
            searchKeys.sort((a, b) =>
                this._memory.search[a].time - this._memory.search[b].time
            );
            const removeCount = Math.ceil(searchKeys.length / 3);
            for (let i = 0; i < removeCount; i++) {
                delete this._memory.search[searchKeys[i]];
            }
        }

        // 歌曲缓存淘汰
        const songKeys = Object.keys(this._memory.song);
        if (songKeys.length > this.MAX_CACHE.song / 2) {
            songKeys.sort((a, b) =>
                this._memory.song[a].time - this._memory.song[b].time
            );
            const removeCount = Math.ceil(songKeys.length / 3);
            for (let i = 0; i < removeCount; i++) {
                delete this._memory.song[songKeys[i]];
            }
        }
    },

    // 生成搜索缓存key
    getSearchKey(keyword, quality, limit) {
        return `${keyword}_${quality}_${limit}`;
    },

    // 获取搜索缓存
    getSearch(keyword, quality, limit) {
        const key = this.getSearchKey(keyword, quality, limit);
        const cached = this._memory.search[key];
        if (cached && Date.now() - cached.time < this.TTL.search) {
            return cached.data;
        }
        // 过期则删除
        if (cached) {
            delete this._memory.search[key];
            this._persist();
        }
        return null;
    },

    // 设置搜索缓存
    setSearch(keyword, quality, limit, data) {
        const key = this.getSearchKey(keyword, quality, limit);
        this._memory.search[key] = {
            data: data,
            time: Date.now()
        };
        // 限制缓存数量
        const keys = Object.keys(this._memory.search);
        if (keys.length > this.MAX_CACHE.search) {
            const oldestKey = keys.sort((a, b) =>
                this._memory.search[a].time - this._memory.search[b].time
            )[0];
            delete this._memory.search[oldestKey];
        }
        this._persist();
    },

    // 获取歌曲缓存
    getSong(songId, quality) {
        const key = `${songId}_${quality}`;
        const cached = this._memory.song[key];
        if (cached && Date.now() - cached.time < this.TTL.song) {
            return cached.data;
        }
        if (cached) {
            delete this._memory.song[key];
            this._persist();
        }
        return null;
    },

    // 设置歌曲缓存
    setSong(songId, quality, data) {
        const key = `${songId}_${quality}`;
        this._memory.song[key] = {
            data: data,
            time: Date.now()
        };
        // 限制缓存数量
        const keys = Object.keys(this._memory.song);
        if (keys.length > this.MAX_CACHE.song) {
            const oldestKey = keys.sort((a, b) =>
                this._memory.song[a].time - this._memory.song[b].time
            )[0];
            delete this._memory.song[oldestKey];
        }
        this._persist();
    },

    // 清空所有缓存
    clear() {
        this._memory.search = {};
        this._memory.song = {};
        localStorage.removeItem(this.STORAGE_KEY);
    },

    // 获取缓存统计
    getStats() {
        return {
            searchCount: Object.keys(this._memory.search).length,
            songCount: Object.keys(this._memory.song).length,
            storageSize: (localStorage.getItem(this.STORAGE_KEY) || '').length
        };
    }
};

// 页面加载时初始化缓存
Cache.init();
