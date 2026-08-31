// 歌词解析器
const LyricParser = {
    // 解析LRC文本
    parse(rawText) {
        if (!rawText) return [];

        // 找到第一个时间戳位置，切掉前面的垃圾内容
        const startPos = rawText.search(/\[\d{2}:\d{2}[.,]\d+/);
        if (startPos !== -1) {
            rawText = rawText.slice(startPos);
        }

        const lyricList = [];
        const reg = /\[(\d{2}):(\d{2})[.,](\d{2,3})\](.*)/g;
        let match;

        while ((match = reg.exec(rawText)) !== null) {
            const min = Number(match[1]);
            const sec = Number(match[2]);
            const msStr = match[3];
            const ms = Number(msStr);
            const txt = match[4].trim();

            if (!txt) continue;

            // 2位数毫秒除以100，3位数毫秒除以1000
            const msValue = msStr.length === 3 ? ms / 1000 : ms / 100;
            const time = min * 60 + sec + msValue;

            lyricList.push({ time, txt });
        }

        lyricList.sort((a, b) => a.time - b.time);
        return lyricList;
    },

    // 根据当前时间获取高亮行索引
    getActiveIndex(lyricList, currentTime) {
        let activeIndex = -1;
        for (let i = 0; i < lyricList.length; i++) {
            if (lyricList[i].time <= currentTime) {
                activeIndex = i;
            } else {
                break;
            }
        }
        return activeIndex;
    }
};
