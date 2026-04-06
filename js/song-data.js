/* ============================================
   RHYTHM BLAST — Song Data
   3 MVP songs with note charts and melodies
   ============================================ */
const SongData = (() => {
    const S = Audio.SCALE;

    const songs = [
        {
            id: 'turbo-start',
            name: 'Turbo Start',
            album: 'starter-beats',
            bpm: 100,
            difficulty: 1,
            starsRequired: 0,
            emoji: '🏎️',
            bannerClass: 'banner-highway',
            themes: ['cars', 'neon'],
            topics: { math: ['counting', 'numbers'], reading: ['letters'] },
            // C major pentatonic melody (simple, catchy)
            melody: [
                S.C4, S.E4, S.G4, S.E4, S.C4, S.D4, S.E4, 0,
                S.G4, S.A4, S.G4, S.E4, S.D4, S.C4, S.D4, 0
            ],
            bass: [S.C4/2, S.C4/2, S.G4/2, S.G4/2, S.A4/2, S.A4/2, S.G4/2, S.G4/2],
            // Note chart: when and what type of educational note appears
            // Denser note chart: notes every 3 beats, ~20 total
            noteChart: [
                { beat: 3,  type: 'identify', topic: 'reading:letters' },
                { beat: 6,  type: 'identify', topic: 'math:counting' },
                { beat: 9,  type: 'identify', topic: 'reading:letters' },
                { beat: 12, type: 'identify', topic: 'math:counting' },
                { beat: 15, type: 'identify', topic: 'reading:letters' },
                { beat: 18, type: 'sequence', topic: 'math:counting', length: 3 },
                { beat: 24, type: 'identify', topic: 'reading:letters' },
                { beat: 27, type: 'identify', topic: 'math:numbers' },
                { beat: 30, type: 'identify', topic: 'reading:letters' },
                { beat: 33, type: 'sequence', topic: 'math:counting', length: 3 },
                { beat: 39, type: 'identify', topic: 'reading:letters' },
                { beat: 42, type: 'identify', topic: 'math:counting' },
                { beat: 45, type: 'identify', topic: 'reading:letters' },
                { beat: 48, type: 'identify', topic: 'math:numbers' },
                { beat: 51, type: 'identify', topic: 'math:counting' },
                { beat: 54, type: 'sequence', topic: 'math:counting', length: 3 },
                { beat: 60, type: 'identify', topic: 'reading:letters' },
                { beat: 63, type: 'identify', topic: 'math:counting' },
                { beat: 66, type: 'identify', topic: 'reading:letters' },
                { beat: 69, type: 'identify', topic: 'math:counting' }
            ]
        },
        {
            id: 'home-run-hero',
            name: 'Home Run Hero',
            album: 'starter-beats',
            bpm: 110,
            difficulty: 2,
            starsRequired: 4,
            emoji: '⚾',
            bannerClass: 'banner-stadium',
            themes: ['baseball', 'sports'],
            topics: { math: ['addition', 'counting'], reading: ['sight-words'] },
            melody: [
                S.G4, S.A4, S.C5, S.A4, S.G4, 0, S.E4, S.G4,
                S.A4, S.C5, S.D5, S.C5, S.A4, S.G4, 0, 0
            ],
            bass: [S.C4/2, S.E4/2, S.G4/2, S.E4/2, S.A4/2, S.G4/2, S.C4/2, S.C4/2],
            noteChart: [
                { beat: 4,  type: 'identify', topic: 'reading:sight-words' },
                { beat: 8,  type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 14, type: 'identify', topic: 'reading:sight-words' },
                { beat: 18, type: 'identify', topic: 'math:counting' },
                { beat: 22, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 28, type: 'identify', topic: 'reading:sight-words' },
                { beat: 32, type: 'identify', topic: 'math:counting' },
                { beat: 36, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 42, type: 'identify', topic: 'reading:sight-words' },
                { beat: 46, type: 'identify', topic: 'reading:sight-words' },
                { beat: 50, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 56, type: 'identify', topic: 'math:counting' },
                { beat: 60, type: 'identify', topic: 'reading:sight-words' },
                { beat: 64, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 70, type: 'identify', topic: 'reading:sight-words' },
                { beat: 74, type: 'identify', topic: 'math:counting' },
                { beat: 78, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 84, type: 'identify', topic: 'reading:sight-words' }
            ]
        },
        {
            id: 'hyrule-beats',
            name: 'Hyrule Beats',
            album: 'starter-beats',
            bpm: 120,
            difficulty: 3,
            starsRequired: 10,
            emoji: '🗡️',
            bannerClass: 'banner-hyrule',
            themes: ['zelda', 'adventure'],
            topics: { math: ['addition', 'patterns'], reading: ['sight-words', 'letters'] },
            // Zelda-inspired melody (adventurous, ascending)
            melody: [
                S.E4, S.G4, S.A4, S.C5, S.D5, S.C5, S.A4, S.G4,
                S.E4, S.G4, S.C5, S.D5, S.E5, S.D5, S.C5, S.A4,
                S.G4, S.A4, S.C5, S.E5, S.D5, S.C5, S.A4, S.G4,
                S.E4, 0, S.G4, S.A4, S.C5, S.D5, S.E5, 0
            ],
            bass: [
                S.C4/2, S.C4/2, S.G4/2, S.G4/2, S.A4/2, S.A4/2, S.E4/2, S.E4/2,
                S.C4/2, S.C4/2, S.G4/2, S.G4/2, S.A4/2, S.E4/2, S.C4/2, S.C4/2
            ],
            noteChart: [
                { beat: 4,  type: 'identify', topic: 'reading:letters' },
                { beat: 8,  type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 14, type: 'identify', topic: 'reading:sight-words' },
                { beat: 18, type: 'identify', topic: 'math:patterns' },
                { beat: 22, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 28, type: 'identify', topic: 'reading:sight-words' },
                { beat: 32, type: 'identify', topic: 'reading:letters' },
                { beat: 36, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 42, type: 'identify', topic: 'reading:sight-words' },
                { beat: 46, type: 'identify', topic: 'math:patterns' },
                { beat: 50, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 56, type: 'identify', topic: 'reading:letters' },
                { beat: 60, type: 'identify', topic: 'reading:sight-words' },
                { beat: 64, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 70, type: 'identify', topic: 'math:patterns' },
                { beat: 74, type: 'identify', topic: 'reading:sight-words' },
                { beat: 78, type: 'sequence', topic: 'math:addition', length: 3 },
                { beat: 84, type: 'identify', topic: 'reading:letters' },
                { beat: 88, type: 'identify', topic: 'reading:sight-words' },
                { beat: 92, type: 'sequence', topic: 'math:addition', length: 3 }
            ]
        }
    ];

    function getSong(id) {
        return songs.find(s => s.id === id);
    }

    function getAllSongs() {
        return songs;
    }

    function getUnlockedSongs(totalStars) {
        return songs.filter(s => totalStars >= s.starsRequired);
    }

    return { getSong, getAllSongs, getUnlockedSongs };
})();
