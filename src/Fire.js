//////////////////////////////////////////////////////////////////////////////////////////
//          )                                                   (                       //
//       ( /(   (  (               )    (       (  (  (         )\ )    (  (            //
//       )\()) ))\ )(   (         (     )\ )    )\))( )\  (    (()/( (  )\))(  (        //
//      ((_)\ /((_|()\  )\ )      )\  '(()/(   ((_)()((_) )\ )  ((_)))\((_)()\ )\       //
//      | |(_|_))( ((_)_(_/(    _((_))  )(_))  _(()((_|_)_(_/(  _| |((_)(()((_|(_)      //
//      | '_ \ || | '_| ' \))  | '  \()| || |  \ V  V / | ' \)) _` / _ \ V  V (_-<      //
//      |_.__/\_,_|_| |_||_|   |_|_|_|  \_, |   \_/\_/|_|_||_|\__,_\___/\_/\_//__/      //
//                                 |__/                                                 //
//                       Copyright (c) 2021 Simon Schneegans                            //
//          Released under the GPLv3 or later. See LICENSE file for details.            //
//////////////////////////////////////////////////////////////////////////////////////////

'use strict';

const {Gio, GObject} = imports.gi;

const _ = imports.gettext.domain('burn-my-windows').gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me             = imports.misc.extensionUtils.getCurrentExtension();
const utils          = Me.imports.src.utils;

//////////////////////////////////////////////////////////////////////////////////////////
// This effect is a homage to the good old Compiz days. However, it is implemented      //
// quite differently. While Compiz used a particle system, this effect uses a noise     //
// shader. The noise is moved vertically over time and mapped to a configurable color   //
// gradient. It is faded to transparency towards the edges of the window. In addition,  //
// there are a couple of moving gradients which fade-in or fade-out the fire effect.    //
//////////////////////////////////////////////////////////////////////////////////////////

// The shader class for this effect is registered further down in this file. When this
// effect is used for the first time, an instance of this shader class is created. Once
// the effect is finished, the shader will be stored in the freeShaders array and will
// then be reused if a new shader is requested. ShaderClass which will be used whenever
// this effect is used.
let ShaderClass = null;
let freeShaders = [];

