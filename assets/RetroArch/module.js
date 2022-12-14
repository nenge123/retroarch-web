(function () {
    class Module {
        JSpath = document.currentScript && document.currentScript.src.split('/').slice(0, -1).join('/') + '/';
        noInitialRun = true;
        arguments = ["-verbose", "--menu"];
        preRun = [];
        postRun = [];
        onRunning = false;
        cacheFile = {};
        totalDependencies = 0;
        constructor(obj) {
            const M = this;
            if(!M.T)M.__autoSet();
            if(!M.JSpath)M.JSpath = M.T.JSpath;
            if (obj) {
                object.assign(M, obj);
            }
        }
        __autoSet(){
            let T = Nenge,I = T.is;
            I.defines(this, {T,I}, 1);
        }
        print(text) {
            this.replaceLog(text);
        }
        printErr(text) {
            this.replaceLog(text);
        }
        monitorRunDependencies(left) {
            this.totalDependencies = Math.max(this.totalDependencies, left);
        }
        replaceLog(text) {
            if(this.customLog){
                return this.customLog(text);
            }
            this.setResizeWH(text);
            console.log(text);
        }
        setResizeWH(text){
            if (/Video\s@\s\d+x\d+\.?\s*$/.test(text) || /Set\s?video\s?size\s?to:\s?\d+x\d+\s?\.?\s?/.test(text)) {
                let wh = text.trim().split(' ').pop().split('x');
                this.resetCanvasSize(wh);
            }
        }
        replaceAsmJs(txt) {
            return txt.replace(
                /\s*=\s*Module\[["']+print(Err)?["']+\]/ig,
                ' = text=>Module.printErr(text)'
            ).replace(
                /_RWebAudioInit\(latency\)\s?\{/,
                '_RWebAudioInit(latency){Module.latency=latency;'
            ).replace(
                /function\s?_RWebAudioStart\(\)\s?\{/,
                'function _RWebAudioStart() {if(RA.context && RA.context.state != "running") return Module.mobileAudioRun(RA);'
            ).replace(
                /_RWebAudioWrite\(\)\s?\{/,
                '_RWebAudioWrite(buf,size){if(RA.context&&RA.context.state != "running")return Module.mobileAudioRun(RA);\n'
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
            var rect = Module.replaceCanvasRect(e,true);
            `
            ).replace(
                /var rect\s?=\s?__specialEventTargets\.indexOf\(target\)\s?\s?<\s?0\s?\?\s?__getBoundingClientRect\(target\)\s?:\s?\{\n?\s*"left":\s?0,\n?\s*"top":\s?0\n?\s*\};\n?\s*/,
                `var rect = Module.replaceCanvasRect(e,true);
            `
            ).replace(
                /Module\["run"\]\s?=\s?run;/,
                `;((m,n)=>{
                    m.FS = FS,m.GL = GL,m.SYSCALLS = SYSCALLS,m.RA = RA;
                    if(!m.HEAP8)m.HEAP8 = HEAP8;
                    m.replaceFS(n,FS||m.FS,HEAP8||m.HEAP8);
                    m.run=run;
                })(Module,MEMFS);`
            ).replace(
                /eventHandler\.useCapture\s?\)/,
                'eventHandler.useCapture||{passive: false})'
            ).replace(
                /return\s?WebAssembly\.instantiate\(binary,\s?info\)/,
                'return WebAssembly.instantiate(binary, info).catch(e=>alert(JSON.stringify(e)))'
            );
        }
        replaceFS(MEMFS, FS, HEAP8) {
            this.FileDB = new this.Mount({
                MEMFS,
                FS,
                HEAP8
            });
        }
        locateFile(path) {
            let M = this,T=M.T;
            let name = T.F.getname(path);
            if (M.cacheFile[name]) return M.cacheFile[name];
            return M.JSpath + 'cores/' + path;
        }
        stopEvent(e) {
            e.preventDefault();
            return false;
        }
        stopGesture(elm) {
            ['gotpointercapture', 'dblclick', 'gesturestart', 'gesturechange', 'gestureend'].forEach(evt => this.T.on(elm, evt, e => this.stopEvent(e), {
                'passive': false
            }));
        }
        mobileAudioRest(RA) {
            let M = this;
            RA = RA || M.RA;
            if (RA.context) RA.context.resume();
            if (!RA.context || RA.context.state != 'running') {
                RA.bufIndex = 0;
                RA.bufOffset = 0
                var ac = window["AudioContext"] || window["webkitAudioContext"];
                if (RA.context) {
                    RA.context.close();
                    delete RA.context;
                }
                RA.context = new ac;
                RA.numBuffers = M.latency * RA.context.sampleRate / (1e3 * RA.BUFFER_SIZE) | 0;
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
            M.resumeMainLoop();
        }
        mobileAudioRun(RA) {
            let M = this;
            M.pauseMainLoop && M.pauseMainLoop();
            M.mobileAudioClick(() => {
                M.mobileAudioRest(RA);
            });
            return 1;
        }
        mobileAudioClick(func) {
            let elm = this.T.$('.g-mobile-click');
            if (!elm.hidden) return;
            elm.hidden = false;
            this.T.once(elm, 'pointerdown', () => {
                elm.hidden = true;
                func();
            })
        }
        replaceCanvasRect(e, bol) {
            let M = this,
                rect = M.canvas.getBoundingClientRect();
            if (rect.width != M.canvas.widthNative) {
                let sacl = M.canvas.widthNative / rect.width;
                rect = {
                    left: (bol ? e.clientX : 0) + (rect.left - e.clientX) * sacl,
                    top: (bol ? e.clientY : 0) + (rect.top - e.clientY) * sacl
                };
            }
            return rect;
        }
        resetCanvasSize(wh) {
            let M = this,T=M.T,I=M.I;
            if (wh) {
                [M.width, M.height] = wh;
                M.AspectRatio = M.width / M.height;
            }
            let ctrl = Nttr('.g-game-ctrl');
            if (M.AspectRatio) {
                let opt = T.$('.g-game-ui').getBoundingClientRect(),
                    p = M.canvasQuality || 720,
                    AspectRatio = M.AspectRatio;
                if (!I.mobile) {
                    AspectRatio = opt.width / opt.height;
                    p = opt.height > p ? opt.height : p;
                } else if (typeof window.orientation != "undefined" && window.orientation != 0) {
                    //T.$('.g-game-ctrl').style.top = 45 + 'px';
                    AspectRatio = opt.width / opt.height;
                } else {
                    console.log(this);
                    if (!ctrl.hidden) {
                        let w = opt.width,
                            h = opt.width / AspectRatio;
                        if (h > opt.height) {
                            h = opt.height;
                            w = opt.height * AspectRatio;
                        }
                        //ctrl.obj.style.top = (this.I.mobile && h != opt.height ? h : 0) + 45 + 'px';
                    }
                }
                if (M.setCanvasSize) {
                    M.setCanvasSize(p * AspectRatio, p);
                }
            }
        }
        inputDown(key, e) {
            let M = this;
            if (typeof key == 'string') key = [key];
            key.forEach(entry => M.inputEvent(M.inputMap['input_' + entry], 1, entry));
            if (e) return M.stopEvent(e);
        }
        inputUp(key, e) {
            let M = this;
            if (typeof key == 'string') key = [key];
            key.forEach(entry => M.inputEvent(M.inputMap['input_' + entry], 0, entry));
            if (e) return M.stopEvent(e);
        }
        inputEnter(key) {
            let M = this;
            M.inputDown(key);
            setTimeout(() => M.inputUp(key), this.T.speed);
        }
        inputEvent(key, type, bkey) {
            let M = this;
            if (typeof key == "undefined" || key == "" || key == "nul" || key == "null") return;
            if (M.myKeyEnter) return M.myKeyEnter(type, key, bkey);
            let code = M.inputReflect[key];
            if (typeof code == 'undefined') return;
            let edata = typeof code == 'string' ? {
                code,
                key
            } : Object.assign(code, {
                key
            });
            document.dispatchEvent(new KeyboardEvent(type ? 'keydown' : 'keyup', edata));
        }
        inputMap = {
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
        };
        inputReflect = {
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
        };
        systemMap = {
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
    class Mount {
        constructor(Obj) {
            if(!this.I)this.__autoSet();
            this.I.defines(this, Obj, 1);
            this.speed = this.T.speed;
            this.MEMFS.stream_ops.write = this.ops_write;
            if (this.MEMFS.ops_table) this.MEMFS.ops_table.file.stream.write = this.ops_write;
        }
        __autoSet(){
            let T = window.Nenge,I = T.I;
            this.I.defines(this, {T,I}, 1);
        }
        StoreMap = {};
        getStoreName = mount => this.T.DB_STORE_MAP[mount.mountpoint];
        getStore(name){
            let M = this,T=M.T;
            if(!M.StoreMap[name])M.StoreMap[name] = T.getStore(name);
            return M.StoreMap[name];
        }
        mountStore = mount=>this.getStore(this.getStoreName(mount));
        mount(mount) {
            let M = this;
            if (!M.FS.analyzePath(mount.mountpoint).exists) {
                M.FS.createPath('/', mount.mountpoint, !0, !0);
            }
            let len = mount.mountpoint.split('/').length;
            let node = M.MEMFS.createNode(len < 3 ? M.FS.root : null, len < 3 ? mount.mountpoint.split('/').pop() : mount.mountpoint.replace(/^\//, ''), 16384 | 511, 0);
            if (M.getStoreName(mount)) {
                if (!M.__mount) M.__mount = [];
                M.__mount.push(M.syncfs(mount, e => console.log(e)));
            }
            return node;
        }
        mountReady() {
            return Promise.all(this.__mount || []);
        }
        async syncfs(mount, callback, error) {
            let M = this;
            callback = error instanceof Function ? error : callback;
            let store = M.mountStore(mount);
            let result;
            if (!mount.isReady) {
                result = await M.writeToFS(store);
            } else {
                result = await M.syncWrite(store, mount);
            }
            mount.isReady = true;
            (callback instanceof Function) && callback(result);
            return result;
        }
        async writeToFS(store) {
            let M = this,I=M.I;
            return I.toArr(await store.all(true)).map(entry => M.storeLocalEntry(entry[0], entry[1])).join("\n");
        }
        async syncWrite(store, mount) {
            let M = this,I=M.I,
                IsReady = mount.isReady,
                local = M.getLocalSet(mount),
                remote = await M.getRemoteSet(store),
                src = (IsReady ? local : remote).entries || {},
                dst = (!IsReady ? local : remote).entries || {};
            let result = await Promise.all(I.toArr(src).filter(entry => {
                if (!entry[1]) return '';
                let path = entry[0],
                    e2 = dst[path];
                if (!e2 || entry[1].timestamp > e2.timestamp) {
                    return true;
                }
                return false;

            }).map(entry => entry[0]).sort().map(async path => {
                if (!IsReady) {
                    let contents = await store.get(path);
                    if (contents) {
                        return M.storeLocalEntry(path, contents);
                    }
                } else {
                    let contents = M.loadLocalEntry(path);
                    if (contents) {
                        await store.put(path, contents);
                        return 'DB saved:' + path;
                    }
                }
            }));
            result.concat(await Promise.all(I.toArr(dst).filter(entry => {
                if (!entry[1]) return '';
                let e2 = src[entry[0]],
                    path = entry[0];
                if (!e2 || entry[1].timestamp > e2.timestamp) {
                    return true;
                }
                return false;

            }).map(entry => entry[0]).sort().map(async path => {
                let msg = '';
                if (!IsReady) {
                    M.removeLocalEntry(path);
                    msg = 'FS remove:';
                } else {
                    await store.remove(path, true);
                    msg = 'DB remove:';
                }
                return msg + entry[0];
            })));
            M.T.runaction('indexdb-sync',[IsReady,result]);
            return result.join("\n");
        }
        loadLocalEntry(path) {
            let M=this,FS = M.FS,
                stat, node;
            if (FS.analyzePath(path).exists) {
                var lookup = FS.lookupPath(path);
                node = lookup.node;
                stat = FS.stat(path)
            } else {
                return path + ' is exists'
            }
            if (FS.isDir(stat.mode)) {
                return {
                    timestamp: stat.mtime,
                    mode: stat.mode
                };
            } else if (FS.isFile(stat.mode)) {
                node.contents = M.getFileDataAsTypedArray(node);
                return {
                    timestamp: stat.mtime,
                    mode: stat.mode,
                    contents: node.contents
                };
            } else {
                return "node type not supported";
            }
        }
        storeLocalEntry(path, entry) {
            let M=this,T=M.T,FS = M.FS
            if (FS.isDir(entry.mode)) {
                !FS.analyzePath(path).exists && FS.createPath('/', path, !0, !0)
            } else if (FS.isFile(entry.mode)) {
                let p = path && path.split('/').slice(0, -1).join('/');
                if (p && !FS.analyzePath(p).exists) FS.createPath('/', p, !0, !0);
                FS.writeFile(path, entry.contents, {
                    canOwn: true,
                    encoding: "binary"
                });
            } else {
                T.Err("node type not supported");
            }
            FS.chmod(path, entry.mode);
            FS.utime(path, entry.timestamp, entry.timestamp);
            return 'FS saved:' + path;
        }
        removeLocalEntry(path) {
            let FS = this.FS;
            if (FS.analyzePath(path).exists) {
                var stat = FS.stat(path);
                if (FS.isDir(stat.mode)) {
                    FS.rmdir(path)
                } else if (FS.isFile(stat.mode)) {
                    FS.unlink(path)
                }
                return 'FS unlink:' + path;
            } else {
                return path + 'is not exists';
            }
        }
        async getRemoteSet(store, callback) {
            let remote = {
                'type': "remote",
                store,
                entries: await store.cursor('timestamp', true)
            };
            callback && callback(remote);
            return remote;
        }
        getLocalSet(mount, callback) {
            let M = this,T=M.T;
            if (!mount) T.Err('mount:PATH ERROR');
            let result = {
                "type": "local",
                entries: M.getLocalList(mount.mountpoint)
            };
            callback && callback(result);
            return result
        }
        getLocalList(mountpoint) {
            mountpoint = mountpoint || '/';
            let M=this,T=M.T,FS = M.FS,
                entries = {},
                filterRoot = [".", ".."].concat(mountpoint == '/' ? ["dev", "tmp", "proc"] : []),
                isRealDir = p => !filterRoot.includes(p),
                toAbsolute = root => p => M.join2(root, p),
                check = M.stat(mountpoint) && FS.readdir(mountpoint).filter(isRealDir).map(toAbsolute(mountpoint));
            if (!check) T.Err('mount:PATH ERROR');
            while (check.length) {
                let path = check.pop();
                let stat = M.stat(path);
                if (stat) {
                    if (FS.isDir(stat.mode)) {
                        check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
                    }
                    entries[path] = {
                        timestamp: stat.mtime
                    }

                }
            }
            return entries;

        }
        stat(path) {
            let M=this,FS=M.FS,pathinfo = FS.analyzePath(path);
            if (pathinfo.exists && pathinfo.object.node_ops && pathinfo.object.node_ops.getattr) {
                return FS.stat(path);
            }
        }
        getFileDataAsTypedArray(node) {
            if (!node.contents) return new Uint8Array;
            if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
            return new Uint8Array(node.contents)
        }
        join() {
            var paths = Array.prototype.slice.call(arguments, 0);
            return this.normalize(paths.join("/"))
        }

        join2(l, r) {
            return this.normalize(l + "/" + r)
        }
        normalize(path) {
            var isAbsolute = path.charAt(0) === "/",
                trailingSlash = path.substring(-1) === "/";
            path = this.normalizeArray(path.split("/").filter(p => {
                return !!p
            }), !isAbsolute).join("/");
            if (!path && !isAbsolute) {
                path = "."
            }
            if (path && trailingSlash) {
                path += "/"
            }
            return (isAbsolute ? "/" : "") + path
        }

        normalizeArray(parts, allowAboveRoot) {
            var up = 0;
            for (var i = parts.length - 1; i >= 0; i--) {
                var last = parts[i];
                if (last === ".") {
                    parts.splice(i, 1)
                } else if (last === "..") {
                    parts.splice(i, 1);
                    up++
                } else if (up) {
                    parts.splice(i, 1);
                    up--
                }
            }
            if (allowAboveRoot) {
                for (; up; up--) {
                    parts.unshift("..")
                }
            }
            return parts
        }
        ops_write = (stream, buffer, offset, length, position, canOwn) => {
            let M = this;
            if (M.HEAP8 && buffer.buffer === M.HEAP8.buffer) {
                canOwn = false
            }
            if (!length) return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    M.update(stream);
                    node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            M.MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
            else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        };
        updatePromise(stream) {
            let M = this;
            return new Promise((resolve, reject) => {
                if (!M.updateList.includes(stream.node.mount)) M.updateList.push(stream.node.mount);
                let Timer = setInterval(() => {
                    if (M.updateTime && Timer != M.updateTime) {
                        clearInterval(Timer);
                        reject('other update');
                    }
                    if (stream.fd == null) {
                        clearInterval(Timer);
                        resolve('ok');
                    }
                }, M.speed);
                M.updateTime = Timer;
            });
        }
        updatePath = [];
        updateList = [];
        async updateMount() {
            let M = this;
            if (M.updateList.length) {
                let list = M.updateList.map(async mount => M.syncfs(mount, e => console.log(e)));
                M.updateList = [];
                M.updatePath = [];
                await Promise.all(list);
            }
        }
        update(stream) {
            let M = this;
            if (!M.getStoreName(stream.node.mount)) return;
            if (stream.path && stream.fd != null && !M.updatePath.includes(stream.path)) {
                M.updatePath.push(stream.path)
                M.updatePromise(stream).then(result => M.updateMount());
            }
        }
        MKFILE(path, data, bool) {
            let FS = this.FS,
                dir = path.split('/');
            if (dir.length) dir = dir.slice(0, -1).join('/');
            else dir = '/';
            if (!FS.analyzePath(dir).exists) {
                let pdir = dir.split('/').slice(0, -1).join('/');
                if (!FS.analyzePath(pdir).exists) FS.createPath('/', pdir, !0, !0);
                FS.createPath('/', dir, !0, !0);
            }
            if (typeof data == 'string') data = new TextEncoder().encode(data);
            if (bool) {
                if (FS.analyzePath(path).exists) FS.unlink(path);
                FS.writeFile(path, data, {
                    canOwn: true,
                    encoding: "binary"
                });
            } else if (!FS.analyzePath(path).exists) {
                FS.writeFile(path, data, {
                    canOwn: true,
                    encoding: "binary"
                });
            }
        }
    }
    let T = this,I=T.is;
    I.defines(Mount.prototype,{T,I},1);
    I.defines(Module.prototype,{Mount,T,I},1);
    const myModule = new Module(window.Module);
    I.define(T, 'Module', {
        get() {
            return myModule
        }
    });
    window.Module = myModule;
}).call(Nenge)