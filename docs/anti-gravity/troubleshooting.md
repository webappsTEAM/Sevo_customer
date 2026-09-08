# Anti-Gravity Troubleshooting Guide

## 1. Common Diagnostics & Solutions

### Issue: Configuration Rejected on Hot Reload
- **Symptom**: `AntiGravityConfigurationRejected` event emitted; configuration does not update.
- **Cause**: Out-of-bounds parameter (e.g. negative gravity strength, zero vector direction, or inverted threshold).
- **Resolution**: Check diagnostic errors in `ConfigurationValidator.validate()` output or run `anti_gravity.config dump`.

### Issue: Fallback Mode Active
- **Symptom**: `isFallbackActive` is `true`.
- **Cause**: External configuration file missing, corrupt, or failed network retrieval.
- **Resolution**: Verify external configuration JSON source integrity.

### Issue: Entity Not Affected by Anti-Gravity Field
- **Symptom**: `applyPhysics` returns no force on entity.
- **Cause**: Entity tag in `excludedTags`, entity layer bitwise mismatch with `layerMask`, or entity is missing required tag.
- **Resolution**: Inspect entity tag/layer and compare against `config.collision`.

### Issue: Overload Triggering Instantly
- **Symptom**: State jumps to `OVERLOADED` upon activation.
- **Cause**: `physics.overloadThreshold` set lower than calculated force magnitude.
- **Resolution**: Increase `physics.overloadThreshold` or decrease `physics.forceMultiplier`.