// The effect class is completely static. It can be used to get some metadata (like the
// effect's name or supported GNOME Shell versions), to initialize the respective page of
// the settings dialog, as well as to create the actual shader for the effect.
var Fire = class Fire {

  // ---------------------------------------------------------------------------- metadata

  // The effect is available on all GNOME Shell versions supported by this extension.
  static getMinShellVersion() {
    return [3, 36];
  }

  // This will be called in various places where a unique identifier for this effect is
  // required. It should match the prefix of the settings keys which store whether the
  // effect is enabled currently (e.g. '*-close-effect'), and its animation time
  // (e.g. '*-animation-time').
  static getNick() {
    return 'fire';
  }

  // This will be shown in the sidebar of the preferences dialog as well as in the
  // drop-down menus where the user can choose the effect.
  static getLabel() {
    return _('Fire');
  }

  // -------------------------------------------------------------------- API for prefs.js

  // This is called by the preferences dialog. It loads the settings page for this effect,
  // binds all properties to the settings and appends the page to the main stack of the
  // preferences dialog.
  static getPreferences(dialog) {

    // Add the settings page to the builder.
    dialog.getBuilder().add_from_resource(`/ui/${utils.getGTKString()}/Fire.ui`);

    // Bind all properties.
    dialog.bindAdjustment('fire-animation-time');
    dialog.bindAdjustment('flame-movement-speed');
    dialog.bindAdjustment('flame-scale');
    dialog.bindSwitch('flame-3d-noise');
    dialog.bindColorButton('fire-color-1');
    dialog.bindColorButton('fire-color-2');
    dialog.bindColorButton('fire-color-3');
    dialog.bindColorButton('fire-color-4');
    dialog.bindColorButton('fire-color-5');

    // The fire-gradient-reset button needs to be bound explicitly.
    dialog.getBuilder().get_object('reset-fire-colors').connect('clicked', () => {
      dialog.getSettings().reset('fire-color-1');
      dialog.getSettings().reset('fire-color-2');
      dialog.getSettings().reset('fire-color-3');
      dialog.getSettings().reset('fire-color-4');
      dialog.getSettings().reset('fire-color-5');
    });

    // Initialize the fire-preset dropdown.
    Fire._createFirePresets(dialog);

    // Finally, return the new settings page.
    return dialog.getBuilder().get_object('fire-prefs');
  }

  // ---------------------------------------------------------------- API for extension.js

  // This is called from extension.js whenever a window is opened or closed with this
  // effect. It returns an instance of the shader class, trying to reuse previously
  // created shaders.
  static getShader(actor, settings, forOpening) {
    let shader;

    if (freeShaders.length == 0) {
      shader = new ShaderClass();
    } else {
      shader = freeShaders.pop();
    }

    shader.setUniforms(actor, settings, forOpening);

    return shader;
  }

  // The tweakTransition() is called from extension.js to tweak a window's open / close
  // transitions - usually windows are faded in / out and scaled up / down by GNOME Shell.
  // The parameter 'forOpening' is set to true if this is called for a window-open
  // transition, for a window-close transition it is set to false. The modes can be set to
  // any value from here: https://gjs-docs.gnome.org/clutter8~8_api/clutter.animationmode.
  // The only required property is 'opacity', even if it transitions from 1.0 to 1.0. The
  // current value of the opacity transition is passed as uProgress to the shader.
  // Tweaking the actor's scale during the transition only works properly for GNOME 3.38+.

  // For this effect, windows should neither be scaled nor faded.
  static tweakTransition(actor, settings, forOpening) {
    return {
      'opacity': {from: 255, to: 255, mode: 3},
      'scale-x': {from: 1.0, to: 1.0, mode: 3},
      'scale-y': {from: 1.0, to: 1.0, mode: 3}
    };
  }

  // This is called from extension.js if the extension is disabled. This should free all
  // static resources.
  static cleanUp() {
    freeShaders = [];
  }

  // ----------------------------------------------------------------------- private stuff

  // This populates the preset dropdown menu for the fire options.
  static _createFirePresets(dialog) {
    dialog.getBuilder().get_object('fire-prefs').connect('realize', (widget) => {
      const presets = [
        {
          name: _('Default Fire'),
          scale: 1.0,
          speed: 0.5,
          color1: 'rgba(76, 51, 25, 0.0)',
          color2: 'rgba(180, 55, 30, 0.7)',
          color3: 'rgba(255, 76, 38, 0.9)',
          color4: 'rgba(255, 166, 25, 1)',
          color5: 'rgba(255, 255, 255, 1)'
        },
        {
          name: _('Hell Fire'),
          scale: 1.5,
          speed: 0.2,
          color1: 'rgba(0,0,0,0)',
          color2: 'rgba(103,7,80,0.5)',
          color3: 'rgba(150,0,24,0.9)',
          color4: 'rgb(255,200,0)',
          color5: 'rgba(255, 255, 255, 1)'
        },
        {
          name: _('Dark and Smutty'),
          scale: 1.0,
          speed: 0.5,
          color1: 'rgba(0,0,0,0)',
          color2: 'rgba(36,3,0,0.5)',
          color3: 'rgba(150,0,24,0.9)',
          color4: 'rgb(255,177,21)',
          color5: 'rgb(255,238,166)'
        },
        {
          name: _('Cold Breeze'),
          scale: 1.5,
          speed: -0.1,
          color1: 'rgba(0,110,255,0)',
          color2: 'rgba(30,111,180,0.24)',
          color3: 'rgba(38,181,255,0.54)',
          color4: 'rgba(34,162,255,0.84)',
          color5: 'rgb(97,189,255)'
        },
        {
          name: _('Santa is Coming'),
          scale: 0.4,
          speed: -0.5,
          color1: 'rgba(0,110,255,0)',
          color2: 'rgba(208,233,255,0.24)',
          color3: 'rgba(207,235,255,0.84)',
          color4: 'rgb(208,243,255)',
          color5: 'rgb(255,255,255)'
        }
      ];

      const menu      = Gio.Menu.new();
      const group     = Gio.SimpleActionGroup.new();
      const groupName = 'presets';

      // Add all presets.
      presets.forEach((preset, i) => {
        const actionName = 'fire' + i;
        menu.append(preset.name, groupName + '.' + actionName);
        let action = Gio.SimpleAction.new(actionName, null);

        // Load the preset on activation.
        action.connect('activate', () => {
          dialog.getSettings().set_double('flame-movement-speed', preset.speed);
          dialog.getSettings().set_double('flame-scale', preset.scale);
          dialog.getSettings().set_string('fire-color-1', preset.color1);
          dialog.getSettings().set_string('fire-color-2', preset.color2);
          dialog.getSettings().set_string('fire-color-3', preset.color3);
          dialog.getSettings().set_string('fire-color-4', preset.color4);
          dialog.getSettings().set_string('fire-color-5', preset.color5);
        });

        group.add_action(action);
      });

      dialog.getBuilder().get_object('fire-preset-button').set_menu_model(menu);

      const root = utils.isGTK4() ? widget.get_root() : widget.get_toplevel();
      root.insert_action_group(groupName, group);
    });
  }
}


