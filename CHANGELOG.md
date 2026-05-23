# Changelog

All notable changes to Rhythm Blast will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to incrementing service-worker cache versions on each release.

## [SW v29] — 2026-05-23

### Added
- Full mix-bus rebuild: drum / melody / bass / pad feed into a music bus, then reverb, glue compressor, and brick-wall limiter
- Sidechain ducking so music drops under voice cues
- 2 new songs: Royal Waltz and Midnight Jazz
- Color-blind-friendly lane shapes (square / circle / triangle in addition to color)
- Streak celebrations at 3, 5, and 10+
- Drops a Creature Cards pack on 3-star song completion (cross-game reward)
- Structured accessibility and analytics pass

### Changed
- SES / lockdown hardening: inline PWA bootstrap moved into `main.js`, AudioContext wrapped in try/catch
- SFX now scheduled against `AudioContext.currentTime` for sample-accurate timing
- Lane forgiveness widened to ±120px for Fire tablet finger size
- Music master volume reduced from 0.3 to 0.2 so SFX and voice ride above it
- Question overlay made fully opaque to stop lane notes bleeding through

### Fixed
- Particle cap added for Fire 7 to keep frame time under budget
- Gentler miss feedback so a wrong tap does not feel punishing
