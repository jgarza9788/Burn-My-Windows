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

// SPDX-FileCopyrightText: Your Name <your@email.com>
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

// The width of the fading effect is loaded from the settings.
uniform float uFadeWidth;

uniform float uMinSize;
uniform float uStrength;


void main() {

  float progl = uForOpening ? 1.0 - uProgress : uProgress;

  float aspect = uSize.x / uSize.y;

  //i'm not exactly married to these... and there might be better ones
  float progIOS = easeInOutSine(progl);
  float progOQ = easeOutQuad(progl);

  //create a UV that has X [-1.0,1.0] and Y [-1.0,1.0]
  vec2 uv = iTexCoord.st * 2.0 - 1.0;

  //this scales the UV
  uv /= mix(1.0, uMinSize, progIOS);

  //this spherizes the UV
  float distance = length(uv);
  float strength = mix(1.0, uStrength, progOQ);
  float spherizeAmount = 1.0 - pow(distance, strength);
  uv *= mix(1.0,spherizeAmount,progl);

  //this tries to make the UV a circle at the begining (when opening)
  uv.x *= mix(1.0,aspect,progOQ);

  //shifts the UV to goback to [0.0,1.0] for X and Y
  uv = uv * 0.5 + 0.5;

  //get color and change the alpha
  vec4 oColor = getInputColor(uv);
  oColor.a *= (1.0 - progIOS);


  setOutputColor(oColor);
}