//////////////////////////////////////////////////////////////////////////////////////////
// The shader class for this effect will only be registered in GNOME Shell's process    //
// (not in the preferences process). It's done this way as Clutter may not be installed //
// on the system and therefore the preferences would crash.                             //
//////////////////////////////////////////////////////////////////////////////////////////

if (utils.isInShellProcess()) {

  const {Clutter, Shell} = imports.gi;

  ShaderClass = GObject.registerClass({}, class ShaderClass extends Shell.GLSLEffect {
    // This is called when the effect is used for the first time. This can be used to
    // store all required uniform locations.
    _init() {
      super._init();

      this._uGradient = [
        this.get_uniform_location('uGradient1'),
        this.get_uniform_location('uGradient2'),
        this.get_uniform_location('uGradient3'),
        this.get_uniform_location('uGradient4'),
        this.get_uniform_location('uGradient5'),
      ];

      this._u3DNoise       = this.get_uniform_location('u3DNoise');
      this._uScale         = this.get_uniform_location('uScale');
      this._uMovementSpeed = this.get_uniform_location('uMovementSpeed');
    }

    // This is called each time the effect is used. This can be used to retrieve the
    // configuration from the settings and update all uniforms accordingly.
    setUniforms(actor, settings, forOpening) {

      // Load the gradient values from the settings.
      for (let i = 1; i <= 5; i++) {
        const c = Clutter.Color.from_string(settings.get_string('fire-color-' + i))[1];
        this.set_uniform_float(this._uGradient[i - 1], 4,
                               [c.red / 255, c.green / 255, c.blue / 255, c.alpha / 255]);
      }

      // clang-format off
      this.set_uniform_float(this._u3DNoise,       1, [settings.get_boolean('flame-3d-noise')]);
      this.set_uniform_float(this._uScale,         1, [settings.get_double('flame-scale')]);
      this.set_uniform_float(this._uMovementSpeed, 1, [settings.get_double('flame-movement-speed')]);
      // clang-format on
    }

    // This is called by extension.js when the shader is not used anymore. We will store
    // this instance of the shader so that it can be re-used in th future.
    free() {
      freeShaders.push(this);
    }

    // This is called by the constructor. This means, it's only called when the effect
    // is used for the first time.
    vfunc_build_pipeline() {
      const decl = utils.loadGLSLResource(`/shaders/${Fire.getNick()}-declarations.glsl`);
      const code = utils.loadGLSLResource(`/shaders/${Fire.getNick()}.glsl`);

      this.add_glsl_snippet(Shell.SnippetHook.FRAGMENT, decl, code, true);
    }
  });
}