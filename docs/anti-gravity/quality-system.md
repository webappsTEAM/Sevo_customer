# Anti-Gravity Quality & Performance System Specification

## 1. Quality Presets
The system scales physics fidelity, particle counts, and telemetry sample rates dynamically across 4 presets:

| Setting | LOW | MEDIUM | HIGH | ULTRA |
| :--- | :--- | :--- | :--- | :--- |
| **Physics Timestep** | 0.033s (30 Hz) | 0.020s (50 Hz) | 0.016s (60 Hz) | 0.008s (120 Hz) |
| **Solver Iterations** | 4 | 6 | 10 | 16 |
| **Particle Multiplier** | 0.25x | 0.6x | 1.0x | 1.5x |
| **Culling Distance** | 25m | 50m | 100m | 200m |
| **Shadows** | Disabled | Enabled | Enabled | Enabled |
| **Telemetry Rate** | 5 Hz | 15 Hz | 30 Hz | 60 Hz |

## 2. Hardware Detection
`QualityProfileResolver.detectHardwareRecommendation(info)` inspects CPU core counts, RAM availability, and mobile platform flags to select the ideal default preset while supporting manual user overrides.
