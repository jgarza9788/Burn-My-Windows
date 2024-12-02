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
uniform float uColorOffset;
uniform float uColorSaturation;

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

void main() {

    // This gradually dissolves from [1..0] from the outside to the center. We
    // switch the direction for opening and closing.
    float progress = uForOpening ? uProgress : 1.0 - uProgress ;

    // Get the color from the window texture.
    vec4 oColor = getInputColor(iTexCoord.st);
    
    //standard uv
    vec2 uv = iTexCoord.st;

    // this controls the shape ... turn 25.0 into 100.0 to be more square at the end 
    float p = mix(2.0,50.0,progress);

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
    float c = easeInQuart( 1.0 - abs(m-progress) );
    vec3 color = c * (0.5 + 0.5*cos(progress*uColorSpeed+uv.xyx+vec3(0,2,4)));

    //offset the Hue
    color = offsetHue(color, uColorOffset);
    //clamp and saturate
    color = clamp(color * uColorSaturation,vec3(0.0),vec3(1.0));

    //apply the color and the mask
    oColor.r = mix(oColor.r, color.r, color.r);
    oColor.g = mix(oColor.g, color.g, color.g);
    oColor.b = mix(oColor.b, color.b, color.b);
    oColor.a *= mask;

    setOutputColor(oColor);

}