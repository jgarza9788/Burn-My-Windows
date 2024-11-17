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

'use strict';

import * as utils from '../utils.js';

// We import the ShaderFactory only in the Shell process as it is not required in the
// preferences process. The preferences process does not create any shader instances, it
// only uses the static metadata of the effect.
const ShaderFactory = await utils.importInShellOnly('./ShaderFactory.js');

const _ = await utils.importGettext();

//////////////////////////////////////////////////////////////////////////////////////////
// This effect was obviously inspired my the 8bit mario video games of old, specifically//
// when mario gets the mushroom. i hope you enjoy this little blast from the past.      //
//////////////////////////////////////////////////////////////////////////////////////////

// The effect class can be used to get some metadata (like the effect's name or supported
// GNOME Shell versions), to initialize the respective page of the settings dialog, as
// well as to create the actual shader for the effect.
export default class Effect {
  // The constructor creates a ShaderFactory which will be used by extension.js to create
  // shader instances for this effect. The shaders will be automagically created using the
  // GLSL file in resources/shaders/<nick>.glsl. The callback will be called for each
  // newly created shader instance.
  constructor() {
    this.shaderFactory = new ShaderFactory(Effect.getNick(), (shader) => {
      // very basic effect... so nothing here

      shader._uGradient = [
        shader.get_uniform_location('uStarColor0'),
        shader.get_uniform_location('uStarColor1'),
        shader.get_uniform_location('uStarColor2'),
        shader.get_uniform_location('uStarColor3'),
        shader.get_uniform_location('uStarColor4'),
        shader.get_uniform_location('uStarColor5'),
      ];

      shader._u8BitStyle = shader.get_uniform_location('u8BitStyle');

      shader._uEnable4PStars = shader.get_uniform_location('uEnable4PStars');
      shader._u4PStars       = shader.get_uniform_location('u4PStars');
      shader._u4PSColor      = shader.get_uniform_location('u4PSColor');
      shader._u4PSRotation   = shader.get_uniform_location('u4PSRotation');

      shader._uEnableRays = shader.get_uniform_location('uEnableRays');
      shader._uRaysColor  = shader.get_uniform_location('uRaysColor');

      shader._uEnable5pStars = shader.get_uniform_location('uEnable5pStars');
      shader._uRings         = shader.get_uniform_location('uRings');
      shader._uRingRotation  = shader.get_uniform_location('uRingRotation');
      shader._uStarPerRing   = shader.get_uniform_location('uStarPerRing');

      // And update all uniforms at the start of each animation.
      shader.connect('begin-animation', (shader, settings) => {
        for (let i = 0; i < 6; i++) {
          shader.set_uniform_float(
            shader._uGradient[i - 1], 4,
            utils.parseColor(settings.get_string('star-color-' + i)));
        }

        // clang-format off
        shader.set_uniform_float(shader._u8BitStyle,            1, [settings.get_boolean('mushroom-8bit-enable')]);

        shader.set_uniform_float(shader._uEnable4PStars,        1, [settings.get_boolean('mushroom-4pstars-enable')]);
        shader.set_uniform_float(shader._u4PStars,              1, [settings.get_int('mushroom-4pstars-count')]);
        shader.set_uniform_float(shader._u4PSColor,             3, utils.parseColor(settings.get_string('mushroom-4pstars-color')));
        shader.set_uniform_float(shader._u4PSRotation,          1, [settings.get_double('mushroom-4pstars-rotation')]);

        shader.set_uniform_float(shader._uEnableRays,           1, [settings.get_boolean('mushroom-rays-enable')]);
        shader.set_uniform_float(shader._uRaysColor,            3, utils.parseColor(settings.get_string('mushroom-rays-color')));

        shader.set_uniform_float(shader._uEnable5pStars,        1, [settings.get_boolean('mushroom-5pstars-enable')]);
        shader.set_uniform_float(shader._uRings,                1, [settings.get_int('mushroom-5pstarring-count')]);
        shader.set_uniform_float(shader._uRingRotation,         1, [settings.get_double('mushroom-5pstarring-rotation')]);
        shader.set_uniform_float(shader._uStarPerRing,          1, [settings.get_int('mushroom-5pstars-count')]);


        // clang-format on
      });
    });
  }

  // ---------------------------------------------------------------------------- metadata

  // The effect is available on all GNOME Shell versions supported by this extension.
  static getMinShellVersion() {
    return [3, 36];
  }

  // This will be called in various places where a unique identifier for this effect is
  // required. It should match the prefix of the settings keys which store whether the
  // effect is enabled currently (e.g. '*-enable-effect'), and its animation time
  // (e.g. '*-animation-time'). Also, the shader file and the settings UI files should be
  // named likes this.
  static getNick() {
    return 'mushroom';
  }

  // This will be shown in the sidebar of the preferences dialog as well as in the
  // drop-down menus where the user can choose the effect.
  static getLabel() {
    return _('Mushroom');
  }

  // -------------------------------------------------------------------- API for prefs.js

  // This is called by the preferences dialog whenever a new effect profile is loaded. It
  // binds all user interface elements to the respective settings keys of the profile.
  static bindPreferences(dialog) {
    // Empty for now... Code is added here later in the tutorial!
    dialog.bindAdjustment('mushroom-animation-time');
    dialog.bindAdjustment('mushroom-8bit-enable');

    dialog.bindAdjustment('star-color-0');
    dialog.bindAdjustment('star-color-1');
    dialog.bindAdjustment('star-color-2');
    dialog.bindAdjustment('star-color-3');
    dialog.bindAdjustment('star-color-4');
    dialog.bindAdjustment('star-color-5');
    dialog.bindAdjustment('mushroom-4pstars-enable');
    dialog.bindAdjustment('mushroom-4pstars-count');
    dialog.bindAdjustment('mushroom-4pstars-color');
    dialog.bindAdjustment('mushroom-4pstars-rotation');

    dialog.bindAdjustment('mushroom-rays-enable');
    dialog.bindAdjustment('mushroom-rays-color');

    dialog.bindAdjustment('mushroom-5pstars-enable');
    dialog.bindAdjustment('mushroom-5pstarring-count');
    dialog.bindAdjustment('mushroom-5pstarring-rotation');
    dialog.bindAdjustment('mushroom-5pstars-count');
  }

  // ---------------------------------------------------------------- API for extension.js

  // The getActorScale() is called from extension.js to adjust the actor's size during the
  // animation. This is useful if the effect requires drawing something beyond the usual
  // bounds of the actor. This only works for GNOME 3.38+.
  static getActorScale(settings, forOpening, actor) {
    return {x: 1.0, y: 1.0};
  }
}