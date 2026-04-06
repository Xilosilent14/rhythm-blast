/* ============================================
   RHYTHM BLAST — Audio Engine
   Web Audio API synthesized music + SFX + beat scheduling
   Following OTB audio patterns from ThinkFast
   ============================================ */
const Audio = (() => {
    let ctx = null;
    let masterGain = null;
    let musicGain = null;
    let sfxGain = null;
    let unlocked = false;
    let settings = { sfx: true, music: true, voice: true };

    // Safe gain levels for children's hearing
    const MASTER_VOL = 0.7;
    const MUSIC_VOL = 0.3;
    const SFX_VOL = 0.5;

    function _getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = MASTER_VOL;
            masterGain.connect(ctx.destination);

            musicGain = ctx.createGain();
            musicGain.gain.value = MUSIC_VOL;
            musicGain.connect(masterGain);

            sfxGain = ctx.createGain();
            sfxGain.gain.value = SFX_VOL;
            sfxGain.connect(masterGain);
        }
        return ctx;
    }

    function unlock() {
        const c = _getCtx();
        if (c.state === 'suspended') c.resume();
        unlocked = true;
    }

    // ADSR envelope helper
    function _makeNote(freq, duration, waveform = 'sine', gainNode = sfxGain, vol = 0.3) {
        if (!settings.sfx && gainNode === sfxGain) return;
        const c = _getCtx();
        const osc = c.createOscillator();
        const env = c.createGain();
        osc.type = waveform;
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0, c.currentTime);
        env.gain.linearRampToValueAtTime(vol, c.currentTime + 0.01); // attack
        env.gain.linearRampToValueAtTime(vol * 0.6, c.currentTime + 0.05); // decay
        env.gain.linearRampToValueAtTime(0, c.currentTime + duration); // release
        osc.connect(env);
        env.connect(gainNode);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + duration);
    }

    // C major pentatonic scale frequencies
    const SCALE = {
        C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
        C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00
    };
    const NOTES_ARR = Object.values(SCALE);

    // === SFX ===
    function perfectHit() {
        // Bright, sparkly double chime
        _makeNote(SCALE.E5, 0.12, 'sine', sfxGain, 0.35);
        _makeNote(SCALE.E5 * 2, 0.08, 'sine', sfxGain, 0.15); // octave shimmer
        setTimeout(() => {
            _makeNote(SCALE.G5, 0.1, 'sine', sfxGain, 0.3);
            _makeNote(SCALE.G5 * 2, 0.06, 'sine', sfxGain, 0.1);
        }, 40);
    }

    function greatHit() {
        // Clean single chime
        _makeNote(SCALE.C5, 0.1, 'sine', sfxGain, 0.3);
        _makeNote(SCALE.E5, 0.06, 'sine', sfxGain, 0.15);
    }

    function okHit() {
        // Soft muted tone
        _makeNote(SCALE.G4, 0.08, 'triangle', sfxGain, 0.2);
    }

    function miss() {
        // Gentle low thud (not punishing for a 6yo)
        _makeNote(160, 0.1, 'triangle', sfxGain, 0.12);
    }

    function comboBreak() {
        // Descending tone (informative, not harsh)
        _makeNote(300, 0.12, 'triangle', sfxGain, 0.15);
        setTimeout(() => _makeNote(200, 0.15, 'triangle', sfxGain, 0.12), 60);
    }

    function comboMilestone() {
        // Ascending power-up fanfare
        _makeNote(SCALE.C5, 0.06, 'square', sfxGain, 0.2);
        setTimeout(() => _makeNote(SCALE.E5, 0.06, 'square', sfxGain, 0.22), 50);
        setTimeout(() => _makeNote(SCALE.G5, 0.08, 'square', sfxGain, 0.25), 100);
        setTimeout(() => _makeNote(SCALE.C5 * 2, 0.12, 'sine', sfxGain, 0.3), 160);
    }

    function countdown() {
        _makeNote(SCALE.C4, 0.15, 'square', sfxGain, 0.25);
    }

    function countdownGo() {
        _makeNote(SCALE.C5, 0.1, 'square', sfxGain, 0.3);
        setTimeout(() => _makeNote(SCALE.E5, 0.15, 'square', sfxGain, 0.35), 80);
    }

    function songComplete() {
        // Triumphant ascending fanfare with harmony
        const fanfare = [SCALE.C5, SCALE.E5, SCALE.G5, SCALE.C5 * 2];
        fanfare.forEach((f, i) => {
            setTimeout(() => {
                _makeNote(f, 0.25, 'square', sfxGain, 0.25);
                _makeNote(f * 1.5, 0.15, 'sine', sfxGain, 0.12); // harmony fifth
            }, i * 140);
        });
        // Final chord
        setTimeout(() => {
            _makeNote(SCALE.C5, 0.5, 'sine', sfxGain, 0.2);
            _makeNote(SCALE.E5, 0.5, 'sine', sfxGain, 0.15);
            _makeNote(SCALE.G5, 0.5, 'sine', sfxGain, 0.15);
        }, 600);
    }

    // === BEAT MUSIC ENGINE ===
    let beatInterval = null;
    let beatIndex = 0;
    let currentSongMelody = [];
    let currentSongBass = [];
    let currentBPM = 120;
    let beatCallback = null;

    function startSong(song, onBeat) {
        const c = _getCtx();
        currentSongMelody = song.melody || [];
        currentSongBass = song.bass || [];
        currentBPM = song.bpm;
        beatIndex = 0;
        beatCallback = onBeat;

        const beatDuration = 60 / song.bpm; // seconds per beat
        const songStartTime = c.currentTime;
        let lastScheduledBeat = -1;

        // Lookahead scheduler: checks every 25ms, schedules 100ms ahead
        // This prevents timing drift that setInterval causes
        beatInterval = setInterval(() => {
            const now = c.currentTime;
            const currentBeat = Math.floor((now - songStartTime) / beatDuration);

            // Schedule any beats that need to fire
            while (lastScheduledBeat < currentBeat) {
                lastScheduledBeat++;
                const bi = lastScheduledBeat;
                const beatTime = songStartTime + bi * beatDuration;

                if (settings.music) {
                    // Melody note
                    if (currentSongMelody.length > 0) {
                        const freq = currentSongMelody[bi % currentSongMelody.length];
                        if (freq > 0) {
                            _scheduleNote(freq, beatTime, beatDuration * 0.8, 'square', musicGain, 0.15);
                        }
                    }

                    // Bass (every other beat)
                    if (bi % 2 === 0 && currentSongBass.length > 0) {
                        const bf = currentSongBass[Math.floor(bi / 2) % currentSongBass.length];
                        if (bf > 0) {
                            _scheduleNote(bf, beatTime, beatDuration * 0.6, 'triangle', musicGain, 0.2);
                        }
                    }

                    // Drums
                    const bib = bi % 4;
                    if (bib === 0 || bib === 2) {
                        _scheduleNote(80, beatTime, 0.12, 'sine', musicGain, 0.3);
                        _scheduleNote(40, beatTime + 0.01, 0.06, 'sine', musicGain, 0.2);
                    }
                    if (bib === 1 || bib === 3) {
                        _scheduleNote(200, beatTime, 0.06, 'square', musicGain, 0.12);
                    }
                    // Hi-hat every beat
                    _scheduleNote(6000 + (bi * 137 % 3000), beatTime, 0.02, 'square', musicGain, 0.04);
                }

                // Fire visual beat callback
                if (beatCallback) beatCallback(bi);
            }

            beatIndex = currentBeat;
        }, 25); // 25ms lookahead interval (tight, drift-free)
    }

    // Schedule a note at a precise audio time (drift-free)
    function _scheduleNote(freq, time, duration, waveform, gainNode, vol) {
        const c = _getCtx();
        if (time < c.currentTime) return; // Skip if in the past
        try {
            const osc = c.createOscillator();
            const env = c.createGain();
            osc.type = waveform;
            osc.frequency.setValueAtTime(freq, time);
            env.gain.setValueAtTime(vol, time);
            env.gain.exponentialRampToValueAtTime(0.001, time + duration);
            osc.connect(env);
            env.connect(gainNode);
            osc.start(time);
            osc.stop(time + duration + 0.01);
        } catch (e) { /* ignore scheduling errors */ }
    }

    function stopSong() {
        if (beatInterval) {
            clearInterval(beatInterval);
            beatInterval = null;
        }
        beatIndex = 0;
        beatCallback = null;
    }

    function getBeatIndex() { return beatIndex; }
    function getBPM() { return currentBPM; }

    // === TTS ===
    function speak(text) {
        if (!settings.voice) return;
        try {
            // Duck music while speaking
            if (musicGain) {
                musicGain.gain.linearRampToValueAtTime(0.1, _getCtx().currentTime + 0.3);
            }
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.85;
            u.pitch = 1.1;
            u.onend = () => {
                if (musicGain) {
                    musicGain.gain.linearRampToValueAtTime(MUSIC_VOL, _getCtx().currentTime + 0.3);
                }
            };
            speechSynthesis.cancel();
            speechSynthesis.speak(u);
        } catch (e) { /* ignore TTS failures */ }
    }

    function setSettings(s) { Object.assign(settings, s); }

    return {
        unlock, _getCtx,
        perfectHit, greatHit, okHit, miss, comboBreak, comboMilestone,
        countdown, countdownGo, songComplete, speak,
        startSong, stopSong, getBeatIndex, getBPM,
        setSettings, SCALE, NOTES_ARR
    };
})();
