# Anti-Gravity Collision Filtering & Response Specification

## 1. Overview
Collision filtering evaluates whether an entity within the anti-gravity volume is influenced, repulsed, attracted, or ignored. All rules are evaluated dynamically through `ICollisionFilter`.

## 2. Decision Pipeline
1. **Layer Mask**: Bitwise comparison `(1 << entity.layer) & config.layerMask != 0`.
2. **Excluded Tags (Blacklist)**: Entities with tags present in `config.excludedTags` are immediately rejected.
3. **Affected Tags (Whitelist)**: If `config.affectedTags` is populated, the entity tag must be contained in the whitelist.

## 3. Configurable Responses
- `REPULSE`: Projects force in the anti-gravity vector direction.
- `ATTRACT`: Inverts force towards the emitter center.
- `FLOAT`: Neutralizes existing downward acceleration.
- `PASS_THROUGH`: No physics applied.
