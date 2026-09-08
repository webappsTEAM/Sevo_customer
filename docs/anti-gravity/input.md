# Anti-Gravity Input System Specification

## 1. Abstraction Architecture
The Anti-Gravity input system maps gameplay intentions to abstract action tokens via `IAntiGravityInputProvider`. Direct keyboard keys, mouse buttons, touch gestures, and gamepad axes are never queried directly in gameplay logic.

## 2. Action Tokens
- `activate`: Primary trigger for ramping anti-gravity field.
- `deactivate`: Graceful spin-down trigger.
- `increaseIntensity`: Increment target force percentage.
- `decreaseIntensity`: Decrement target force percentage.
- `directionHorizontal`: X-axis vector modifier.
- `directionVertical`: Y-axis vector modifier.
- `directionDepth`: Z-axis vector modifier.
- `emergencyDeactivate`: Immediate safety shutoff.

## 3. Dynamic Rebinding
```javascript
// Runtime rebinding of the activate action to a new hardware key or axis
engine.inputProvider.rebindAction('activate', 'GamepadButtonA');
```
Rebinding emits the `AntiGravityInputRebound` event and immediately takes effect without requiring a game restart.
