// 主应用
const App = {
    state: {
        currentView: 'search',
        songList: [],
        currentIndex: -1,
        queue: [],
        settings: {},
        currentTab: 'search' // search / favorites / history
    },

    els: {},

    init() {
        this.cacheElements();
        this.state.settings = Storage.getSettings();
        Player.init();
        this.applySettings();
        this.bindEvents();
        this.renderSearchHistory();
        this.navigate('search');

        // 恢复上次播放
        const lastPlay = Player.restoreProgress();
        if (lastPlay && lastPlay.song) {
            // 不自动播放，只显示提示
        }

        // 定期保存播放进度
        setInterval(() => {
            if (Player.isPlaying) {
                Player.saveProgress();
            }
        }, 5000);

        // 页面关闭前保存进度
        window.addEventListener('beforeunload', () => {
            Player.saveProgress();
        });
    },

    cacheElements() {
        const ids = [
            'searchView', 'playerView', 'keywordInput', 'qualitySelect', 'limitInput',
            'searchBtn', 'songList', 'resultsHeader', 'resultsCount', 'backBtn',
            'vinyl', 'vinylCover', 'tonearm', 'trackTitle', 'trackArtist',
            'lyricContainer', 'progressBar', 'progressFill', 'currentTime', 'totalTime',
            'playPauseBtn', 'playIcon', 'prevBtn', 'nextBtn', 'nativeAudio',
            'queuePanel', 'queueList', 'queueCloseBtn', 'queueBtn', 'queueOverlay',
            'settingsPanel', 'settingsCloseBtn', 'settingsBtn', 'settingsOverlay',
            'volumeSlider', 'volumeValue', 'speedSelect', 'themeSelect', 'fontSizeSelect',
            'playModeBtn', 'favoriteBtn', 'searchHistory', 'clearSearchHistory',
            'tabSearch', 'tabFavorites', 'tabHistory', 'localImportBtn', 'localFileInput',
            'localLyricInput', 'toast', 'searchBarArea', 'searchHistoryArea',
            'miniPlayer', 'miniCover', 'miniTitle', 'miniArtist', 'miniInfo',
            'miniPlayBtn', 'miniPlayIcon', 'miniPrevBtn', 'miniNextBtn',
            'clearCacheBtn', 'downloadBtn'
        ];
        ids.forEach(id => {
            this.els[id] = document.getElementById(id);
        });
    },

    applySettings() {
        const s = this.state.settings;
        if (this.els.qualitySelect) this.els.qualitySelect.value = s.quality;
        if (this.els.volumeSlider) this.els.volumeSlider.value = s.volume;
        if (this.els.speedSelect) this.els.speedSelect.value = s.playSpeed;
        if (this.els.themeSelect) this.els.themeSelect.value = s.theme;
        if (this.els.fontSizeSelect) this.els.fontSizeSelect.value = s.lyricFontSize;
        this.applyTheme(s.theme);
        this.applyLyricFontSize(s.lyricFontSize);
        this.updatePlayModeIcon(s.playMode);
    },

    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
    },

    applyLyricFontSize(size) {
        const container = this.els.lyricContainer;
        if (container) {
            container.setAttribute('data-font-size', size);
        }
    },

    bindEvents() {
        // 搜索
        this.els.searchBtn.onclick = () => this.searchSongs();
        this.els.keywordInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.searchSongs();
        });

        // 播放控制
        this.els.backBtn.onclick = () => this.navigate('search');
        this.els.playPauseBtn.onclick = () => Player.toggle();
        this.els.prevBtn.onclick = () => this.playPrev();
        this.els.nextBtn.onclick = () => this.playNext();
        this.els.progressBar.addEventListener('click', e => this.seekTo(e));
        this.els.playModeBtn.onclick = () => this.togglePlayMode();
        this.els.favoriteBtn.onclick = () => this.toggleFavorite();
        this.els.downloadBtn.onclick = () => this.downloadCurrentSong();

        // 队列
        this.els.queueBtn.onclick = () => this.showQueue();
        this.els.queueCloseBtn.onclick = () => this.hideQueue();
        this.els.queueOverlay.onclick = () => this.hideQueue();

        // 设置
        this.els.settingsBtn.onclick = () => this.showSettings();
        this.els.settingsCloseBtn.onclick = () => this.hideSettings();
        this.els.settingsOverlay.onclick = () => this.hideSettings();
        this.els.volumeSlider.addEventListener('input', e => {
            const vol = parseFloat(e.target.value);
            Player.setVolume(vol);
            this.els.volumeValue.textContent = Math.round(vol * 100) + '%';
        });
        this.els.speedSelect.addEventListener('change', e => {
            Player.setPlaySpeed(parseFloat(e.target.value));
            this.showToast('播放速度: ' + e.target.value + 'x');
        });
        this.els.themeSelect.addEventListener('change', e => {
            this.state.settings = Storage.updateSettings({ theme: e.target.value });
            this.applyTheme(e.target.value);
        });
        this.els.fontSizeSelect.addEventListener('change', e => {
            this.state.settings = Storage.updateSettings({ lyricFontSize: e.target.value });
            this.applyLyricFontSize(e.target.value);
        });

        // 清除缓存
        this.els.clearCacheBtn.onclick = () => {
            Cache.clear();
            this.showToast('缓存已清除');
        };

        // 标签页切换
        this.els.tabSearch.onclick = () => this.switchTab('search');
        this.els.tabFavorites.onclick = () => this.switchTab('favorites');
        this.els.tabHistory.onclick = () => this.switchTab('history');

        // 搜索历史
        this.els.clearSearchHistory.onclick = () => {
            Storage.clearSearchHistory();
            this.renderSearchHistory();
            this.showToast('搜索历史已清空');
        };

        // 本地导入
        this.els.localImportBtn.onclick = () => this.els.localFileInput.click();
        this.els.localFileInput.addEventListener('change', e => this.handleLocalImport(e));

        // Player回调
        Player.onTimeUpdate = (current, duration) => this.updateProgress(current, duration);
        Player.onPlayStateChange = (playing) => {
            this.updatePlayState(playing);
            this.updateMiniPlayButton(playing);
        };
        Player.onEnded = () => this.handleSongEnded();
        Player.onLoaded = (duration) => {
            this.els.totalTime.textContent = this.formatTime(duration);
        };
        Player.onError = () => {
            this.showToast('播放出错，自动切换下一首');
            setTimeout(() => this.playNext(), 1000);
        };

        // 迷你播放器
        this.els.miniInfo.onclick = () => {
            if (Player.currentSong) {
                this.navigate('player');
            }
        };
        this.els.miniPlayBtn.onclick = () => Player.toggle();
        this.els.miniPrevBtn.onclick = () => this.playPrev();
        this.els.miniNextBtn.onclick = () => this.playNext();
    },

    // ===== 路由 =====
    navigate(view, params) {
        this.state.currentView = view;
        this.els.searchView.classList.toggle('active', view === 'search');
        this.els.playerView.classList.toggle('active', view === 'player');

        if (view === 'player' && params && params.songId) {
            this.loadAndPlay(params.songId, params.index);
        }
        if (view === 'search') {
            // 不再暂停播放，显示底部迷你播放器
            this.updateMiniPlayer();
        }
    },

    // ===== 搜索 =====
    async searchSongs() {
        const keyword = this.els.keywordInput.value.trim();
        if (!keyword) {
            this.els.keywordInput.focus();
            return;
        }

        Storage.addSearchHistory(keyword);
        this.renderSearchHistory();

        const limit = parseInt(this.els.limitInput.value) || 10;
        const quality = this.els.qualitySelect.value;
        Storage.updateSettings({ quality });

        // 先查缓存
        const cached = Cache.getSearch(keyword, quality, limit);
        if (cached) {
            this.state.songList = cached;
            this.state.queue = [...cached];
            this.renderSongList(cached);
            return;
        }

        this.els.resultsHeader.style.display = 'none';
        this.els.songList.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>正在搜索...</p>
            </div>
        `;

        const params = new URLSearchParams();
        params.append('api_path', 'wy_music');
        params.append('action', 'search');
        params.append('keyword', keyword);
        params.append('level', quality);
        params.append('limit', limit);
        params.append('app_key', CONFIG.APP_KEY);

        try {
            const res = await fetch(`${CONFIG.API_URL}?${params.toString()}`);
            const json = await res.json();
            const songs = json?.data?.data?.songs || [];
            this.state.songList = songs;
            this.state.queue = [...songs];
            // 写入缓存
            Cache.setSearch(keyword, quality, limit, songs);
            this.renderSongList(songs);
        } catch (err) {
            this.els.songList.innerHTML = `
                <div class="empty-state">
                    <p>搜索失败：${err.message}</p>
                </div>
            `;
        }
    },

    renderSongList(songs) {
        this.els.resultsHeader.style.display = songs.length ? 'flex' : 'none';
        this.els.resultsCount.textContent = `共 ${songs.length} 首`;

        if (!songs.length) {
            this.els.songList.innerHTML = `<div class="empty-state"><p>没有找到相关歌曲</p></div>`;
            return;
        }

        this.els.songList.innerHTML = '';
        songs.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'song-item';
            const isFav = Storage.isFavorite(song.id);
            item.innerHTML = `
                <img class="song-cover" src="${song.picimg || ''}" alt="" onerror="this.style.background='var(--bg-secondary)'">
                <div class="song-info">
                    <div class="song-name">${this.escapeHtml(song.name)}</div>
                    <div class="song-meta">${this.escapeHtml(song.singer || '')} · ${this.escapeHtml(song.album || '')}</div>
                </div>
                <span class="song-duration">${song.duration || ''}</span>
                <button class="song-fav-btn ${isFav ? 'active' : ''}" data-id="${song.id}" title="收藏">
                    <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
                <button class="song-download-btn" data-id="${song.id}" title="下载">
                    <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                </button>
                <div class="play-icon">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
            `;

            item.querySelector('.song-fav-btn').onclick = (e) => {
                e.stopPropagation();
                this.toggleFavoriteInList(song, e.target.closest('.song-fav-btn'));
            };
            item.querySelector('.song-download-btn').onclick = (e) => {
                e.stopPropagation();
                this.downloadSong(song);
            };

            item.onclick = () => {
                this.state.currentIndex = index;
                this.navigate('player', { songId: song.id, index });
            };
            this.els.songList.appendChild(item);
        });
    },

    renderSearchHistory() {
        const history = Storage.getSearchHistory();
        const container = this.els.searchHistory;
        if (!history.length) {
            container.innerHTML = '<span class="history-empty">暂无搜索历史</span>';
            return;
        }
        container.innerHTML = history.map(k =>
            `<span class="history-tag" data-keyword="${this.escapeHtml(k)}">${this.escapeHtml(k)}</span>`
        ).join('');
        container.querySelectorAll('.history-tag').forEach(tag => {
            tag.onclick = () => {
                this.els.keywordInput.value = tag.dataset.keyword;
                this.searchSongs();
            };
        });
    },

    // ===== 播放 =====
    async loadAndPlay(songId, index) {
        this.els.trackTitle.textContent = '加载中...';
        this.els.trackArtist.textContent = '--';
        this.els.lyricContainer.innerHTML = '<div class="lyric-line">歌词加载中...</div>';
        this.els.vinylCover.src = '';

        const quality = this.els.qualitySelect.value;

        // 先查缓存
        const cached = Cache.getSong(songId, quality);
        if (cached) {
            this.applySongData(cached);
            Player.play().catch(() => {
                this.showToast('点击播放按钮开始播放');
            });
            return;
        }

        try {
            const data = await Player.load(songId, quality);
            // 写入缓存
            Cache.setSong(songId, quality, data);
            this.applySongData(data);
            Player.play().catch(() => {
                this.showToast('点击播放按钮开始播放');
            });
        } catch (e) {
            this.els.trackTitle.textContent = '加载失败';
            this.els.trackArtist.textContent = e.message;
            this.showToast('加载失败: ' + e.message);
        }
    },

    applySongData(data) {
        const info = data.info;
        Player.currentSongData = data;
        Player.currentSong = info;
        Player.lyricList = LyricParser.parse(data.lyric?.lrc || '');
        Player.lastActiveLyricIndex = -1;

        this.els.trackTitle.textContent = info.name;
        this.els.trackArtist.textContent = info.singer;
        this.els.vinylCover.src = info.picimg;
        Player.audio.src = data.url?.url;
        Player.audio.load();

        this.renderLyrics(Player.lyricList);
        this.updateFavoriteButton();
        this.updateMediaSession(info);
        this.updateMiniPlayer();

        // 添加到历史
        Storage.addHistory(info);
    },

    renderLyrics(lyricList) {
        this.els.lyricContainer.innerHTML = '';
        this.els.lyricContainer.scrollTop = 0;
        if (!lyricList.length) {
            this.els.lyricContainer.innerHTML = '<div class="lyric-line">暂无歌词</div>';
            return;
        }
        lyricList.forEach(item => {
            const div = document.createElement('div');
            div.className = 'lyric-line';
            div.textContent = item.txt;
            this.els.lyricContainer.appendChild(div);
        });
    },

    updateProgress(current, duration) {
        const percent = duration ? (current / duration) * 100 : 0;
        this.els.progressFill.style.width = percent + '%';
        this.els.currentTime.textContent = this.formatTime(current);
        this.els.totalTime.textContent = this.formatTime(duration);

        // 更新歌词高亮
        const activeIndex = Player.getActiveLyricIndex();
        if (activeIndex !== Player.lastActiveLyricIndex) {
            Player.lastActiveLyricIndex = activeIndex;
            this.updateLyricHighlight(activeIndex);
        }
    },

    updateLyricHighlight(activeIndex) {
        const lines = this.els.lyricContainer.querySelectorAll('.lyric-line');
        lines.forEach((el, i) => {
            el.classList.remove('active', 'near');
            if (i === activeIndex) {
                el.classList.add('active');
                const container = this.els.lyricContainer;
                const lineOffsetTop = el.offsetTop;
                const lineHeight = el.offsetHeight;
                const containerHeight = container.clientHeight;
                const paddingTop = parseInt(getComputedStyle(container).paddingTop) || 0;
                const targetScroll = lineOffsetTop - containerHeight / 2 + lineHeight / 2 - paddingTop;
                container.scrollTop = Math.max(0, targetScroll);
            } else if (Math.abs(i - activeIndex) <= 2) {
                el.classList.add('near');
            }
        });
    },

    updatePlayState(playing) {
        if (playing) {
            this.els.playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            this.els.vinyl.classList.remove('paused');
            this.els.vinyl.classList.add('playing');
            this.els.tonearm.classList.add('playing');
        } else {
            this.els.playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
            this.els.vinyl.classList.remove('playing');
            this.els.vinyl.classList.add('paused');
            this.els.tonearm.classList.remove('playing');
        }
    },

    // 更新迷你播放器
    updateMiniPlayer() {
        if (!Player.currentSong || !Player.currentSong.name) {
            this.els.miniPlayer.style.display = 'none';
            return;
        }
        const song = Player.currentSong;
        this.els.miniPlayer.style.display = 'flex';
        this.els.miniCover.src = song.picimg || '';
        this.els.miniTitle.textContent = song.name;
        this.els.miniArtist.textContent = song.singer || '';
        this.updateMiniPlayButton(Player.isPlaying);
    },

    updateMiniPlayButton(playing) {
        if (playing) {
            this.els.miniPlayIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        } else {
            this.els.miniPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        }
    },

    seekTo(e) {
        const rect = this.els.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const duration = Player.getDuration();
        if (duration) {
            Player.seek(percent * duration);
        }
    },

    playPrev() {
        const mode = this.state.settings.playMode;
        if (mode === CONFIG.PLAY_MODES.RANDOM) {
            this.playRandom();
            return;
        }
        if (this.state.queue.length && this.state.currentIndex > 0) {
            this.state.currentIndex--;
            const song = this.state.queue[this.state.currentIndex];
            this.navigate('player', { songId: song.id, index: this.state.currentIndex });
        } else {
            this.showToast('已经是第一首了');
        }
    },

    playNext() {
        const mode = this.state.settings.playMode;
        if (mode === CONFIG.PLAY_MODES.RANDOM) {
            this.playRandom();
            return;
        }
        if (this.state.queue.length && this.state.currentIndex < this.state.queue.length - 1) {
            this.state.currentIndex++;
            const song = this.state.queue[this.state.currentIndex];
            this.navigate('player', { songId: song.id, index: this.state.currentIndex });
        } else if (mode === CONFIG.PLAY_MODES.LIST_LOOP && this.state.queue.length) {
            this.state.currentIndex = 0;
            const song = this.state.queue[0];
            this.navigate('player', { songId: song.id, index: 0 });
        } else {
            this.showToast('已经是最后一首了');
        }
    },

    playRandom() {
        if (!this.state.queue.length) return;
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * this.state.queue.length);
        } while (newIndex === this.state.currentIndex && this.state.queue.length > 1);
        this.state.currentIndex = newIndex;
        const song = this.state.queue[newIndex];
        this.navigate('player', { songId: song.id, index: newIndex });
    },

    handleSongEnded() {
        const mode = this.state.settings.playMode;
        if (mode === CONFIG.PLAY_MODES.SINGLE_LOOP) {
            Player.seek(0);
            Player.play();
        } else {
            this.playNext();
        }
    },

    // ===== 播放模式 =====
    togglePlayMode() {
        const modes = [
            CONFIG.PLAY_MODES.LIST_ORDER,
            CONFIG.PLAY_MODES.LIST_LOOP,
            CONFIG.PLAY_MODES.SINGLE_LOOP,
            CONFIG.PLAY_MODES.RANDOM
        ];
        const currentIndex = modes.indexOf(this.state.settings.playMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        this.state.settings = Storage.updateSettings({ playMode: nextMode });
        this.updatePlayModeIcon(nextMode);
        const modeNames = {
            list_order: '顺序播放',
            list_loop: '列表循环',
            single_loop: '单曲循环',
            random: '随机播放'
        };
        this.showToast(modeNames[nextMode]);
    },

    updatePlayModeIcon(mode) {
        const icons = {
            list_order: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 5h12v2H3V5zm0 4h12v2H3V9zm0 4h8v2H3v-2zm13-1v8l5-4-5-4z" fill="currentColor"/></svg>',
            list_loop: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" fill="currentColor"/></svg>',
            single_loop: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" fill="currentColor"/><text x="12" y="15" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor">1</text></svg>',
            random: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" fill="currentColor"/></svg>'
        };
        if (this.els.playModeBtn) {
            this.els.playModeBtn.innerHTML = icons[mode] || icons.list_order;
        }
    },

    // ===== 收藏 =====
    toggleFavorite() {
        if (!Player.currentSong) return;
        const song = Player.currentSong;
        if (Storage.isFavorite(song.id)) {
            Storage.removeFavorite(song.id);
            this.showToast('已取消收藏');
        } else {
            Storage.addFavorite(song);
            this.showToast('已添加收藏');
        }
        this.updateFavoriteButton();
    },

    toggleFavoriteInList(song, btn) {
        if (Storage.isFavorite(song.id)) {
            Storage.removeFavorite(song.id);
            btn.classList.remove('active');
            this.showToast('已取消收藏');
        } else {
            Storage.addFavorite(song);
            btn.classList.add('active');
            this.showToast('已添加收藏');
        }
    },

    updateFavoriteButton() {
        if (!Player.currentSong) return;
        const isFav = Storage.isFavorite(Player.currentSong.id);
        this.els.favoriteBtn.classList.toggle('active', isFav);
    },
    // ===== 音乐下载 =====
    // 下载当前播放的歌曲
    downloadCurrentSong() {
        if (!Player.currentSong) {
            this.showToast('暂无可下载的歌曲');
            return;
        }
        this.downloadSong(Player.currentSong);
    },
    // 下载指定歌曲
    async downloadSong(song) {
        // 本地导入的音乐不支持下载
        if (song.id && String(song.id).startsWith('local_')) {
            this.showToast('本地音乐无需下载');
            return;
        }
        const quality = this.els.qualitySelect.value;
        let songData = null;
        // 优先使用当前正在播放的歌曲数据
        if (Player.currentSong && Player.currentSong.id === song.id && Player.currentSongData) {
            songData = Player.currentSongData;
        } else {
            // 查缓存
            const cached = Cache.getSong(song.id, quality);
            if (cached) {
                songData = cached;
            } else {
                // 从API获取歌曲详情（不影响当前播放）
                try {
                    this.showToast('正在获取下载地址...');
                    songData = await this.fetchSongDetail(song.id, quality);
                    Cache.setSong(song.id, quality, songData);
                } catch (e) {
                    this.showToast('获取下载地址失败: ' + e.message);
                    return;
                }
            }
        }
        const audioUrl = songData.url?.url;
        if (!audioUrl) {
            this.showToast('未找到下载地址');
            return;
        }
        // 生成文件名（不含扩展名，扩展名按环境分别处理）
        const singer = song.singer || songData.info?.singer || '未知歌手';
        const songName = song.name || songData.info?.name || '未知歌曲';
        const baseFilename = `${songName} - ${singer}`.replace(/[\\/:*?"<>|]/g, '_');
        // WebView/APK 环境：直接用原始 URL 触发系统下载，避免 fetch+Blob 大文件内存溢出闪退
        if (this.isWebViewEnv()) {
            this.downloadViaNative(audioUrl, baseFilename);
            return;
        }
        // 浏览器环境：fetch + Blob 方式（支持自定义文件名和扩展名）
        try {
            this.showToast('正在下载...');
            const response = await fetch(audioUrl);
            if (!response.ok) throw new Error('网络响应异常');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            // 根据 Content-Type 推断文件扩展名
            const contentType = response.headers.get('content-type') || '';
            let ext = 'mp3';
            if (contentType.includes('flac')) ext = 'flac';
            else if (contentType.includes('wav')) ext = 'wav';
            else if (contentType.includes('ogg')) ext = 'ogg';
            else if (contentType.includes('m4a') || contentType.includes('aac')) ext = 'm4a';
            const fullFilename = `${baseFilename}.${ext}`;
            // 触发浏览器下载
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fullFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // 释放 blob URL
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            this.showToast('下载完成: ' + fullFilename);
        } catch (e) {
            // fetch 失败时降级为直接打开链接（跨域限制时的兜底）
            try {
                const a = document.createElement('a');
                a.href = audioUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                this.showToast('已在新标签页打开，请右键另存为');
            } catch (e2) {
                this.showToast('下载失败: ' + e.message);
            }
        }
    },
    // 检测是否在 WebView/APK 环境中运行
    isWebViewEnv() {
        try {
            const ua = navigator.userAgent || '';
            // webcat 等打包工具的 WebView 特征
            if (/webcat|wv|webview/i.test(ua)) return true;
            // Android WebView 标准特征：包含 ; wv
            if (/Android/i.test(ua) && /; wv\)/.test(ua)) return true;
            // Android 环境但缺少 Chrome 版本号（典型 WebView）
            if (/Android/i.test(ua) && !/Chrome\/\d+/.test(ua)) return true;
            return false;
        } catch (e) {
            return false;
        }
    },
    // WebView 环境下通过原生下载器下载（不经过 fetch+Blob，避免大文件内存溢出闪退）
    downloadViaNative(url, baseFilename) {
        try {
            // 方式1：通过 <a download> 触发，WebView 的 DownloadListener 会拦截并交给系统下载
            const a = document.createElement('a');
            a.href = url;
            a.download = baseFilename + '.mp3';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            this.showToast('正在调用系统下载...');
        } catch (e) {
            // 方式2：降级为 location.href 导航，触发 WebView 下载监听
            try {
                window.location.href = url;
                this.showToast('正在调用系统下载...');
            } catch (e2) {
                this.showToast('下载失败，请在打包工具中开启文件下载权限');
            }
        }
    },
    // 从API获取歌曲详情（不影响当前播放状态）
    async fetchSongDetail(songId, quality) {
        const params = new URLSearchParams();
        params.append('api_path', 'wy_music');
        params.append('action', 'song');
        params.append('id', songId);
        params.append('level', quality);
        params.append('app_key', CONFIG.APP_KEY);
        const res = await fetch(`${CONFIG.API_URL}?${params.toString()}`);
        const json = await res.json();
        const data = json?.data?.data;
        if (!data) throw new Error('获取歌曲信息失败');
        return data;
    },

    // ===== 标签页切换 =====
    switchTab(tab) {
        this.state.currentTab = tab;
        this.els.tabSearch.classList.toggle('active', tab === 'search');
        this.els.tabFavorites.classList.toggle('active', tab === 'favorites');
        this.els.tabHistory.classList.toggle('active', tab === 'history');

        const isSearchTab = tab === 'search';
        this.els.searchBarArea.style.display = isSearchTab ? '' : 'none';
        this.els.searchHistoryArea.style.display = isSearchTab ? '' : 'none';

        if (tab === 'search') {
            this.renderSongList(this.state.songList);
        } else if (tab === 'favorites') {
            const favorites = Storage.getFavorites();
            this.state.songList = favorites;
            this.state.queue = [...favorites];
            this.renderSongList(favorites);
        } else if (tab === 'history') {
            const history = Storage.getHistory();
            this.state.songList = history;
            this.state.queue = [...history];
            this.renderSongList(history);
        }
    },

    // ===== 播放队列 =====
    showQueue() {
        this.renderQueue();
        this.els.queuePanel.classList.add('active');
    },

    hideQueue() {
        this.els.queuePanel.classList.remove('active');
    },

    renderQueue() {
        const list = this.els.queueList;
        if (!this.state.queue.length) {
            list.innerHTML = '<div class="empty-state"><p>队列为空</p></div>';
            return;
        }
        list.innerHTML = '';
        this.state.queue.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = `queue-item ${index === this.state.currentIndex ? 'playing' : ''}`;
            item.innerHTML = `
                <span class="queue-index">${index + 1}</span>
                <div class="queue-info">
                    <div class="queue-name">${this.escapeHtml(song.name)}</div>
                    <div class="queue-singer">${this.escapeHtml(song.singer || '')}</div>
                </div>
                <button class="queue-remove" data-index="${index}">×</button>
            `;
            item.onclick = (e) => {
                if (!e.target.classList.contains('queue-remove')) {
                    this.state.currentIndex = index;
                    this.navigate('player', { songId: song.id, index });
                    this.hideQueue();
                }
            };
            item.querySelector('.queue-remove').onclick = (e) => {
                e.stopPropagation();
                this.state.queue.splice(index, 1);
                if (this.state.currentIndex > index) this.state.currentIndex--;
                this.renderQueue();
            };
            list.appendChild(item);
        });
    },

    // ===== 设置面板 =====
    showSettings() {
        this.els.settingsPanel.classList.add('active');
    },

    hideSettings() {
        this.els.settingsPanel.classList.remove('active');
    },

    // ===== 本地导入 =====
    handleLocalImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const lyricFile = this.els.localLyricInput.files[0];
        if (lyricFile) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                this.loadLocalSong(file, ev.target.result);
            };
            reader.readAsText(lyricFile);
        } else {
            this.loadLocalSong(file, '');
        }
        e.target.value = '';
    },

    loadLocalSong(file, lyricText) {
        try {
            const song = Player.loadLocal(file, lyricText);
            this.els.trackTitle.textContent = song.name;
            this.els.trackArtist.textContent = song.singer;
            this.els.vinylCover.src = '';
            this.renderLyrics(Player.lyricList);
            this.state.currentIndex = -1;
            this.updateMiniPlayer();
            this.navigate('player');
            Player.play().catch(() => {
                this.showToast('点击播放按钮开始播放');
            });
            this.showToast('本地音乐已加载');
        } catch (e) {
            this.showToast('加载失败: ' + e.message);
        }
    },

    // ===== Web Media Session =====
    updateMediaSession(info) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: info.name,
                artist: info.singer,
                album: info.album || '',
                artwork: info.picimg ? [{ src: info.picimg, sizes: '512x512', type: 'image/jpeg' }] : []
            });
            navigator.mediaSession.setActionHandler('play', () => Player.play());
            navigator.mediaSession.setActionHandler('pause', () => Player.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
        }
    },

    // ===== 工具函数 =====
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    showToast(message) {
        const toast = this.els.toast;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => App.init());
