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

uniform bool u8BitStyle;

uniform bool uEnable4PStars;
uniform int u4PStars;
uniform vec4 u4PSColor;
uniform float u4PSRotation;

uniform bool uEnableRays;
uniform vec4 uRaysColor;

uniform bool uEnable5pStars;
uniform int uRings;
uniform float uRingRotation;
uniform int uStarPerRing;

uniform vec4 uStarColor0;
uniform vec4 uStarColor1;
uniform vec4 uStarColor2;
uniform vec4 uStarColor3;
uniform vec4 uStarColor4;
uniform vec4 uStarColor5;

vec3 getPosByAngle(float angle)
{
    return vec3(cos(angle), sin(angle), 0);
}


float getStar(vec2 uv, vec2 center, float npoints, float radiusRatio, float size, float rotation)
{

    float radiusMax = 1.0;
    float radiusMin = radiusMax * radiusRatio;


    float PI = 3.1415926;
    float starangle = 2.0 * PI / npoints; // Angle between points on the star

    // Define the positions for the outer and inner points of the star's initial angle, rotated by `rotation`
    vec3 p0 = (radiusMax * size) * getPosByAngle(rotation);             // Outer point, rotated by `rotation`
    vec3 p1 = (radiusMin * size) * getPosByAngle(starangle + rotation);  // Inner point, also rotated

    // Calculate the position of the current fragment relative to the star's center
    vec2 curPosuv = (uv - center);      // Center UV coordinates, then scale to fit the star size
    float curRadius = length(curPosuv);         // Radius from center, no need to scale further
    float curPosAngle = atan(curPosuv.x, curPosuv.y) - rotation; // Calculate angle and adjust by `rotation`

    // Determine the fractional position within the current star segment
    float a = fract(curPosAngle / starangle); // Fractional angle position within one segment
    if (a >= 0.5)
        a = 1.0 - a; // Ensure we are within the first half of the segment (symmetry)

    // Calculate the current point on the star segment, applying rotation
    a = a * starangle;                          // Actual angle for this position on the segment
    vec3 curPos = curRadius * getPosByAngle(a + rotation); // Final position, rotated

    // Calculate directions for edge detection using cross product
    vec3 dir0 = p1 - p0;  // Vector from outer to inner point
    vec3 dir1 = curPos - p0; // Vector from outer point to current position

    // Use cross product to determine if `curPos` is inside the star's edge
    return step(0.0, cross(dir0, dir1).z); // Returns 1.0 if inside, 0.0 if outside (solid edge)
}


vec4 getStarColor(float v,float alpha) {
  float steps[6];
  steps[0] = 0.0;
  steps[1] = 0.1666;
  steps[2] = 0.3333;
  steps[3] = 0.5;
  steps[4] = 0.6666;
  steps[5] = 0.9999;

  vec4 colors[6];
  colors[0] = uStarColor0;
  colors[1] = uStarColor1;
  colors[2] = uStarColor2;
  colors[3] = uStarColor3;
  colors[4] = uStarColor4;
  colors[5] = uStarColor5;

  colors[0].a = alpha;
  colors[1].a = alpha;
  colors[2].a = alpha;
  colors[3].a = alpha;
  colors[4].a = alpha;
  colors[5].a = alpha;

  if (v < steps[0]) {
    return colors[0];
  }

  for (int i = 0; i < 5; ++i) {
    if (v <= steps[i + 1]) {
      return mix(colors[i], colors[i + 1],
                 vec4(v - steps[i]) / (steps[i + 1] - steps[i]));
    }
  }

  return colors[5];
}

float starSize(float t,float max_size,float power)
{
  float s = -1 * pow((t-0.5)/(0.5),power)+1;
  s = clamp(s,0.0,1.0) * max_size;
  return s;
}

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


vec2 scaleUV(vec2 uv, float scale)
{
  // Put texture coordinate origin to center of window.
  uv = uv * 2.0 - 1.0;

  //scale
  uv /= mix(1.0,0.0, scale);

  // scale from center
  uv = uv * 0.5 + 0.5;

  return uv
}

