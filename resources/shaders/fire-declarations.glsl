// Inject some common shader snippets. It is only possible to include glsl files from the
// "common" directory. Also, the files in the "common" directory are not allowed to
// include any further files.
#include "common/uniforms.glsl"
#include "common/compositing.glsl"
#include "common/edgeMask.glsl"
#include "common/noise.glsl"

uniform bool u3DNoise;
uniform float uScale;
uniform float uMovementSpeed;
uniform vec4 uGradient1;
uniform vec4 uGradient2;
uniform vec4 uGradient3;
uniform vec4 uGradient4;
uniform vec4 uGradient5;

// These may be configurable in the future.
const float EDGE_FADE  = 70;
const float FADE_WIDTH = 0.1;
const float HIDE_TIME  = 0.4;

// This maps the input value from [0..1] to a color from the gradient.
vec4 getFireColor(float v) {
  const float steps[5] = float[](0.0, 0.2, 0.35, 0.5, 0.8);
  vec4 colors[5] = vec4[](uGradient1, uGradient2, uGradient3, uGradient4, uGradient5);

  if (v < steps[0]) {
    return colors[0];
  }

  for (int i = 0; i < 4; ++i) {
    if (v <= steps[i + 1]) {
      return mix(colors[i], colors[i + 1],
                 vec4(v - steps[i]) / (steps[i + 1] - steps[i]));
    }
  }

  return colors[4];
}

// This method requires the uniforms from standardUniforms() to be available.
// It returns two values: The first is an alpha value which can be used for the window
// texture. This gradually dissolves the window from top to bottom. The second can be used
// to mask any effect, it will be most opaque where the window is currently fading and
// gradually dissolve to zero over time.
// hideTime:      A value in [0..1]. It determines the percentage of the animation which
//                is spent for hiding the window. 1-hideTime will be spent thereafter for
//                dissolving the effect mask.
// fadeWidth:     The relative size of the window-hiding gradient in [0..1].
// edgeFadeWidth: The pixel width of the effect fading range at the edges of the window.
vec2 effectMask(float hideTime, float fadeWidth, float edgeFadeWidth) {
  float burnProgress      = clamp(uProgress / hideTime, 0, 1);
  float afterBurnProgress = clamp((uProgress - hideTime) / (1 - hideTime), 0, 1);

  // Gradient from top to bottom.
  float t = cogl_tex_coord_in[0].t * (1 - fadeWidth);

  // Visible part of the window. Gradually dissolves towards the bottom.
  float windowMask = 1 - clamp((burnProgress - t) / fadeWidth, 0, 1);

  // Gradient from top burning window.
  float effectMask = clamp(t * (1 - windowMask) / burnProgress, 0, 1);

  // Fade-out when the window burned down.
  if (uProgress > hideTime) {
    float fade = sqrt(1 - afterBurnProgress * afterBurnProgress);
    effectMask *= mix(1, 1 - t, afterBurnProgress) * fade;
  }

  // Fade at window borders.
  effectMask *= getAbsoluteEdgeMask(edgeFadeWidth);

  if (uForOpening) {
    windowMask = 1.0 - windowMask;
  }

  return vec2(windowMask, effectMask);
}