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
        if (!settings.music) {
            // Still fire beat callbacks for note timing even without music
            beatCallback = onBeat;
            currentBPM = song.bpm;
            beatIndex = 0;
            const interval = 60000 / song.bpm;
            beatInterval = setInterval(() => {
                if (beatCallback) beatCallback(beatIndex);
                beatIndex++;
            }, interval);
            return;
        }

        const c = _getCtx();
        currentSongMelody = song.melody || [];
        currentSongBass = song.bass || [];
        currentBPM = song.bpm;
        beatIndex = 0;
        beatCallback = onBeat;

        const interval = 60000 / song.bpm;

        beatInterval = setInterval(() => {
            // Play melody note
            if (currentSongMelody.length > 0) {
                const freq = currentSongMelody[beatIndex % currentSongMelody.length];
                if (freq > 0) {
                    _makeNote(freq, interval / 1200, 'square', musicGain, 0.15);
                }
            }

            // Play bass note (every other beat)
            if (beatIndex % 2 === 0 && currentSongBass.length > 0) {
                const bassFreq = currentSongBass[Math.floor(beatIndex / 2) % currentSongBass.length];
                if (bassFreq > 0) {
                    _makeNote(bassFreq, interval / 800, 'triangle', musicGain, 0.2);
                }
            }

            // Drum pattern: kick on 1 and 3, snare on 2 and 4, hi-hat on every beat
            const beatInBar = beatIndex % 4;
            if (beatInBar === 0 || beatInBar === 2) {
                // Kick drum: low sine with fast pitch drop
                _makeNote(80, 0.12, 'sine', musicGain, 0.3);
                setTimeout(() => _makeNote(40, 0.06, 'sine', musicGain, 0.2), 10);
            }
            if (beatInBar === 1 || beatInBar === 3) {
                // Snare: noise-like burst (high freq short square)
                _makeNote(200, 0.06, 'square', musicGain, 0.12);
                _makeNote(400 + Math.random() * 200, 0.04, 'sawtooth', musicGain, 0.08);
            }
            // Hi-hat: high frequency click on every beat
            _makeNote(6000 + Math.random() * 3000, 0.02, 'square', musicGain, 0.04);
            // Open hi-hat on the "and" (between beats)
            if (beatInBar === 1) {
                setTimeout(() => {
                    _makeNote(8000, 0.05, 'square', musicGain, 0.03);
                }, 60000 / currentBPM / 2);
            }

            // Fire beat callback for note spawning
            if (beatCallback) beatCallback(beatIndex);
            beatIndex++;
        }, interval);
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
