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

// The width of the fading effect is loaded from the settings.
// uniform float uFadeWidth;

uniform float uXpos;
uniform float uYpos;
uniform float uSparkleRot;
uniform float uSparkleSize;


//use to scale the window
vec2 scaleUV(vec2 uv, vec2 scale, vec2 centerOffset)
{
  // Put texture coordinate origin to center of window.
  uv -= centerOffset;
  uv = uv * 2.0 - 1.0;

  //scale
  uv /= mix(vec2(1.0,1.0), vec2(0.0,0.0), scale);

  // scale from center
  uv = uv * 0.5 + 0.5;
  

  return uv;
}

//this returns the Spark
float getSpark(vec2 uv, vec2 center, float brightness, float size, float rotation)
{
  brightness = clamp(brightness,0.001,1.0);
  size = clamp(size,0.001,1.0);
  float bn = mix(0.0,0.07,brightness); //recalculate size
  
  uv = (uv + vec2(0.5)) ;
  uv = (uv - center) ;//Center UV coordinates, then scale to fit the star size
  uv = scaleUV(uv, vec2(1.0 - size), vec2(0.0));
  uv = rotate(uv, rotation, vec2(0.5)); //rotate the UV

  //this is basically the brightness
  float p = mix(-1.0,1000.0,easeInExpo(bn));

  float m = mix(
      0.0,
      1.0,
      clamp(
          pow(abs(uv.x-0.5)*2.0,p) + pow(abs(uv.y-0.5)*2.0,p),0.0,1.0
      )
      );

  
  float mask = easeInSine(1.0 - (m - bn)) - 0.004 ;
  mask = clamp(mask,0.0,1.0);
  
  return mask;
  
}


float FadeInOut(float t, float power)
{
  float s = -1.0 * pow((t-0.5)/(0.5),power)+1.0;
  s = clamp(s,0.0,1.0);
  return s;
}

void main() {
  // Calculate the progression value based on the animation direction.
  // If opening, use uProgress as-is; if closing, invert the progression.
  float progress = uForOpening ? 1.0 - uProgress : uProgress ;

  // scale progress ... the first half of the animation
  float scalep = remap(
    progress,
    0.0,0.5,
    0.0,1.0
    );
  // float scalep = progress;
  scalep = easeInOutQuad(scalep);

 // sparkle progress ... the second half of the animation
  float sparkp = remap(
    progress,
    0.5,1.0,
    0.0,1.0
    );
  sparkp = easeInOutSine(sparkp);

  // // this is the offset of the window... don't let them go too far each way
  vec2 offset = vec2(uXpos,uYpos*-1.0) * 0.33;
  vec2 scaleOffset = mix(vec2(0.0),offset,scalep);

  //the UV for this function
  float aspect = uSize.x / uSize.y;
  vec2 uv = iTexCoord.st * vec2(aspect,1.0);

  vec2 v2 = scaleUV(
    iTexCoord.st,
    vec2(scalep,scalep),
    scaleOffset / vec2(aspect,1.0)
  );

  vec4 oColor = getInputColor( v2) ;

  float size = mix(25.0,50.0,uSparkleSize);

  //get the sparkle
  float sparkle = getSpark(
      uv,
      offset + vec2(0.5 * aspect,0.5),
      FadeInOut(sparkp,2) * uSparkleSize,
      FadeInOut(sparkp,2) * size,
      sparkp * 6.28 * float(uSparkleRot)
      );
  //fade out at the edges
  sparkle *= FadeInOut(iTexCoord.t,8);
  sparkle *= FadeInOut(iTexCoord.s,8);
  
  //set it to the results
  oColor = alphaOver(
    oColor,
    vec4(1.0,1.0,1.0,sparkle)
    );

  setOutputColor(oColor);
}