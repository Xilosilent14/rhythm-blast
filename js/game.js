/* ============================================
   RHYTHM BLAST — Core Game Engine
   Note falling, hit detection, scoring, canvas rendering
   ============================================ */
const Game = (() => {
    let canvas, ctx;
    let W, H;
    let running = false;
    let animId = null;

    // Lane config
    const LANES = 3;
    const LANE_COLORS = ['#22d3ee', '#a855f7', '#ec4899']; // cyan, purple, magenta
    const LANE_GLOW = ['rgba(34,211,238,0.3)', 'rgba(168,85,247,0.3)', 'rgba(236,72,153,0.3)'];
    let laneWidth = 0;
    let laneXs = [];
    let hitZoneY = 0;
    const HIT_ZONE_HEIGHT = 8;

    // Notes
    let activeNotes = []; // Currently visible on screen
    let noteQueue = []; // Generated but not yet spawned
    let noteSpeed = 0; // pixels per frame
    const SPAWN_Y = -60; // Above screen

    // Timing windows (ms)
    const PERFECT_WINDOW = 120;
    const GREAT_WINDOW = 250;
    const OK_WINDOW = 400;

    // Song state
    let currentSong = null;
    let songBeatDuration = 0; // ms per beat
    let songStartTime = 0;
    let beatsElapsed = 0;
    let lastBeatProcessed = -1;

    // Scoring
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let totalNotes = 0;
    let perfects = 0;
    let greats = 0;
    let oks = 0;
    let misses = 0;
    let noteResults = []; // For ecosystem tracking

    // Visual effects
    let particles = [];
    let screenShake = 0;
    let hitFeedbackEl = null;
    let hitFeedbackTimer = 0;
    let bgHue = 240; // slowly shifting background

    // Beat pulse
    let beatPulse = 0;

    // Callbacks
    let onSongEnd = null;

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        hitFeedbackEl = document.getElementById('hit-feedback');
        _resize();
        window.addEventListener('resize', _resize);
    }

    function _resize() {
        W = canvas.parentElement.offsetWidth || 1024;
        H = canvas.parentElement.offsetHeight || 600;
        canvas.width = W;
        canvas.height = H;

        // Lane geometry
        const totalLaneWidth = W * 0.5; // lanes take center 50% of screen
        laneWidth = totalLaneWidth / LANES;
        const laneStart = (W - totalLaneWidth) / 2;
        laneXs = [];
        for (let i = 0; i < LANES; i++) {
            laneXs.push(laneStart + laneWidth * i + laneWidth / 2);
        }
        hitZoneY = H * 0.82;
    }

    function startSong(song, endCallback) {
        currentSong = song;
        onSongEnd = endCallback;
        songBeatDuration = 60000 / song.bpm;

        // Calculate note speed: notes should take ~3 seconds to fall from spawn to hit zone
        // Slower = more visible and easier for a 6-year-old to react
        const fallDistance = hitZoneY - SPAWN_Y;
        const fallFrames = (3000 / (1000 / 60)); // 3 seconds at 60fps
        noteSpeed = fallDistance / fallFrames;

        // Reset state
        score = 0;
        combo = 0;
        maxCombo = 0;
        totalNotes = 0;
        perfects = 0;
        greats = 0;
        oks = 0;
        misses = 0;
        noteResults = [];
        activeNotes = [];
        particles = [];
        screenShake = 0;
        beatPulse = 0;
        beatsElapsed = 0;
        lastBeatProcessed = -1;

        // Generate all notes from chart
        noteQueue = [];
        const level = Progress.getLevel ? Progress.getLevel() : 0;
        song.noteChart.forEach(entry => {
            const { notes, ttsText } = NoteGenerator.fromChartEntry(entry, level);
            notes.forEach(n => {
                noteQueue.push({
                    ...n,
                    y: SPAWN_Y,
                    spawned: false,
                    hit: false,
                    missed: false,
                    spawnBeat: Math.max(0, n.hitBeat - Math.round(3000 / songBeatDuration)), // spawn 3s before hit
                    alpha: 1
                });
                // Only count notes the player is expected to tap
                if (n.type !== 'sequence-lead' && n.isCorrect !== false) totalNotes++;
            });
            // Schedule TTS for reading notes
            if (ttsText && notes[0]) {
                const ttsNote = notes[0];
                const ttsBeat = ttsNote.hitBeat - Math.round(4000 / songBeatDuration); // speak 4s before (1s before note appears)
                noteQueue.push({
                    _tts: true,
                    text: ttsText,
                    spawnBeat: Math.max(0, ttsBeat),
                    hitBeat: ttsBeat,
                    spawned: false
                });
            }
        });

        songStartTime = Date.now();
        running = true;

        // Start audio
        Audio.startSong(song, _onBeat);

        // Start game loop
        _loop();
    }

    function _onBeat(beatIdx) {
        beatsElapsed = beatIdx;
        beatPulse = 1.0;

        // Spawn notes that are due this beat
        noteQueue.forEach(n => {
            if (!n.spawned && beatIdx >= n.spawnBeat) {
                n.spawned = true;
                if (n._tts) {
                    Audio.speak(n.text);
                } else {
                    n.y = SPAWN_Y;
                    activeNotes.push(n);
                }
            }
        });
    }

    function stop() {
        running = false;
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
        Audio.stopSong();
    }

    function pause() {
        running = false;
        Audio.stopSong();
    }

    function resume() {
        if (!currentSong) return;
        running = true;
        Audio.startSong(currentSong, _onBeat);
        _loop();
    }

    function _loop() {
        if (!running) return;
        _update();
        _render();
        animId = requestAnimationFrame(_loop);
    }

    function _update() {
        // Move notes down
        activeNotes.forEach(n => {
            if (!n.hit && !n.missed) {
                n.y += noteSpeed;
            }
            // Fade hit/missed notes
            if (n.hit || n.missed) {
                n.alpha -= 0.08;
            }
        });

        // Check for missed notes (passed hit zone by too much)
        activeNotes.forEach(n => {
            if (!n.hit && !n.missed && n.y > hitZoneY + 60) {
                n.missed = true;
                if (n.type === 'sequence-lead') return; // lead notes auto-pass
                if (n.type === 'sequence-answer' && !n.isCorrect) return; // wrong answer in sequence, don't count
                misses++;
                if (combo > 0) Audio.comboBreak();
                combo = 0;
                _showFeedback('MISS', '#e74c3c');
            }
        });

        // Remove dead notes
        activeNotes = activeNotes.filter(n => n.alpha > 0);

        // Update particles
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.life -= 0.02;
            return p.life > 0;
        });

        // Decay effects
        if (beatPulse > 0) beatPulse -= 0.05;
        if (screenShake > 0) screenShake *= 0.9;
        if (hitFeedbackTimer > 0) {
            hitFeedbackTimer--;
            if (hitFeedbackTimer <= 0 && hitFeedbackEl) {
                hitFeedbackEl.classList.remove('show');
            }
        }

        // Shift background hue slowly
        bgHue = (bgHue + 0.05) % 360;

        // Check if song is done
        if (noteQueue.length > 0) {
            const allSpawned = noteQueue.every(n => n.spawned);
            const nonTtsNotes = noteQueue.filter(n => !n._tts);
            const lastNoteBeat = nonTtsNotes.length > 0 ? Math.max(...nonTtsNotes.map(n => n.hitBeat)) : 0;
            const songDone = allSpawned && activeNotes.length === 0 && beatsElapsed > lastNoteBeat + 5;
            if (songDone) {
                _endSong();
            }
        }
    }

    function _render() {
        const shakeX = screenShake > 0.5 ? (Math.random() - 0.5) * screenShake * 4 : 0;
        const shakeY = screenShake > 0.5 ? (Math.random() - 0.5) * screenShake * 3 : 0;

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Background
        _drawBackground();

        // Lane glow
        _drawLanes();

        // Hit zone
        _drawHitZone();

        // Notes
        activeNotes.forEach(n => _drawNote(n));

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        ctx.restore();
    }

    function _drawBackground() {
        // Dark gradient with subtle color shift
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, `hsl(${bgHue}, 30%, 8%)`);
        grad.addColorStop(0.5, '#1a1a2e');
        grad.addColorStop(1, `hsl(${(bgHue + 30) % 360}, 25%, 10%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Starfield (more stars, twinkling)
        for (let i = 0; i < 50; i++) {
            const sx = (i * 137.5 + beatsElapsed * 0.2) % W;
            const sy = (i * 97.3 + i * i * 3.7) % (H * 0.65);
            const ss = 0.5 + (i % 3) * 0.5;
            const twinkle = 0.15 + Math.sin(beatsElapsed * 0.1 + i * 2.3) * 0.15;
            ctx.fillStyle = `rgba(255,255,255,${twinkle + 0.1})`;
            ctx.fillRect(sx, sy, ss, ss);
        }

        // Horizontal scan line effect (subtle)
        const scanY = (beatsElapsed * 2) % H;
        ctx.fillStyle = 'rgba(168,85,247,0.03)';
        ctx.fillRect(0, scanY, W, 2);
    }

    function _drawLanes() {
        for (let i = 0; i < LANES; i++) {
            const x = laneXs[i] - laneWidth / 2;
            // Lane background strip
            const laneAlpha = 0.06 + beatPulse * 0.04;
            ctx.fillStyle = LANE_GLOW[i].replace('0.3', String(laneAlpha));
            ctx.fillRect(x, 0, laneWidth, H);

            // Lane border lines
            ctx.strokeStyle = `rgba(255,255,255,0.08)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
    }

    function _drawHitZone() {
        const pulse = 1 + beatPulse * 0.3;
        const totalLaneWidth = laneWidth * LANES;
        const laneStart = laneXs[0] - laneWidth / 2;

        // Glow
        ctx.shadowColor = 'rgba(168,85,247,0.5)';
        ctx.shadowBlur = 10 * pulse;
        ctx.fillStyle = `rgba(168,85,247,${0.4 + beatPulse * 0.3})`;
        ctx.fillRect(laneStart, hitZoneY - HIT_ZONE_HEIGHT / 2, totalLaneWidth, HIT_ZONE_HEIGHT * pulse);
        ctx.shadowBlur = 0;

        // Lane target circles
        for (let i = 0; i < LANES; i++) {
            ctx.strokeStyle = LANE_COLORS[i];
            ctx.lineWidth = 2 + beatPulse * 1;
            ctx.globalAlpha = 0.4 + beatPulse * 0.3;
            ctx.beginPath();
            ctx.arc(laneXs[i], hitZoneY, 20 + beatPulse * 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    function _drawNote(note) {
        if (note._tts) return;
        const x = laneXs[note.lane];
        const y = note.y;
        const color = LANE_COLORS[note.lane];
        const isLead = note.type === 'sequence-lead';
        const radius = isLead ? 24 : 36; // Large notes for kids (72px+ touch target)

        ctx.globalAlpha = note.alpha;

        // Trailing particles behind note as it falls
        if (!note.hit && !note.missed && !isLead && Math.random() < 0.3) {
            particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + radius,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.5,
                color: color,
                size: 1.5 + Math.random() * 1.5,
                life: 0.3 + Math.random() * 0.2
            });
        }

        // Note glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 15 + beatPulse * 8;

        // Note body
        ctx.fillStyle = isLead ? 'rgba(255,255,255,0.15)' : color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle
        ctx.fillStyle = isLead ? 'rgba(255,255,255,0.3)' : '#1a1a2e';
        ctx.beginPath();
        ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Text on note
        ctx.fillStyle = isLead ? 'rgba(255,255,255,0.6)' : '#fff';
        ctx.font = `bold ${isLead ? 14 : 20}px 'Fredoka One', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayText = note.text.length > 6 ? note.text.substring(0, 6) : note.text;
        ctx.fillText(displayText, x, y);

        // Hit feedback glow on correct hit
        if (note.hit) {
            ctx.fillStyle = `rgba(46,204,113,${note.alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    // === INPUT HANDLING ===
    function handleTap(x, y) {
        if (!running) return;

        // Determine which lane was tapped
        let tappedLane = -1;
        for (let i = 0; i < LANES; i++) {
            const lx = laneXs[i] - laneWidth / 2;
            if (x >= lx && x < lx + laneWidth) {
                tappedLane = i;
                break;
            }
        }
        if (tappedLane === -1) return;

        // Find closest unhit note in this lane near the hit zone
        let closestNote = null;
        let closestDist = Infinity;

        activeNotes.forEach(n => {
            if (n.hit || n.missed || n.lane !== tappedLane || n._tts) return;
            if (n.type === 'sequence-lead') {
                // Auto-pass lead notes when tapped (guard against double-hit)
                if (n.hit) return;
                const dist = Math.abs(n.y - hitZoneY);
                if (dist < OK_WINDOW / (1000 / 60) * noteSpeed + 40) {
                    n.hit = true;
                    _spawnParticles(laneXs[n.lane], hitZoneY, LANE_COLORS[n.lane], 5);
                }
                return;
            }
            const dist = Math.abs(n.y - hitZoneY);
            if (dist < closestDist) {
                closestDist = dist;
                closestNote = n;
            }
        });

        if (!closestNote) return;

        // Check timing (convert pixel distance to time)
        const pixelDist = Math.abs(closestNote.y - hitZoneY);
        const timeDist = (pixelDist / noteSpeed) * (1000 / 60); // convert to ms

        if (timeDist > OK_WINDOW) return; // Too far, ignore tap

        if (closestNote.isCorrect) {
            closestNote.hit = true;
            let points = 0;
            let label = '';
            let color = '';

            if (timeDist <= PERFECT_WINDOW) {
                points = 100;
                label = 'PERFECT!';
                color = '#ffd700';
                perfects++;
                Audio.perfectHit();
                screenShake = 2;
                _spawnParticles(laneXs[closestNote.lane], hitZoneY, '#ffd700', 20);
            } else if (timeDist <= GREAT_WINDOW) {
                points = 75;
                label = 'GREAT!';
                color = '#a855f7';
                greats++;
                Audio.greatHit();
                _spawnParticles(laneXs[closestNote.lane], hitZoneY, LANE_COLORS[closestNote.lane], 12);
            } else {
                points = 50;
                label = 'OK';
                color = '#22d3ee';
                oks++;
                Audio.okHit();
                _spawnParticles(laneXs[closestNote.lane], hitZoneY, LANE_COLORS[closestNote.lane], 6);
            }

            combo++;
            if (combo > maxCombo) maxCombo = combo;

            // Combo multiplier
            let multiplier = 1;
            if (combo >= 20) multiplier = 3;
            else if (combo >= 10) multiplier = 2;
            else if (combo >= 5) multiplier = 1.5;

            points = Math.round(points * multiplier);
            score += points;

            if (combo === 5 || combo === 10 || combo === 20) {
                Audio.comboMilestone();
                screenShake = 4;
            }

            _showFeedback(label + (combo >= 5 ? ` ${combo}x` : ''), color);

            // Track for ecosystem
            noteResults.push({
                topic: closestNote.domain === 'math' ? 'math' : 'reading',
                correct: true
            });
        } else {
            // Wrong answer
            closestNote.hit = true; // Remove it
            misses++;
            if (combo > 0) Audio.comboBreak();
            combo = 0;
            Audio.miss();
            _showFeedback('WRONG', '#e74c3c');

            noteResults.push({
                topic: closestNote.domain === 'math' ? 'math' : 'reading',
                correct: false
            });
        }

        // Update HUD
        document.getElementById('hud-score').textContent = score;
        document.getElementById('hud-combo').textContent = combo >= 3 ? `${combo}x COMBO` : '';
    }

    function _showFeedback(text, color) {
        if (!hitFeedbackEl) return;
        hitFeedbackEl.textContent = text;
        hitFeedbackEl.style.color = color;
        hitFeedbackEl.classList.remove('show');
        void hitFeedbackEl.offsetWidth; // force reflow
        hitFeedbackEl.classList.add('show');
        hitFeedbackTimer = 30; // ~0.5s at 60fps
    }

    function _spawnParticles(x, y, color, count) {
        if (particles.length > 400) return; // Performance cap
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 5 - 2,
                color,
                size: 2 + Math.random() * 3,
                life: 0.6 + Math.random() * 0.4
            });
        }
    }

    function _endSong() {
        stop();
        Audio.songComplete();

        const accuracy = totalNotes > 0 ? (perfects + greats + oks) / totalNotes : 0;
        const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.5 ? 1 : 0;
        const grade = accuracy >= 0.95 ? 'S' : accuracy >= 0.85 ? 'A' : accuracy >= 0.7 ? 'B' : accuracy >= 0.5 ? 'C' : 'D';

        // XP calculation
        const baseXP = Math.round(score / 10);
        const starBonus = stars * 5;
        const xpEarned = baseXP + starBonus;

        // Ecosystem tracking
        if (typeof OTBEcosystem !== 'undefined') {
            OTBEcosystem.addXP(xpEarned, 'rhythm-blast');
            OTBEcosystem.addCoins(stars, 'rhythm-blast');
            noteResults.forEach(r => {
                OTBEcosystem.recordAnswer(
                    r.topic === 'math' ? 'rhythm-math' : 'rhythm-reading',
                    r.topic,
                    r.correct,
                    0,
                    'rhythm-blast'
                );
            });
        }

        if (onSongEnd) {
            onSongEnd({
                songId: currentSong.id,
                score, accuracy, stars, grade, xpEarned,
                perfects, greats, oks, misses,
                maxCombo, totalNotes, combo: maxCombo
            });
        }
    }

    function getScore() { return score; }
    function getCombo() { return combo; }

    return {
        init, startSong, stop, pause, resume,
        handleTap, getScore, getCombo
    };
})();
