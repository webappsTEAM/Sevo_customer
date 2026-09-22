# Anti-Gravity Integration Adapters Specification

## 1. Decoupled Service Adapters

### Persistence Adapter (`IAntiGravityPersistence`)
- Decoupled from `PlayerPrefs`, local SQLite, and cloud databases.
- Serializes and deserializes user unlock state and custom field profiles.

### Achievement Adapter (`IAntiGravityAchievementAdapter`)
- Bridges anti-gravity milestones (`ACH_FIRST_ACTIVATION`, `ACH_OVERLOAD_SURVIVOR`, `ACH_MAX_INTENSITY`) to platform SDKs (Steamworks, Xbox Live, PSN, Game Center).

### Analytics Adapter (`IAntiGravityAnalyticsAdapter`)
- Captures `state_changed`, `config_changed`, and `fallback_activated` events without coupling to Google Analytics, Mixpanel, or telemetry endpoints.

### Multiplayer / Network Adapter (`IAntiGravityNetworkAdapter`)
- Replicates state, field intensity, directional vectors, and configuration version hash over UDP/WebSockets without contaminating core physics logic.
