# Anti-Gravity Migration Guide

## 1. Migration from Legacy Hardcoded Systems

### Step 1: Replace Hardcoded Constants
- **Before**: `const GRAVITY = 9.81; const FORCE_MULT = 1.5;`
- **After**: Query via `configProvider.getPhysicsConfiguration().gravityStrength` and `.forceMultiplier`.

### Step 2: Replace Direct Input Queries
- **Before**: `if (Input.GetKey("Space")) { ... }`
- **After**: `if (inputProvider.isActionActive('activate')) { ... }`

### Step 3: Replace Hardcoded Tag/Layer Checks
- **Before**: `if (entity.tag === "Player" && entity.layer === 8) { ... }`
- **After**: `if (collisionFilter.shouldAffect(entity)) { ... }`

### Step 4: Schema Version Upgrades
- Legacy Schema v1 configurations are automatically upgraded to Schema v2 with default coordinate spaces and quality presets through `AntiGravityConfigurationProvider.migrateSchema()`.
