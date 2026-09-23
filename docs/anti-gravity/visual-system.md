# Anti-Gravity Visual & VFX System Specification

## 1. Overview
The visual system translates physical force intensity and state transitions into particle emissions, dynamic lighting, and color transitions evaluated over configurable `AnimationCurve` profiles.

## 2. Animation Curve Evaluation
The system supports hermite/cubic eased transitions:
$$\text{EvaluatedIntensity} = \text{Curve.Evaluate}(I(t))$$

## 3. Dynamic Visual Parameters
- **Active Particles**: $\text{baseCount} \times \text{particleCountMultiplier} \times \text{EvaluatedIntensity}$.
- **Light Intensity**: $\text{baseLightIntensity} \times \text{EvaluatedIntensity}$.
- **Color Gradients**: State-indexed RGB hex values mapped from `config.visual.colorGradient`.
- **Distance Culling**: Bypasses emission when distance to camera $> \text{particleCullingDistance}$.