vec2 scaleUV(vec2 uv, vec2 scale)
{
  // Put texture coordinate origin to center of window.
  uv = uv * 2.0 - 1.0;

  //scale
  uv /= mix(vec2(1.0,1.0), vec2(0.0,0.0), scale);

  // scale from center
  uv = uv * 0.5 + 0.5;

  return uv
}

float get4PStars(float progress)
{
  
  float stars = 0.0;//all the stars

  for (int x = 0 ; x < u4PStars;x++)
  {

    vec2 h = hash21(float(x));
    float yprog = mix( 0.0 - h.y , 1.0+(1.0-h.y) , progress);
    yprog =  clamp(yprog,0.0001,0.999);

    float star = 0.0;
    //blur the star a bit
    for (int a = 1; a < 10 ; a++)
    {
      star += getStar(
        uv, 
        vec2( sin(h.x * 6.28 ) * 0.33, yprog), //position (x, y)
        4.0, //nPoints
        0.5, //radiusRatio
        starSize(yprog,0.03 + ( 0.1 * (float(a)/10.0)) ,2.0), //Size   
        progress * 6.28 * u4PSRotation  //rotation
        ) * (1.0/10.0);
    }

    star = clamp(star,0.0,1.0);

    stars += star;
  }

  return stars;

}

float getRays(float progress)
{
  vec2 rayUV = iTexCoord.st;
  rayUV *= vec2(10.0,0.05);
  rayUV.y += progress * -0.5;
  
  float ray = simplex2D(rayUV);
  ray *= starSize(iTexCoord.t,1.0,8.0);
  ray *= starSize(progress,1.0,8.0);


  ray = remap(
    ray,
    0.0,1.0,
    -5.0,1.0
  );
  ray = clamp(ray,0.0,1.0);

}

vec4 get5PStars(float progress, vec4 oColor)
{
  for (int ring = 0; ring < uRings; ring++)
  {
    float spread = ring*(1.0/uRings);
    yprog = mix( 0.0 - spread , 1.0+(1.0-spread) , progress);
    yprog = clamp(yprog,0.0001,0.999);

    for (int x = 0; x < uStarPerRing; x++) 
    {
      star = getStar(
          uv, 
          vec2( sin(progress * uRingRotation * 6.28 + (x*(6.28/uStarPerRing))) * aspect , yprog), //position (x, y)
          5.0, //nPoints
          0.5, //radiusRatio
          starSize(yprog,0.03,2.0), //Size   
          3.14 //rotation
          );


      //put the star in back or the front of the window 
      float depth = cos(progress * uRingRotation * 6.28 + (x*(6.28/uStarPerRing)) );
      if (depth < 0.0)
      {
        oColor = alphaOver(oColor,getStarColor(yprog,star));
      }
      else
      {
        oColor = alphaOver(getStarColor(yprog,star),oColor);
      }

      
    }
  }

  return oColor;
}

void main() {


  float progress = uForOpening ? 1.0 - uProgress : uProgress;

  vec4 oColor = vec4(0.0,0.0,0.0,0.0);

  if (u8BitStyle)
  {
    float scale8bit = eightBitScale(progress)

    oColor = getInputColor(
      scaleUV(iTexCoord.st,scale8bit)
    );

    setOutputColor(oColor);
  }
  else
  {

    //Scale 
    vec2 scaleV2 = vec2(easeInOutSine(progress),easeInQuad( progress ));

    oColor = getInputColor(
      scaleUV(iTexCoord.st,scaleV2)
    );


    float aspect = uSize.x / uSize.y;
    vec2 starUV = vec2(iTexCoord.s - 0.5,iTexCoord.t) * vec2(aspect, 1.0);

    if (uEnable4PStars)
    {
      float 4PS = get4PStars(progress);
      oColor = alphaOver(oColor,vec4(u4PSColor.r,u4PSColor.g,u4PSColor.b,4PS));
    }

    if (uEnableRays)
    {
      float rays = getRays(progress)later
      oColor = alphaOver(oColor,vec4(uRaysColor.r,uRaysColor.g,uRaysColor.b,rays));
    }

    if (uEnable5pStars)
    {
      oColor = get5PStars(progress,oColor);
    }

  }


  setOutputColor(oColor);

  

}