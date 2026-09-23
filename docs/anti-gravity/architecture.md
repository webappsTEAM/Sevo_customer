# Anti-Gravity Architecture Documentation

## 1. System Philosophy
The **Anti-Gravity System** is engineered as a decoupled, configuration-driven, hot-reloadable, and testable platform. It completely isolates gameplay calculations from physical constants, platform SDKs, audio engines, rendering pipelines, and input hardware.

## 2. Component Topology
```
                     +---------------------------------------+
                     |    Configuration Provider & Schema    |
                     |  (Versioning, Validation, Fallback)   |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |          AntiGravityEngine            |
                     |       (IoC Container / DI Hub)        |
                     +---+-------+-------+-------+-------+---+
                         |       |       |       |       |
      +------------------+   +---+---+   |   +---+---+   +------------------+
      |                      |       |   |   |       |                      |
      v                      v       v   v   v       v                      v
+------------+        +-----------+ +---------+ +----------+        +-------------+
| State      |        | Physics   | | Input   | | Collision|        | Quality     |
| Machine    |        | & Mass    | | Provider| | Filter   |        | Resolver    |
| (5 States) |        | Engine    | | Actions | | & Mask   |        | Presets     |
+-----+------+        +-----+-----+ +----+----+ +----+-----+        +------+------+
      |                     |            |           |                     |
      +---------------------+------------+-----------+---------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |    Strongly-Typed Event Bus & Telemetry|
                     +---+---------------+---------------+---+
                         |               |               |
                         v               v               v
                   +-----------+   +-----------+   +-----------+
                   | Visual    |   | Audio     |   | External  |
                   | Controller|   | Controller|   | Adapters  |
                   +-----------+   +-----------+   +-----------+
```

## 3. Core Design Tenets
1. **Zero Embedded Magic Numbers**: All forces, directions, masses, thresholds, dampings, and colors originate from dynamic configuration snapshots.
2. **Atomic Hot-Reloading**: Config updates are validated before application; malformed payloads trigger immediate rollback and alert telemetry.
3. **Safe Default Fallbacks**: When external sources fail, a validated default profile keeps systems operational.
4. **Interface Isolation**: External systems (Audio, Save, Achievements, Network) integrate exclusively via swap-friendly interfaces.
