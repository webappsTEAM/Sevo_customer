# Anti-Gravity Testing Specification

## 1. Automated Test Framework
The test runner (`src/anti-gravity/tests/run_all_tests.js`) validates all subsystems across 4 test categories:

1. **Unit Tests**:
   - Configuration validation and schema versioning.
   - Vector3D mathematical operations.
   - Mass calculation strategies.
   - Action rebinding.
   - Collision filtering logic.
   - State machine transitions.
   - Audio intensity pitch calculation.
   - Quality presets and hardware recommendation.
   - Diagnostics and CLI commands.

2. **Integration Tests**:
   - End-to-end frame tick lifecycle.
   - Input trigger through state transition to physics force application and VFX updates.

3. **Failure & Rollback Tests**:
   - Hot-reload rollback on corrupt payload injection.
   - Safe fallback activation.

4. **Performance Benchmarks**:
   - 1,000 tick throughput measurement (sub-millisecond target per tick).

## 2. Running Automated Tests
```bash
node src/anti-gravity/tests/run_all_tests.js
```
