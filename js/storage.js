// 本地存储管理
const Storage = {
    // 通用读取
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },

    // 通用写入
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    },

    // 删除
    remove(key) {
        localStorage.removeItem(key);
    },

    // ===== 收藏 =====
    getFavorites() {
        return this.get(CONFIG.STORAGE_KEYS.FAVORITES, []);
    },

    addFavorite(song) {
        const favorites = this.getFavorites();
        if (!favorites.find(s => s.id === song.id)) {
            favorites.unshift(song);
            this.set(CONFIG.STORAGE_KEYS.FAVORITES, favorites);
        }
        return favorites;
    },

    removeFavorite(songId) {
        const favorites = this.getFavorites().filter(s => s.id !== songId);
        this.set(CONFIG.STORAGE_KEYS.FAVORITES, favorites);
        return favorites;
    },

    isFavorite(songId) {
        return this.getFavorites().some(s => s.id === songId);
    },

    // ===== 播放历史 =====
    getHistory() {
        return this.get(CONFIG.STORAGE_KEYS.HISTORY, []);
    },

    addHistory(song) {
        let history = this.getHistory();
        history = history.filter(s => s.id !== song.id);
        history.unshift(song);
        if (history.length > CONFIG.MAX_HISTORY) {
            history = history.slice(0, CONFIG.MAX_HISTORY);
        }
        this.set(CONFIG.STORAGE_KEYS.HISTORY, history);
        return history;
    },

    clearHistory() {
        this.remove(CONFIG.STORAGE_KEYS.HISTORY);
    },

    // ===== 搜索历史 =====
    getSearchHistory() {
        return this.get(CONFIG.STORAGE_KEYS.SEARCH_HISTORY, []);
    },

    addSearchHistory(keyword) {
        let history = this.getSearchHistory();
        history = history.filter(k => k !== keyword);
        history.unshift(keyword);
        if (history.length > CONFIG.MAX_SEARCH_HISTORY) {
            history = history.slice(0, CONFIG.MAX_SEARCH_HISTORY);
        }
        this.set(CONFIG.STORAGE_KEYS.SEARCH_HISTORY, history);
        return history;
    },

    clearSearchHistory() {
        this.remove(CONFIG.STORAGE_KEYS.SEARCH_HISTORY);
    },

    // ===== 设置 =====
    getSettings() {
        return this.get(CONFIG.STORAGE_KEYS.SETTINGS, {
            quality: 'lossless',
            playMode: CONFIG.PLAY_MODES.LIST_LOOP,
            volume: 1.0,
            playSpeed: 1.0,
            theme: 'dark',
            lyricFontSize: 'medium',
            autoPlay: true
        });
    },

    updateSettings(updates) {
        const settings = { ...this.getSettings(), ...updates };
        this.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);
        return settings;
    },

    // ===== 上次播放 =====
    getLastPlay() {
        return this.get(CONFIG.STORAGE_KEYS.LAST_PLAY, null);
    },

    setLastPlay(data) {
        this.set(CONFIG.STORAGE_KEYS.LAST_PLAY, data);
    },

    // ===== 播放队列 =====
    getQueue() {
        return this.get(CONFIG.STORAGE_KEYS.QUEUE, []);
    },

    setQueue(queue) {
        this.set(CONFIG.STORAGE_KEYS.QUEUE, queue);
    },

    clearQueue() {
        this.remove(CONFIG.STORAGE_KEYS.QUEUE);
    }
};
