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

// SPDX-FileCopyrightText: Justin Garza <JGarza9788@gmail.com>
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
uniform float uColorSpeed;
uniform bool uRandomColorOffset;
uniform float uColorOffset;
uniform float uColorSaturation;
uniform float uFadeOut;
uniform float uBlur;
uniform bool uBlurBleed;
uniform vec2 uSeed;


vec3 offsetHue(vec3 color, float hueOffset) {
    // Convert RGB to HSV
    float maxC = max(max(color.r, color.g), color.b);
    float minC = min(min(color.r, color.g), color.b);
    float delta = maxC - minC;

    float hue = 0.0;
    if (delta > 0.0) {
        if (maxC == color.r) {
            hue = mod((color.g - color.b) / delta, 6.0);
        } else if (maxC == color.g) {
            hue = (color.b - color.r) / delta + 2.0;
        } else {
            hue = (color.r - color.g) / delta + 4.0;
        }
    }
    hue /= 6.0;

    float saturation = (maxC > 0.0) ? (delta / maxC) : 0.0;
    float value = maxC;

    // Offset the hue
    hue = mod(hue + hueOffset, 1.0);

    // Convert HSV back to RGB
    float c = value * saturation;
    float x = c * (1.0 - abs(mod(hue * 6.0, 2.0) - 1.0));
    float m = value - c;

    vec3 rgb;
    if (hue < 1.0 / 6.0) {
        rgb = vec3(c, x, 0.0);
    } else if (hue < 2.0 / 6.0) {
        rgb = vec3(x, c, 0.0);
    } else if (hue < 3.0 / 6.0) {
        rgb = vec3(0.0, c, x);
    } else if (hue < 4.0 / 6.0) {
        rgb = vec3(0.0, x, c);
    } else if (hue < 5.0 / 6.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }

    return rgb + m;
}

// A simple blur function
vec4 blur(vec2 uv, float radius, float samples) {
  vec4 color = vec4(0.0);

  const float tau        = 6.28318530718;
  const float directions = 15.0;

  for (float d = 0.0; d < tau; d += tau / directions) {
    for (float s = 0.0; s < 1.0; s += 1.0 / samples) {
      vec2 offset = vec2(cos(d), sin(d)) * radius * (1.0 - s) / uSize;
      color += getInputColor(uv + offset);
    }
  }

  return color / samples / directions;
}

void main() {

    // This gradually dissolves from [1..0] from the outside to the center. We
    // switch the direction for opening and closing.
    float progress = uForOpening ? uProgress : 1.0 - uProgress ;

    // Get the color from the window texture.
    vec4 oColor = getInputColor(iTexCoord.st);
    
    // Calculate the aspect ratio of the render area
    float aspect = uSize.x / uSize.y;

    //standard uv
    vec2 uv = iTexCoord.st;

    // tuv is for when progress is near 0
    vec2 tuv = uv;
    tuv -= 0.5; // Shift UV coordinates to center (from [-0.5 to 0.5])
    tuv.x *= aspect; // Scale x-coordinate to match aspect ratio
    tuv += 0.5; // Shift UV coordinates back (from [0 to 1])
    
    //mixing the UVs
    uv = mix(tuv,uv,easeOutExpo(progress));

    // this controls the shape 
    // -1.0 would be a diamond-ish
    // 0.0 would be a rounded diamond
    // 1.0 would be a circle
    // 2.0  will be sqircle
    // 1000.0 will be very square
    float p = mix(1.0,1000.0,
        easeInExpo(progress)
        );

    //this will be used later to make a mask
    float m = mix(
        0.0,
        1.0,
        clamp(
            pow(abs(uv.x-0.5)*2.0,p) + pow(abs(uv.y-0.5)*2.0,p),0.0,1.0
        )
        );

    //this is the mask
    float mask = (m > progress) ? 0.0 : 1.0 ;

    //pre-color
    float c =  1.0 - abs(m-progress) ;
    c = easeInOutSine(c);
    vec3 color = c * (0.5 + 0.5*cos(progress*uColorSpeed+uv.xyx+vec3(0,2,4)));



    //offset the Hue
    float colorOffset = (uRandomColorOffset) ? hash12(uSeed) : uColorOffset ;
    color = offsetHue(color, colorOffset);
    //clamp and saturate
    color = clamp(color * uColorSaturation,vec3(0.0),vec3(1.0));

    float oColorAlpha = oColor.a;

    //blur-ify
    if (uBlur > 0.0)
    {
        oColor = blur( iTexCoord.st, b * uBlur, 7.0);

        if (uBlurBleed)
        {
            //allow the blur to bleed from the edges of the window
        }
        else
        {
            oColor.a = oColorAlpha;
        }
    }


    
    //apply the color and the mask
    oColor.rgb = mix(oColor.rgb, color, color);
    oColor.a *= mask;

    //i want to fade out the last ~10% of the animation
    float lastfade = remap(progress,0.0,uFadeOut,0.0,1.0);
    lastfade = clamp(lastfade,0.0,1.0);
    lastfade = easeInSine(lastfade);
    
    //apply the lastfade
    oColor.a *= lastfade;

    setOutputColor(oColor);

}