# Anti-Gravity Audio Middleware Specification

## 1. Overview
The audio subsystem is decoupled from concrete audio engines (Unity AudioSource, FMOD Studio, Wwise, Web Audio API) through the `IAudioAdapter` interface.

## 2. Dynamic Pitch Formula
$$\text{Pitch} = \text{config.audio.minPitch} + I(t) \cdot \text{config.audio.pitchRange}$$

## 3. State-Triggered Audio Events
- `ANTI_GRAVITY_ACTIVATE`: Play spin-up transient sound clip.
- `ANTI_GRAVITY_ACTIVE`: Loop continuous humming drone with intensity-modulated pitch and volume.
- `ANTI_GRAVITY_DEACTIVATE`: Play spin-down sound clip.
- `ANTI_GRAVITY_OVERLOAD`: Play warning alarm / burst overload sound clip.
- `ANTI_GRAVITY_AMBIENT`: Idle ambient pulse.
