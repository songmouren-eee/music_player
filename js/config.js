// 应用配置
const CONFIG = {
    API_URL: "https://api.j8y.cn/api/gateway.php",
    APP_KEY: "ak_f43eaa5238b9209a0c2370cd9ba8391b",
    STORAGE_KEYS: {
        FAVORITES: 'mp_favorites',
        HISTORY: 'mp_history',
        SEARCH_HISTORY: 'mp_search_history',
        SETTINGS: 'mp_settings',
        LAST_PLAY: 'mp_last_play',
        QUEUE: 'mp_queue'
    },
    PLAY_MODES: {
        LIST_ORDER: 'list_order',
        LIST_LOOP: 'list_loop',
        SINGLE_LOOP: 'single_loop',
        RANDOM: 'random'
    },
    PLAY_SPEEDS: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
    LYRIC_FONT_SIZES: ['small', 'medium', 'large'],
    MAX_HISTORY: 50,
    MAX_SEARCH_HISTORY: 20
};
