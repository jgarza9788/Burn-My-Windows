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

// SPDX-FileCopyrightText: Simon Schneegans <code@simonschneegans.de>
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
// This effect burns windows to ashes. The fire starts at a random position at the      //
// window's boundary and then burns through the window in a circular shape.             //
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
      shader._uSeed       = shader.get_uniform_location('uSeed');
      shader._uColor      = shader.get_uniform_location('uColor');
      shader._uScale      = shader.get_uniform_location('uScale');
      shader._uTurbulence = shader.get_uniform_location('uTurbulence');
      shader._uStartPos   = shader.get_uniform_location('uStartPos');

      // Write all uniform values at the start of each animation.
      shader.connect(
        'begin-animation', (shader, settings, forOpening, testMode, actor) => {
          // If we are currently performing integration test, the animation uses a fixed
          // seed.
          let seed = [testMode ? 0 : Math.random(), testMode ? 0 : Math.random()];

          // If this option is set, we use the mouse pointer position. Because the actor
          // position may change after the begin-animation signal is called, we set the
          // uStartPos uniform during the update callback.
          if (settings.get_boolean('incinerate-use-pointer')) {
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

          // clang-format off
          shader.set_uniform_float(shader._uSeed,       2, seed);
          shader.set_uniform_float(shader._uColor,      3, utils.parseColor(settings.get_string('incinerate-color')));
          shader.set_uniform_float(shader._uScale,      1, [settings.get_double('incinerate-scale')]);
          shader.set_uniform_float(shader._uTurbulence, 1, [settings.get_double('incinerate-turbulence')]);
          // clang-format on
        });

      // If the mouse pointer position is used as start position, we set the uStartPos
      // uniform during the update callback as the actor position may not be set up
      // properly before the begin animation callback.
      shader.connect('update-animation', (shader) => {
        if (shader._startPointerPos) {
          const [x, y]               = shader._startPointerPos;
          const [ok, localX, localY] = shader._actor.transform_stage_point(x, y);

          if (ok) {
            let startPos = [
              Math.max(0.0, Math.min(1.0, localX / shader._actor.width)),
              Math.max(0.0, Math.min(1.0, localY / shader._actor.height))
            ];
            shader.set_uniform_float(shader._uStartPos, 2, startPos);
          }
        }
      });

      // Make sure to drop the reference to the actor.
      shader.connect('end-animation', (shader) => {
        shader._actor = null;
      });
    });
  }

  // ---------------------------------------------------------------------------- metadata

  // This effect is available on all supported GNOME Shell versions.
  static getMinShellVersion() {
    return [3, 36];
  }

  // This will be called in various places where a unique identifier for this effect is
  // required. It should match the prefix of the settings keys which store whether the
  // effect is enabled currently (e.g. '*-enable-effect'), and its animation time
  // (e.g. '*-animation-time').
  static getNick() {
    return 'incinerate';
  }

  // This will be shown in the sidebar of the preferences dialog as well as in the
  // drop-down menus where the user can choose the effect.
  static getLabel() {
    return _('Incinerate');
  }

  //this can be used for searching, and helping people find the effect they are looking for
  static description = "The Incinerate effect simulates a burning transition where flames consume the window, starting from a random edge or the mouse pointer position. This fiery effect includes customizable color, scale, and turbulence, creating a dramatic dissolve into ashes.";


  // -------------------------------------------------------------------- API for prefs.js

  // This is called by the preferences dialog whenever a new effect profile is loaded. It
  // binds all user interface elements to the respective settings keys of the profile.
  static bindPreferences(dialog) {
    dialog.bindAdjustment('incinerate-animation-time');
    dialog.bindAdjustment('incinerate-scale');
    dialog.bindAdjustment('incinerate-turbulence');
    dialog.bindSwitch('incinerate-use-pointer');
    dialog.bindColorButton('incinerate-color');
  }

  // ---------------------------------------------------------------- API for extension.js

  // The getActorScale() is called from extension.js to adjust the actor's size during the
  // animation. This is useful if the effect requires drawing something beyond the usual
  // bounds of the actor. This only works for GNOME 3.38+.
  static getActorScale(settings, forOpening, actor) {
    return {x: 1.0, y: 1.0};
  }
}