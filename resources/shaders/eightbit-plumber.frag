//////////////////////////////////////////////////////////////////////////////////////////
//          )                                                   (                       //
//       ( /(   (  (               )    (       (  (  (         )\ )    (  (            //
//       )\()) ))\ )(   (         (     )\ )    )\))( )\  (    (()/( (  )\))(  (        //
//      ((_)\ /((_|()\  )\ )      )\  '(()/(   ((_)()((_) )\ )  ((_)))\((_)()\ )\       //
//      | |(_|_))( ((_)_(_/(    _((_))  )(_))  _(()((_|_)_(_/(  _| |((_)(()((_|(_)      //
//      | '_ \ || | '_| ' \))  | '  \()| || |  \ V  V / | ' \)) _` / _ \ V  V (_-<      //
//      |_.__/\_,_|_| |_||_|   |_|_|_|  \_, |   \_/\_/|_|_||_|\__,_\___/\_/\_//__/      //
//                                 |__/                                                 //
//////////////////////////////////////////////////////////////////////////////////////////

// SPDX-FileCopyrightText: Justin Garza JGarza9788@gmail.com
// SPDX-License-Identifier: GPL-3.0-or-later

// The content from common.glsl is automatically prepended to each shader effect. This
// provides the standard input:

// vec2  iTexCoord:     Texture coordinates for retrieving the window input color.
// bool  uIsFullscreen: True if the window is maximized or in fullscreen mode.
// bool  uForOpening:   True if a window-open animation is ongoing, false otherwise.
// float uProgress:     A value which transitions from 0 to 1 during the animation.
// float uDuration:     The duration of the current animation in seconds.
// vec2  uSize:         The size of uTexture in pixels.
// float uPadding:      The empty area around the actual window (e.g. where the shadow
//                      is drawn). For now, this will only be set on GNOME.

// Furthermore, there are two global methods for reading the window input color and
// setting the shader output color. Both methods assume straight alpha:

// vec4 getInputColor(vec2 coords)
// void setOutputColor(vec4 outColor)


//this gives us the jerky 8bit growth effect.
float eightBitScale(float progress)
{
    float scale = 1.0;
    if (progress <= 0.1)
    {
      scale = 0.25;
    }
    else if (progress <= 0.2)
    {
      scale = 0.5;
    }
    else if (progress <= 0.3)
    {
      scale = 0.25;
    }
    else if (progress <= 0.4)
    {
      scale = 0.5;
    }
    else if (progress <= 0.5)
    {
      scale = 0.25;
    }
    else if (progress <= 0.6)
    {
      scale = 0.5;
    }
    else if (progress <= 0.7)
    {
      scale = 1.0;
    }
    else if (progress <= 0.8)
    {
      scale = 0.25;
    }
    else if (progress <= 0.9)
    {
      scale = 0.5;
    }
    return scale;
}

//use to scale the window
vec2 scaleUV(vec2 uv, vec2 scale)
{
  // Put texture coordinate origin to center of window.
  uv = uv * 2.0 - 1.0;

  //scale
  uv /= mix(vec2(1.0,1.0), vec2(0.0,0.0), scale);

  // scale from center
  uv = uv * 0.5 + 0.5;

  return uv;
}




void main() {

  // Calculate the animation progress, flipping direction if opening
  // 'uProgress' varies from 0 to 1, depending on the animation phase
  float progress = uForOpening ? 1.0 - uProgress : uProgress;

  // Initialize the output color to fully transparent black
  vec4 oColor = vec4(0.0, 0.0, 0.0, 0.0);

  // Scale UV coordinates using a custom 8-bit scaling function
  float scale8bit = eightBitScale(progress);

  // Fetch the color based on the scaled texture coordinates
  oColor = getInputColor(
    scaleUV(iTexCoord.st, vec2(scale8bit, scale8bit))
  );

  // Set the final output color to the computed value
  setOutputColor(oColor);

}
