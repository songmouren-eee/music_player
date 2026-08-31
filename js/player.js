// 播放器核心
const Player = {
    audio: null,
    currentSong: null,
    currentSongData: null,
    lyricList: [],
    isPlaying: false,
    lastActiveLyricIndex: -1,
    onTimeUpdate: null,
    onPlayStateChange: null,
    onEnded: null,
    onLoaded: null,
    onError: null,
    _audioUnlocked: false,
    init() {
        this.audio = document.getElementById('nativeAudio');
        const settings = Storage.getSettings();
        this.audio.volume = settings.volume;
        this.audio.playbackRate = settings.playSpeed;
        // 同步播放速度下拉框UI（延迟执行确保DOM已渲染）
        setTimeout(() => {
            this.syncPlaySpeedUI();
        }, 0);
        // 自动播放解锁：在捕获阶段监听首次用户交互，提前解锁音频元素
        // 这样用户点击歌曲时，音频元素已在同一手势中被激活，后续异步 play() 不会被浏览器阻止
        this._unlockAudio = () => {
            if (this._audioUnlocked) return;
            this._audioUnlocked = true;
            // 在用户手势中播放并立即暂停，以此解锁音频元素的自动播放权限
            try {
                const playPromise = this.audio.play();
                if (playPromise && typeof playPromise.then === 'function') {
                    playPromise.then(() => {
                        this.audio.pause();
                        this.audio.currentTime = 0;
                    }).catch(() => {});
                }
            } catch (e) {}
            // 解锁后移除所有监听器
            document.removeEventListener('click', this._unlockAudio, true);
            document.removeEventListener('touchstart', this._unlockAudio, true);
            document.removeEventListener('keydown', this._unlockAudio, true);
        };
        // 使用捕获阶段，确保在目标元素的 onclick 之前执行解锁
        document.addEventListener('click', this._unlockAudio, true);
        document.addEventListener('touchstart', this._unlockAudio, true);
        document.addEventListener('keydown', this._unlockAudio, true);
        this.audio.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) {
                this.onTimeUpdate(this.audio.currentTime, this.audio.duration);
            }
        });
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            if (this.onPlayStateChange) this.onPlayStateChange(true);
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            if (this.onPlayStateChange) this.onPlayStateChange(false);
        });
        this.audio.addEventListener('ended', () => {
            if (this.onEnded) this.onEnded();
        });
        this.audio.addEventListener('loadedmetadata', () => {
            if (this.onLoaded) this.onLoaded(this.audio.duration);
        });
        this.audio.addEventListener('error', (e) => {
            if (this.onError) this.onError(e);
        });
    },
    // 同步播放速度下拉框UI（兼容value格式不匹配）
    syncPlaySpeedUI() {
        const speedSelect = document.getElementById('speedSelect');
        if (!speedSelect) return;
        const rate = this.audio.playbackRate;
        // 先尝试直接字符串匹配
        speedSelect.value = rate.toString();
        // 如果匹配失败（比如option value是"1.0"但rate是1），按数值遍历找匹配项
        if (speedSelect.selectedIndex === -1) {
            for (let i = 0; i < speedSelect.options.length; i++) {
                if (parseFloat(speedSelect.options[i].value) === rate) {
                    speedSelect.selectedIndex = i;
                    break;
                }
            }
        }
    },
    // 加载歌曲
    async load(songId, quality) {
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
        this.currentSongData = data;
        this.currentSong = data.info;
        this.lyricList = LyricParser.parse(data.lyric?.lrc || '');
        this.lastActiveLyricIndex = -1;
        this.audio.src = data.url?.url;
        this.audio.load();
        return data;
    },
    // 加载本地音频
    loadLocal(file, lyricText = '') {
        const url = URL.createObjectURL(file);
        this.currentSong = {
            id: 'local_' + Date.now(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            singer: '本地音乐',
            picimg: '',
            duration: ''
        };
        this.currentSongData = { info: this.currentSong };
        this.lyricList = LyricParser.parse(lyricText);
        this.lastActiveLyricIndex = -1;
        this.audio.src = url;
        this.audio.load();
        return this.currentSong;
    },
    play() {
        return this.audio.play();
    },
    pause() {
        this.audio.pause();
    },
    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },
    seek(time) {
        this.audio.currentTime = time;
    },
    setVolume(volume) {
        this.audio.volume = Math.max(0, Math.min(1, volume));
        Storage.updateSettings({ volume: this.audio.volume });
    },
    setPlaySpeed(speed) {
        this.audio.playbackRate = speed;
        Storage.updateSettings({ playSpeed: speed });
        // 切换倍速时同步下拉框UI
        this.syncPlaySpeedUI();
    },
    getCurrentTime() {
        return this.audio.currentTime;
    },
    getDuration() {
        return this.audio.duration || 0;
    },
    // 获取当前高亮歌词索引
    getActiveLyricIndex() {
        return LyricParser.getActiveIndex(this.lyricList, this.audio.currentTime);
    },
    // 保存播放进度
    saveProgress() {
        if (this.currentSong && this.currentSong.id) {
            Storage.setLastPlay({
                songId: this.currentSong.id,
                song: this.currentSong,
                time: this.audio.currentTime,
                quality: Storage.getSettings().quality
            });
        }
    },
    // 恢复播放进度
    restoreProgress() {
        const lastPlay = Storage.getLastPlay();
        if (lastPlay && lastPlay.songId) {
            return lastPlay;
        }
        return null;
    }
};
