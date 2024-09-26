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

'use strict';

import * as utils from '../utils.js';

// We import some modules only in the Shell process as they are not available in the
// preferences process. They are used only in the creator function of the ShaderFactory
// which is only called within GNOME Shell's process.
const ShaderFactory = await utils.importInShellOnly('./ShaderFactory.js');
const Clutter       = await utils.importInShellOnly('gi://Clutter');

const _ = await utils.importGettext();

//////////////////////////////////////////////////////////////////////////////////////////
// This effect applies some intentional graphics issues to your windows.                //
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
      // Store uniform locations of newly created shaders.

      // shader._uAnimation = shader.get_uniform_location('uAnimation');

      shader._uStartPos = shader.get_uniform_location('uStartPos');
      shader._uAmplitude = shader.get_uniform_location('uAmplitude');
      shader._uColor    = shader.get_uniform_location('uColor');
      shader._uColorSize    = shader.get_uniform_location('uColorSize');

      // Write all uniform values at the start of each animation.
      shader.connect('begin-animation', (shader, settings, forOpening, testMode) => {
        // clang-format off

        if (settings.get_boolean('warp-use-pointer')) {
          shader._startPointerPos = global.get_pointer();
          shader._actor           = actor;

        } else {
          // Else, a random position along the window boundary is used as start position
          // for the incinerate effect.
          let startPos = seed[0] > seed[1] ? [seed[0], Math.floor(seed[1] + 0.5)] :
                                             [Math.floor(seed[0] + 0.5), seed[1]];

          shader.set_uniform_float(shader._uStartPos, 2, startPos);

          shader._startPointerPos = null;
        }

        // shader.set_uniform_float(shader._uAnimation, 1, [settings.get_double('warp-animation-time')]);
        shader.set_uniform_float(shader._uAmplitude, 1, [settings.get_double('warp-amplitude-value')]);
        shader.set_uniform_float(shader._uColor, 3, utils.parseColor(settings.get_string('warp-effect-color')));
        shader.set_uniform_float(shader._uColorSize, 1, [settings.get_double('warp-color-size')]);

        // clang-format on
      });

      

      // Make sure to drop the reference to the actor.
      shader.connect('end-animation', (shader) => {
        shader._actor = null;
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
  // (e.g. '*-animation-time').
  static getNick() {
    return 'warp';
  }

  // This will be shown in the sidebar of the preferences dialog as well as in the
  // drop-down menus where the user can choose the effect.
  static getLabel() {
    return _('Warp');
  }

  // -------------------------------------------------------------------- API for prefs.js

  // This is called by the preferences dialog whenever a new effect profile is loaded. It
  // binds all user interface elements to the respective settings keys of the profile.
  static bindPreferences(dialog) {
    dialog.bindAdjustment('warp-enable-effect');
    dialog.bindAdjustment('warp-animation-time');
    dialog.bindAdjustment('warp-amplitude-value');
    dialog.bindColorButton('warp-effect-color');
    dialog.bindColorButton('warp-color-size');
    dialog.bindSwitch('warp-use-pointer');
  }

  // ---------------------------------------------------------------- API for extension.js

  // The getActorScale() is called from extension.js to adjust the actor's size during the
  // animation. This is useful if the effect requires drawing something beyond the usual
  // bounds of the actor. This only works for GNOME 3.38+.
  static getActorScale(settings, forOpening, actor) {
    return {x: 1.0, y: 1.0};
  }
}