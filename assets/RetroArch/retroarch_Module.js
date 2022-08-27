(function () {
    let T = this;
    const Module = {
        'noInitialRun': true,
        'arguments': ["--verbose", "--menu"],
        'preRun': [],
        'postRun': [],
        'print': text => console.log(text),
        'printErr': text => {
            if (/Video\s@\s\d+x\d+\.?\s*$/.test(text) || /Set\s?video\s?size\s?to:\s?\d+x\d+\s?\.?\s?/.test(text)) {
                let wh = text.trim().split(' ').pop().split('x');
                Module.resizeCanvasSize(wh);
            }
            console.log(text);
        },
        'totalDependencies': 0,
        'monitorRunDependencies': function (left) {
            this.totalDependencies = Math.max(this.totalDependencies, left);
        },
        'onRunning': false,
        'memFile': {},
        'js_replace': txt => txt.replace(
            /_RWebAudioInit\(latency\)\s?\{/,
            '_RWebAudioInit(latency){Module.latency=latency;'
        ).replace(
            /function\s?_RWebAudioStart\(\)\s?\{/,
            'function _RWebAudioStart() {if(RA.context && RA.context.state != Module.RA_isRUN) return Module.RA_RERUN(RA);'
        ).replace(
            /_RWebAudioWrite\(\)\s?\{/,
            '_RWebAudioWrite(buf,size){if(RA.context&&RA.context.state != Module.RA_isRUN)return Module.RA_RERUN(RA);\n'
        ).replace(
            /function\s?_RWebCamInit\(caps1,\s?caps2,\s?width,\s?height\)\s?\{/,
            `function _RWebCamInit( caps1, caps2, width, height) {return 0;`
        ).replace(
            /\"mouse(up|down|move|enter|leave)\"/g,
            '"pointer$1"'
        ).replace(
            /calledRun\s?=\s?true;/,
            'calledRun = Module.calledRun = true;'
        ).replace(
            /calledMain\s?=\s?true/,
            'calledMain = true;Module.onRunning=true;'
        ).replace(
            /**auto canvas position FS git@github.com:BinBashBanana/webretro.git */
            /HEAP32\[idx\s?\+\s?9\]\s?=\s?e\["movementX"\];\n?\s*HEAP32\[idx\s?\+\s?10\]\s?=\s?e\["movementY"\];\n?\s*var\s?rect\s?=\s?getBoundingClientRect\(target\);/,
            `var movementX = e.movementX || e.pageY - JSEvents.previousScreenX;
            var movementY = e.movementY || e.pageY - JSEvents.previousScreenY;
            HEAP32[idx + 9] = movementX;
            HEAP32[idx + 10] = movementY;
            if (e.type !== "wheel" && e.type !== "mousewheel") {
                JSEvents.previousScreenX = e.pageY;
                JSEvents.previousScreenY = e.pageY
            }
            var rect = Module.get_canvas_rect(e,true);
            `
        ).replace(
            /var rect\s?=\s?__specialEventTargets\.indexOf\(target\)\s?\s?<\s?0\s?\?\s?__getBoundingClientRect\(target\)\s?:\s?\{\n?\s*"left":\s?0,\n?\s*"top":\s?0\n?\s*\};\n?\s*/,
            `var rect = Module.get_canvas_rect(e,true);
            `
        ).replace(
            /Module\["run"\]\s?=\s?run;/,
            `;((m,n)=>{
                    m.FS = FS,m.GL = GL,m.SYSCALLS = SYSCALLS,m.RA = RA;
                    if(!m.HEAP8)m.HEAP8 = HEAP8;
                    m.set_fs_init(n,FS||m.FS,HEAP8||m.HEAP8);
                    m.run=run;
                })(Module,MEMFS);`
        ).replace(
            /eventHandler\.useCapture\s?\)/,
            'eventHandler.useCapture||{passive: false})'
        ).replace(
            /return\s?WebAssembly\.instantiate\(binary,\s?info\)/,
            'return WebAssembly.instantiate(binary, info).catch(e=>alert(JSON.stringify(e)))'
        ),
        'set_fs_init': (MEMFS, FS, HEAP8) => {
            Module.FileDB = new T.FsMount({
                MEMFS,
                FS,
                HEAP8
            });
        },
        'locateFile': function (path) {
            if (this.memFile[path.split('/').pop()]) return this.memFile[path.split('/').pop()];
            return T.JSpath + 'cores/' + path;
        },
        'stopEvent': e => {
            e.preventDefault();
            return false;
        },
        'stopGesture': elm => {
            ['gotpointercapture', 'dblclick', 'gesturestart', 'gesturechange', 'gestureend'].forEach(evt => this.on(elm, evt, e => Module.stopEvent(e), {
                'passive': false
            }));
        },
        'RA_isRUN': 'running',
        'RA_isSTOP': 'suspended',
        'RA_REST': RA => {
            RA = RA || Module.RA;
            if (RA.context) RA.context.resume();
            if (!RA.context || RA.context.state != Module.RA_isRUN) {
                RA.bufIndex = 0;
                RA.bufOffset = 0
                var ac = window["AudioContext"] || window["webkitAudioContext"];
                if (RA.context) {
                    RA.context.close();
                    delete RA.context;
                }
                RA.context = new ac;
                RA.numBuffers = Module.latency * RA.context.sampleRate / (1e3 * RA.BUFFER_SIZE) | 0;
                if (RA.numBuffers < 2) RA.numBuffers = 2;
                for (var i = 0; i < RA.numBuffers; i++) {
                    RA.buffers[i] = RA.context.createBuffer(2, RA.BUFFER_SIZE, RA.context.sampleRate);
                    RA.buffers[i].endTime = 0
                }
                RA.nonblock = false;
                RA.startTime = 0;
                RA.context.createGain();
                RA.setStartTime();
                RA.context.resume();
            }
            Module.resumeMainLoop();
        },
        'RA_RERUN': RA => {
            Module.pauseMainLoop && Module.pauseMainLoop();
            Module.RA_CLICK(() => {
                Module.RA_REST(RA);
            });
            return 1;
        },
        RA_ELM: T.$('.g-mobile-click'),
        'RA_CLICK': func => {
            let elm = Module.RA_ELM;
            if (!elm.hidden) return;
            elm.hidden = false;
            T.once(elm, 'pointerdown', () => {
                elm.hidden = true;
                func();
            })
        },
        'get_canvas_rect': (e, bol) => {
            let rect = Module.canvas.getBoundingClientRect();
            if (rect.width != Module.canvas.widthNative) {
                let sacl = Module.canvas.widthNative / rect.width;
                rect = {
                    left: (bol ? e.clientX : 0) + (rect.left - e.clientX) * sacl,
                    top: (bol ? e.clientY : 0) + (rect.top - e.clientY) * sacl
                };
            }
            return rect;
        },
        'resizeCanvasSize': wh => {
            if (wh) {
                [Module.width, Module.height] = wh;
                Module.AspectRatio = Module.width / Module.height;
            }
            if (Module.AspectRatio) {
                let opt = this.$('.g-game-ui').getBoundingClientRect(),
                    p = Module.canvasQuality || 720,
                    AspectRatio = Module.AspectRatio;
                if (!T.isMobile) {
                    AspectRatio = opt.width / opt.height;
                    p = opt.height > p ? opt.height : p;
                } else if (typeof window.orientation != "undefined" && window.orientation != 0) {
                    T.$('.g-game-ctrl').style.top = 45 + 'px';
                    AspectRatio = opt.width / opt.height;
                } else {
                    if (!T.$('.g-game-ctrl').hidden) {
                        w = opt.width,
                            h = opt.width / AspectRatio;
                        if (h > opt.height) {
                            h = opt.height;
                            w = opt.height * AspectRatio;
                        }
                        T.$('.g-game-ctrl').style.top = (T.isMobile && h != opt.height ? h : 0) + 45 + 'px';
                    }
                }
                if (Module.setCanvasSize) {
                    Module.setCanvasSize(p * AspectRatio, p);
                }
            }
        },
        'KeyDown': (key, e) => {
            if (typeof key == 'string') key = [key];
            key.forEach(entry => Module.keyCode_enter(Module.keyCode_map['input_' + entry], 1, entry));
            if (e) return Module.stopEvent(e);
        },
        'KeyUp': (key, e) => {
            if (typeof key == 'string') key = [key];
            key.forEach(entry => Module.keyCode_enter(Module.keyCode_map['input_' + entry], 0, entry));
            if (e) return Module.stopEvent(e);
        },
        'KeyCode_click': key => {
            Module.KeyDown(key);
            setTimeout(() => Module.KeyUp(key), T.speed);
        },
        'keyCode_enter': (key, type, bkey) => {
            if (typeof key == "undefined" || key == "" || key == "nul" || key == "null") return;
            if (Module.myKeyEnter) return Module.myKeyEnter(type, key, bkey);
            let code = Module.keyCode_list[key];
            if (typeof code == 'undefined') return;
            let edata = typeof code == 'string' ? {
                code,
                key
            } : Object.assign(code, {
                key
            });
            document.dispatchEvent(new KeyboardEvent(type ? 'keydown' : 'keyup', edata));
        },
        'keyCode_map': {
            'input_player1_a': "x",
            'input_player1_b': "z",
            'input_player1_x': "s",
            'input_player1_y': "a",
            'input_player1_l': "q",
            'input_player1_l2': "nul",
            'input_player1_l3': "nul",
            'input_player1_r': "w",
            'input_player1_r2': "nul",
            'input_player1_r3': "nul",
            'input_player1_up': "up",
            'input_player1_left': "left",
            'input_player1_right': "right",
            'input_player1_down': "down",
            'input_player1_select': "rshift",
            'input_player1_start': "enter",
            'input_player1_turbo': "nul",
            'input_player1_l_x_minus': "nul",
            'input_player1_l_x_plus': "nul",
            'input_player1_l_y_minus': "nul",
            'input_player1_l_y_plus': "nul",
            'input_player1_r_x_minus': "nul",
            'input_player1_r_x_plus': "nul",
            'input_player1_r_y_minus': "nul",
            'input_player1_r_y_plus': "nul",
            'input_toggle_fast_forward': "space",
            'input_toggle_fullscreen': "f",
            'input_reset': "h",
            'input_screenshot': "f8",
            'input_load_state': "f4",
            'input_save_state': "f2",
            'input_menu_toggle': "f1",
            'input_toggle_slowmotion': "nul",
            'input_pause_toggle': "p",
        },
        'keyCode_list': {
            "tilde": "Backquote",
            "num1": "Digit1",
            "num2": "Digit2",
            "num3": "Digit3",
            "num4": "Digit4",
            "num5": "Digit5",
            "num6": "Digit6",
            "num7": "Digit7",
            "num8": "Digit8",
            "num9": "Digit9",
            "num0": "Digit0",
            "minus": "Minus",
            "equal": "Equal",
            "backspace": "Backspace",
            "tab": "Tab",
            "q": "KeyQ",
            "w": "KeyW",
            "e": "KeyE",
            "r": "KeyR",
            "t": "KeyT",
            "y": "KeyY",
            "u": "KeyU",
            "i": "KeyI",
            "o": "KeyO",
            "p": "KeyP",
            "a": "KeyA",
            "s": "KeyS",
            "d": "KeyD",
            "f": "KeyF",
            "g": "KeyG",
            "h": "KeyH",
            "j": "KeyJ",
            "k": "KeyK",
            "l": "KeyL",
            "z": "KeyZ",
            "x": "KeyX",
            "c": "KeyC",
            "v": "KeyV",
            "b": "KeyB",
            "n": "KeyN",
            "m": "KeyM",
            "leftbracket": "BracketLeft",
            "rightbracket": "BracketRight",
            "backslash": "Backslash",
            "capslock": "CapsLock",
            "semicolon": "Semicolon",
            "quote": "Quote",
            "enter": "Enter",
            "shift": "ShiftLeft",
            "comma": "Comma",
            "period": "Period",
            "slash": "Slash",
            "rshift": "ShiftRight",
            "ctrl": "ControlLeft",
            "lmeta": "MetaLeft",
            "alt": "AltLeft",
            "space": "Space",
            "ralt": "AltRight",
            "menu": "ContextMenu",
            "rctrl": "ControlRight",
            "up": "ArrowUp",
            "left": "ArrowLeft",
            "down": "ArrowDown",
            "right": "ArrowRight",
            "kp_period": "NumpadDecimal",
            "kp_enter": "NumpadEnter",
            "keypad0": "Numpad0",
            "keypad1": "Numpad1",
            "keypad2": "Numpad2",
            "keypad3": "Numpad3",
            "keypad4": "Numpad4",
            "keypad5": "Numpad5",
            "keypad6": "Numpad6",
            "keypad7": "Numpad7",
            "keypad8": "Numpad8",
            "keypad9": "Numpad9",
            "add": "NumpadAdd",
            "numlock": "NumLock",
            "divide": "NumpadDivide",
            "multiply": "NumpadMultiply",
            "subtract": "NumpadSubtract",
            "home": "Home",
            "end": "End",
            "pageup": "PageUp",
            "pagedown": "PageDown",
            "del": "Delete",
            "insert": "Insert",
            "f12": "F12",
            "f10": "F10",
            "f9": "F9",
            "f8": "F8",
            "f7": "F7",
            "f6": "F6",
            "f5": "F5",
            "f4": "F4",
            "f3": "F3",
            "f2": "F2",
            "f1": "F1",
            "escape": "Escape",
            "`": {
                code: "Backquote"
            },
            "-": {
                code: "Minus"
            },
            "=": {
                code: "Equal"
            },
            "[": {
                code: "BracketLeft"
            },
            "]": {
                code: "BracketRight"
            },
            "\\": {
                code: "Backslash"
            },
            ";": {
                code: "Semicolon"
            },
            "'": {
                code: "Quote"
            },
            ",": {
                code: "Comma"
            },
            ".": {
                code: "Period"
            },
            "/": {
                code: "Slash"
            },
            "\t": {
                code: "Tab"
            },
            "\n": {
                code: "Enter"
            },
            " ": {
                code: "Space"
            },
            "Q": {
                code: "KeyQ",
                shift: true
            },
            "W": {
                code: "KeyW",
                shift: true
            },
            "E": {
                code: "KeyE",
                shift: true
            },
            "R": {
                code: "KeyR",
                shift: true
            },
            "T": {
                code: "KeyT",
                shift: true
            },
            "Y": {
                code: "KeyY",
                shift: true
            },
            "U": {
                code: "KeyU",
                shift: true
            },
            "I": {
                code: "KeyI",
                shift: true
            },
            "O": {
                code: "KeyO",
                shift: true
            },
            "P": {
                code: "KeyP",
                shift: true
            },
            "A": {
                code: "KeyA",
                shift: true
            },
            "S": {
                code: "KeyS",
                shift: true
            },
            "D": {
                code: "KeyD",
                shift: true
            },
            "F": {
                code: "KeyF",
                shift: true
            },
            "G": {
                code: "KeyG",
                shift: true
            },
            "H": {
                code: "KeyH",
                shift: true
            },
            "J": {
                code: "KeyJ",
                shift: true
            },
            "K": {
                code: "KeyK",
                shift: true
            },
            "L": {
                code: "KeyL",
                shift: true
            },
            "Z": {
                code: "KeyZ",
                shift: true
            },
            "X": {
                code: "KeyX",
                shift: true
            },
            "C": {
                code: "KeyC",
                shift: true
            },
            "V": {
                code: "KeyV",
                shift: true
            },
            "B": {
                code: "KeyB",
                shift: true
            },
            "N": {
                code: "KeyN",
                shift: true
            },
            "M": {
                code: "KeyM",
                shift: true
            },
            ")": {
                code: "Digit0",
                shift: true
            },
            "!": {
                code: "Digit1",
                shift: true
            },
            "@": {
                code: "Digit2",
                shift: true
            },
            "#": {
                code: "Digit3",
                shift: true
            },
            "$": {
                code: "Digit4",
                shift: true
            },
            "%": {
                code: "Digit5",
                shift: true
            },
            "^": {
                code: "Digit6",
                shift: true
            },
            "&": {
                code: "Digit7",
                shift: true
            },
            "*": {
                code: "Digit8",
                shift: true
            },
            "(": {
                code: "Digit9",
                shift: true
            },
            "~": {
                code: "Backquote",
                shift: true
            },
            "_": {
                code: "Minus",
                shift: true
            },
            "+": {
                code: "Equal",
                shift: true
            },
            "{": {
                code: "BracketLeft",
                shift: true
            },
            "}": {
                code: "BracketRight",
                shift: true
            },
            "|": {
                code: "Backslash",
                shift: true
            },
            ":": {
                code: "Semicolon",
                shift: true
            },
            "\"": {
                code: "Quote",
                shift: true
            },
            "<": {
                code: "Comma",
                shift: true
            },
            ">": {
                code: "Period",
                shift: true
            },
            "?": {
                code: "Slash",
                shift: true
            },
        },
        'sys_map': {
            'psx': ['bin', 'iso', 'cue', 'img', 'mdf', 'pbp', 'toc', 'cbn', 'm3u'],
            'nds': ['nds', 'bin'],
            'nes': ['fds', 'nes', 'unif', 'unf'],
            'mesen': ['fds', 'nes', 'unif', 'unf'],
            'snes': ['smc', 'fig', 'sfc', 'gd3', 'gd7', 'dx2', 'bsx', 'swc'],
            'snes2002': ['smc', 'fig', 'sfc', 'gd3', 'gd7', 'dx2', 'bsx', 'swc'],
            'snes2005': ['smc', 'fig', 'sfc', 'gd3', 'gd7', 'dx2', 'bsx', 'swc'],
            'snes2010': ['smc', 'fig', 'sfc', 'gd3', 'gd7', 'dx2', 'bsx', 'swc'],
            'gb': ['gb', 'gbc', 'dmg'],
            'gba': ['gb', 'gbc', 'gba'],
            'vbanext': ['gba'],
            'vb': ['vb', 'vboy', 'bin'],
            '3do': ['iso', 'bin', 'cue'],
            'lynx': ['lnx'],
            'jaguar': ['j64', 'jag', 'rom', 'abs', 'cof', 'bin', 'prg'],
            'a7800': ['a78', 'bin'],
            'a2600': ['a26', 'bin'],
            'ngp': ['ngp', 'ngc'],
            'n64': ['n64', 'v64', 'z64', 'bin', 'u1', 'ndd'],
            'pce': ['pce', 'bin', 'iso', 'cue', 'ccd', 'img', 'chd'],
            'pcfx': ['ccd', 'toc', 'chd', 'cue'],
            'sega': ['mdx', 'md', 'smd', 'gen', 'bin', 'iso', 'cue', 'sms', 'gg', 'sg', '68k', 'chd'],
            'segacd': ['mdx', 'md', 'smd', 'gen', 'bin', 'iso', 'cue', 'sms', 'gg', 'sg', '68k', 'chd'],
            '32x': ['32x', 'bin', 'gen', 'smd', 'md', 'cue', 'iso', 'sms'],
            'saturn': ['bin', 'cue', 'iso'],
            'msx': ['rom', 'mx1', 'mx2', 'dsk', 'cas'],
            'bluemsx': ['rom', 'ri', 'mx1', 'mx2', 'col', 'dsk', 'cas', 'sg', 'sc', 'm3u'],
            'ws': ['ws', 'wsc'],
            'arcade': ['zip'],
            'fba0.2.97.29': ['zip'],
            'mame2003': ['zip'],
            'mame': ['zip']
        }
    };
    T.Module = Module;
    window.Module = Module;
}).call(Nenge)