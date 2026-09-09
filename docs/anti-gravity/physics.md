# Anti-Gravity Physics Engine Specification

## 1. Mathematical Model

### Force Calculation
$$\vec{F} = \hat{d} \cdot \min\left( F_{\max}, G_{\text{strength}} \cdot m \cdot k_{\text{force}} \cdot I(t) \right)$$

Where:
- $\hat{d}$: Normalized directional unit vector (world, local, or target-relative).
- $G_{\text{strength}}$: Configured gravity strength.
- $m$: Calculated entity mass via swappable `IMassCalculator`.
- $k_{\text{force}}$: Configured force multiplier.
- $I(t)$: Smooth intensity ramp governed by configured acceleration ($a_{\text{cfg}}$).
- $F_{\max}$: Configured maximum force clamp.

### Intensity Acceleration Ramp
$$I(t + \Delta t) = \operatorname{clamp}\left(I(t) \pm a_{\text{cfg}} \cdot \Delta t, 0.0, I_{\text{target}}\right)$$

### Velocity Damping
$$\vec{v}(t + \Delta t) = \vec{v}(t) \cdot \max\left(0, 1.0 - \delta_{\text{damping}} \cdot \Delta t \cdot 10\right) + \frac{\vec{F}}{m} \Delta t$$

## 2. Swappable Mass Strategies
- **`DefaultMassCalculator`**: Evaluates Rigidbody mass $\times$ `massMultiplier`.
- **`DensityVolumeMassCalculator`**: Computes mass from 3D bounding volume $\times$ material density.
- **`EquipmentModifierMassCalculator`**: Computes base mass plus dynamic inventory/equipment attachments.
- **`NetworkMassCalculator`**: Utilizes server-authoritative replicated mass values.
