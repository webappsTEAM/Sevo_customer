# Anti-Gravity State Machine Specification

## 1. State Topology
```
           +-----------------------+
           |         IDLE          |<---------------------+
           +-----------+-----------+                      |
                       | activate input                   |
                       v                                  |
           +-----------------------+                      |
           |      ACTIVATING       |                      |
           +-----------+-----------+                      |
                       | intensity >= threshold           |
                       v                                  |
    +------------------------------------+                |
    |               ACTIVE               |                |
    +-----+------------------------+-----+                |
          | force >= overload      | input released       |
          v                        v                      |
+-------------------+    +--------------------+           |
|    OVERLOADED     |    |    DEACTIVATING    |           |
+---------+---------+    +---------+----------+           |
          | cooldown elapsed       |                      |
          +------------------------+ intensity <= 0.01 ---+
```

## 2. Transition Rules
- **`IDLE` $\to$ `ACTIVATING`**: Fired when `activate` action is triggered.
- **`ACTIVATING` $\to$ `ACTIVE`**: Fired when field intensity crosses `config.state.activatingThreshold`.
- **`ACTIVE` $\to$ `DEACTIVATING`**: Fired when `activate` input is released.
- **`ACTIVE` $\to$ `OVERLOADED`**: Fired when computed force exceeds `config.physics.overloadThreshold`.
- **`OVERLOADED` $\to$ `DEACTIVATING`**: Fired when `overloadCooldownSeconds` expires.
- **`DEACTIVATING` $\to$ `IDLE`**: Fired when field intensity settles to $\le 0.01$.
