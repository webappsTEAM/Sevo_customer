# Anti-Gravity Diagnostics, Observability & CLI Specification

## 1. Observability API
The diagnostics subsystem provides non-intrusive runtime introspection via `IAntiGravityDiagnostics`.

## 2. Developer Console Commands
- `anti_gravity.debug on|off`: Toggle debug telemetry and force gizmo drawing.
- `anti_gravity.force_visualization on|off`: Toggle 3D vector arrows in debug viewport.
- `anti_gravity.telemetry on|off`: Toggle runtime metrics aggregation.
- `anti_gravity.config reload`: Force a re-evaluation and hot-reload of active configuration.
- `anti_gravity.config dump`: Output active JSON configuration snapshot.
- `anti_gravity.state`: Query current state, intensity percentage, and active state timer.
- `anti_gravity.performance`: Output rolling average execution latencies (Physics, VFX, Audio).
