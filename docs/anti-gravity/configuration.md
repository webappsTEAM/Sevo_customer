# Anti-Gravity Configuration Specification

## 1. Schema Hierarchy
The configuration is organized into functional slices under a root object:

```json
{
  "id": "config-default",
  "version": "1.0.0",
  "schemaVersion": 2,
  "physics": {
    "gravityStrength": 9.81,
    "gravityDirection": { "x": 0, "y": -1, "z": 0 },
    "forceMultiplier": 1.0,
    "acceleration": 15.0,
    "maxForce": 5000.0,
    "massMultiplier": 1.0,
    "damping": 0.05,
    "activationThreshold": 0.15,
    "overloadThreshold": 90.0,
    "coordinateSpace": "WORLD"
  },
  "visual": {
    "particleCount": 250,
    "particleLifetime": 2.0,
    "lightIntensity": 1.2,
    "lightRange": 10.0,
    "colorGradient": {
      "idle": "#3b82f6",
      "activating": "#60a5fa",
      "active": "#00f2fe",
      "deactivating": "#93c5fd",
      "overloaded": "#ef4444"
    }
  },
  "audio": {
    "volume": 0.8,
    "minPitch": 0.7,
    "pitchRange": 0.8,
    "clips": {
      "activate": "sfx_ag_activate",
      "activeLoop": "sfx_ag_active_loop",
      "deactivate": "sfx_ag_deactivate",
      "overload": "sfx_ag_overload"
    }
  },
  "collision": {
    "layerMask": 4294967295,
    "affectedTags": ["Interactable", "DynamicPhysics", "Vehicle"],
    "excludedTags": ["StaticScenery", "Unmovable"],
    "collisionResponse": "REPULSE"
  },
  "quality": {
    "activePreset": "HIGH"
  }
}
```

## 2. Validation Constraints
- `gravityStrength` must be $\ge 0$.
- `gravityDirection` must not be a zero vector.
- `massMultiplier` must be $> 0$.
- `activationThreshold` must be $< overloadThreshold$.
- `damping` must be between $0.0$ and $1.0$.
- `volume` must be between $0.0$ and $1.0$.

## 3. Hot Reload Mechanics
1. Incoming payload received via API or file watcher.
2. Migrated to the latest schema version if necessary.
3. Validated by `ConfigurationValidator`.
4. If valid, applied atomically to `activeConfig` and `AntiGravityConfigurationChanged` emitted.
5. If invalid, rejected with diagnostics and previous snapshot retained.
