(function () {
    let T = this;
    let RAND = T.unitl.random;
    let Module = this.Module;
    this.speed = 1000 / 60;
    this.action = {
        'showmenu': elm => {
            elm.classList.toggle('active');
            this.runaction('hideother');
        },
        'closemenu': () => this.$('.g-header .g-menu').classList.remove('active'),
        'showsys': elm => {
            if (!T.$('.g-header .g-hideother').hidden) return this.runaction('hideother');
            Module.KeyCode_click('menu_toggle');
        },
        'hideother': () => {
            ['g-file'].forEach(val => {
                let newelm = T.$('.g-main .' + val);
                if (newelm) newelm.hidden = true;
            });
            T.$('.g-header .g-hideother').hidden = true;
        },
        'forward': elm => {
            Module.KeyCode_click('toggle_fast_forward');
        },
        'runtest': () => {
            T.runaction('game-cores-run');
        },
        'game-welcome-elm': elm => {
            elm = elm||T.$('.game-ui .g-welcome-result');
            if (elm) {
                let div = T.$ce('div');
                elm.appendChild(div);
                return div;
            }
        },
        'game-welcome-additem': file => {
            let result = T.$('.game-ui .g-welcome-result');
            if(!result) return;
            let div = this.runaction('game-welcome-elm',[result]);
            div.innerHTML = T.runaction('span_button_string', [file, {
                'data-downtext': {
                    'class': "g-btn",
                    'name': file,
                    'type': "down"
                },
                'data-loadtext': {
                    'class': "g-btn g-right g-blue",
                    'name': file,
                    'type': "file"
                }
            }, result]);

        },
        'game-welcome-WriteFile': async (file, elm) => {
            let info = Module.RoomsInfo[file];
            if (elm) {
                elm.removeAttribute('data-name');
                elm = elm.parentNode;
                elm.innerHTML = '';
            }
            let contents = await T.getContent('data-rooms', file);
            if (info.unFile === false) {
                Module.CreateDataFile(info.file[0], contents);
                this.runaction('game-welcome-additem', [info.file[0]]);
            } else {
                let zipdata = await T.unitl.unFile(contents, text => {
                    if (elm) elm.innerHTML = text
                });
                if (zipdata instanceof Uint8Array) {
                    Module.CreateDataFile(info.file[0], zipdata);
                    this.runaction('game-welcome-additem', [info.file[0]]);
                } else {
                    Object.entries(zipdata).forEach(
                        entry => {
                            Module.CreateDataFile(entry[0], entry[1]);
                            this.runaction('game-welcome-additem', [entry[0]]);
                            zipdata[entry[0]] = null;
                        }
                    );
                    zipdata = null;
                }
            }
            if (elm) elm.remove();
            contents = null;
        },
        'game-welcome-ReadRooms': async () => {
            this.$('.g-header .g-add').hidden = false;
            this.$('.game-ui').hidden = false;
            this.$('.g-main .g-start-ui').remove();
            Module.RoomsInfo = await T.GetItems('data-info');
            let result = T.$('.game-ui .g-welcome-result');
            if(!result) return ;
            Object.entries(Module.RoomsInfo).forEach(entry => {
                let isShow = false;
                let html = T.runaction('span_button_string', [entry[0], {
                    'data-loaddata': {
                        'class': "g-btn g-right",
                        'name': entry[0],
                        'type': "info"
                    }
                }, result]);
                html += '<ul>';
                entry[1].file.forEach(val => {
                    html += '<li>' + val + '</li>';
                    if (!isShow && Module.system_ext && Module.system_ext.includes(val.split('.').pop())) {
                        isShow = true;
                    }
                });
                html += '</ul>';
                if (!isShow) {
                    let entry_sys = entry[0].split('-')[0].split('|');
                    entry_sys.forEach(val => {
                        if (!isShow) isShow = Module.system_name && Module.system_name.includes(val) || false;
                    });
                }
                if (isShow) {
                    let div = this.runaction('game-welcome-elm',[result]);
                    if (div) div.innerHTML = html;
                }
            });
        },
        'game-content-add': () => {
            if (!Module.system_name) return;
            this.runaction('upload', [async (file, filename, Mime) => {
                let filetype = filename.split('.').pop().split('?')[0],
                    bigfile = file.size > T.maxsize,
                    u8 = new Uint8Array(await file.arrayBuffer());
                if (!Mime || bigfile) {
                    filetype = T.unitl.checkBuffer(u8);
                    if (filetype !== 'unkonw') {
                        filename = filename.split('.').slice(0, -1).join('.') + '.' + filetype;
                        Mime = T.unitl.gettype(filetype);
                        file = new File([file], filename, {
                            'type': Mime
                        });
                    }
                }
                let key = Module.system_name.join('|') + '-' + filename;
                if (bigfile) {
                    u8 = new Uint8Array(await file.arrayBuffer());
                }
                let unpack = ['zip', 'rar', '7z'].includes(filetype),
                    unList = [];
                if (Module.system_zip && filetype == 'zip') unpack = false;
                if (unpack) {
                    let div = this.runaction('game-welcome-elm');
                    let zipdata = await T.unitl.unFile(u8, text => {
                        div && (div.innerHTML = filename + ' -- ' + text)
                    });
                    div && div.remove();
                    Object.entries(zipdata).forEach(
                        entry => {
                            unList.push(entry[0].split('/').pop());
                            Module.CreateDataFile(entry[0], entry[1]);
                            this.runaction('game-welcome-additem', [entry[0]]);
                            zipdata[entry[0]] = null;

                        }
                    )
                    zipdata = null;
                } else {
                    unList.push(filename);
                    Module.CreateDataFile(filename, u8);
                    this.runaction('game-welcome-additem', [filename]);
                }
                let content = {
                    'contents': bigfile ? u8 : file,
                    'filesize': file.size,
                    'timestamp': T.DATE,
                    'type': bigfile ? 'Uint8Array' : 'File',
                    'version': T.version,
                    'unpack': unpack,
                    'system': Module.system_name
                };
                await T.setItem('data-rooms', key, content);
                delete content.contents;
                content.file = unList;
                await T.setItem('data-info', key, content)
                content = null;
                u8 = null;
                file = null;
            }]);
        },
        'game-content-bios': async elm => {
            let url = Module.system_bios;
            if (url) {
                elm.removeAttribute('data-click');
                T.FectchItem({
                    'url': url + (url.includes('?') ? '#' : '?') + RAND,
                    'unpack': true,
                    'store': 'data-libjs',
                    'key': 'bios-' + url.split('/').pop(),
                    'process': text => {
                        elm.innerHTML = text;
                    },
                    'success': data => {
                        if (!data) return elm.innerHTML = elm.getAttribute('data-error');
                        Object.entries(data).forEach(entry => {
                            Module.CreateDataFile('/system/' + entry[0], entry[1]);
                        });
                        elm.innerHTML = elm.getAttribute('data-sussces');
                    }
                });
            }
        },
        'game-content-write': (elm, e) => {
            let aelm = e.target;
            let file = aelm.getAttribute('data-name');
            if (file) {
                let type = aelm.getAttribute("data-type");
                if (type) {
                    if (type == 'file') T.runaction('game-cores-run',[file]);
                    else if (type == 'down') T.unitl.download(file.split('/').pop(), Module.FS.readFile(file));
                    else if (type == 'info') this.runaction('game-welcome-WriteFile', [file, aelm])
                }
            }
        },
        'game-FS-ui-file': async ( FS,elm) => {
            if (Module.system_noui) return;
            FS = FS || Module.FS;
            let uiname = Module.system_ui || 'glui';
            if (!FS.analyzePath('/bundle/assets/' + uiname + '/').exists) Object.entries(await this.FectchItem({
                'url': this.JSpath + 'frontend/' + uiname + '-bundle.png?' + RAND,
                'unpack': true,
                'store': 'data-libjs',
                'key': 'retroarch-ui-' + uiname,
                'version': T.version,
                'process': text => {
                    if (elm) elm.innerHTML = text;
                }
            })).forEach(value => {
                Module.CreateDataFile('/home/web_user/retroarch/bundle/' + value[0], value[1]);
            });
        },
        'game-FS-mkdir-base': FS => {
            [
                '/userdata/saves',
                '/userdata/states',
                '/userdata/screenshots',
                '/userdata/cheats',
                '/userdata/rooms',
                '/userdata/rooms/downloads',
                '/userdata/config',
                '/userdata/config/remaps',
                '/userdata/thumbnails',
                '/system',
            ].forEach(
                dir => {
                    if (!FS.analyzePath(dir).exists) {
                        FS.createPath('/', dir, !0, !0);
                    }
                }
            )
        },
        'game-FS-mount-db': async FS => {
            FS.createPath('/', '/userdata', !0, !0);
            FS.createPath('/', '/home/web_user/retroarch/userdata', !0, !0);
            FS.mount(Module.SyncFsDB, {}, '/userdata');
            FS.mount(Module.SyncFsDB, {}, '/home/web_user/retroarch/userdata');
            await Module.SyncFsDB.mountReady();

        },
        'game-FS-config-cfg': async (FS, path, data, isconfig) => {
            if (!FS.analyzePath(path).exists) {
                let cfg_txt = '',
                    name = path.split('/').pop();
                if (isconfig) {
                    let configdata = await T.FectchItem({
                        'url': this.JSpath + 'config/' + name + '.js?' + RAND
                    }) || '';
                    if (configdata) {
                        cfg_txt = new TextDecoder().decode(configdata);
                    }
                }
                if (data instanceof Uint8Array) data = new TextDecoder().decode(data);
                if (data) cfg_txt += '\n' + data;
                if (name == 'retroarch.cfg' && !data) {
                    cfg_txt += '\nsavefile_directory = "userdata/saves"' +
                        '\nsavestate_directory = "userdata/states"' +
                        '\nscreenshot_directory = "userdata/screenshots"' +
                        '\nsystem_directory = "system/"' +
                        '\nrgui_browser_directory = "userdata/rooms"' +
                        '\ncore_assets_directory = "userdata/rooms/downloads"' +
                        '\ncheat_database_path = "userdata/cheats"' +
                        '\nrgui_config_directory = "userdata/config"' +
                        '\ninput_remapping_directory = "userdata/config/remaps"' +
                        '\nthumbnails_directory = "userdata/thumbnails"';
                }
                Module.CreateDataFile(path, cfg_txt);
            }

        },
        'game-cores-run': file => {
            T.$('.game-ui .g-welcome') && T.$('.game-ui .g-welcome').remove();
            this.$('.g-header .g-forward').hidden = false;
            if (Module.wasmBinary){
                Module.wasmBinary=null;
                delete Module.wasmBinary;
            }
            if (Module.memFile) {
                Object.entries(Module.memFile).forEach(entry => {
                    T.unitl.removeURL(entry[1]);
                    Module.memFile[entry[0]] = null;
                    delete Module.memFile[entry[0]];
                });
                Module.memFile = null;
                delete Module.memFile;
            }
            if (Module.jsFile) {
                Object.entries(Module.jsFile).forEach(entry => {
                    Module.jsFile[entry[0]] = null;
                    delete Module.jsFile[entry[0]];
                });
                Module.jsFile = null;
                delete Module.jsFile;
            }
            let info = ['-verbose', file || Module.gameFile || '--menu'];
            if (Module.argumentsInfo) info = Module.argumentsInfo(file);
            Module.callMain(info);
        },
        'game-cores-base':async (FS,elm)=>{
            await T.runaction('game-FS-mount-db',[FS]);
            T.runaction('game-FS-mkdir-base',[FS]);
            await T.runaction('game-FS-config-cfg',[FS,'/home/web_user/retroarch/userdata/retroarch.cfg','',true]);
            await T.runaction('game-FS-ui-file', [FS,elm]);
        },
        'game-cores-start': async (ul, e) => {
            let elm = e.target;
            if (!elm || !elm.getAttribute('data-sys')) return;
            let sys = elm.getAttribute('data-sys');
            elm.removeAttribute('data-sys');
            this.Module.canvas = this.$('#canvas');
            let sys2 = sys.replace(/\-/g, '_'),
                sysext = elm.getAttribute('data-mode') ? '_' + elm.getAttribute('data-mode') : '',
                sysurl = this.JSpath + 'cores/' + sys2 + sysext + '.png?' + RAND;
            Module.system_key = sys;
            Module.system_keytext = sys2;
            Module.system_keyend = sysext;
            Module.system_fullkey = sys2 + sysext;
            let corefile = await this.FectchItem({
                'url': sysurl,
                'unpack': true,
                'unpack': true,
                'store': 'data-libjs',
                'key': 'cores-' + sys2 + sysext,
                'version': T.version,
                'process': text => {
                    elm.innerHTML = text;
                }
            });
            Module.jsFile = {};
            Object.entries(corefile).forEach(entry => {
                if (/\.wasm/.test(entry[0])) Module.wasmBinary = entry[1];
                else if (/\.mem/.test(entry[0])) Module.memFile[entry[0].split('/').pop()] = T.unitl.URL(entry[1], 'application/octet-stream');
                else if (/\.js/.test(entry[0])) Module.jsFile[entry[0]] = new TextDecoder().decode(entry[1]);
                delete corefile[entry[0]];
            });
            Module.onRuntimeInitialized = async () => {
                if(Module.myRuntimeInitialized){
                    await Module.myRuntimeInitialized();
                }else{
                    await T.runaction('game-cores-base',[Module.FS,elm]);
                }
                await T.runaction('game-welcome-ReadRooms');
                corefile = null;
            };
            if (Module.jsFile[sys2 + '_libretro.js']) {
                if (sys2 == 'mednafen_psx_hw') {
                    Module.jsFile[sys2 + '_libretro.js'] = new TextDecoder().decode(await await this.FectchItem({
                        'url': this.JSpath + sys2 + '_libretro.js?' + RAND
                    }));
                }
                await T.addJS(Module.jsFile['main.js'] ? Module.jsFile['main.js'] : this.JSpath + 'action/' + sys2 + sysext + '.js?' + RAND);
                let coreTxt = this.runaction('retroarchjs_replace', [Module.jsFile[sys2 + '_libretro.js']]);
                new Function('Module', coreTxt)(Module);
            }else if(Module.jsFile['retroarch.js']){
                window.Module = Module;
                await T.addJS(Module.jsFile['main.js'] ? Module.jsFile['main.js'] : this.JSpath + 'action/' + sys2 + sysext + '.js?' + RAND);
                let coreTxt = this.runaction('retroarchjs_replace', [Module.jsFile['retroarch.js']]);
                if(Module.myReplace)coreTxt = Module.myReplace(coreTxt);
                await T.addJS(coreTxt);
                Module.RetroarchJS&&Module.RetroarchJS();
            }
        },
        'file-toggle-result': elm => {
            let db = elm.getAttribute('data-db');
            let elm2 = this.$('.g-file .result-' + db);
            if (elm2) {
                elm2.hidden = !elm2.hidden;
            }

        },
        'file-read-data': async elm => {
            let db = elm.getAttribute('data-db');
            let gelm = T.$('.g-main .g-file');
            let html = '';
            if (db == 'data-info') {
                let db2 = 'data-rooms';
                Object.entries(await T.GetItems(db)).forEach(entry => {
                    let file = entry[0];
                    html += '<li>';
                    let spandata = {
                        'data-deltext': {
                            'class': 'g-btn g-red',
                            'name': file,
                            'type': 'del',
                            'db': db,
                        },
                        'data-writetext': {
                            'class': 'g-btn g-right g-blue2',
                            'name': file,
                            'type': 'write',
                            'db': db2,
                        },
                        'data-downtext': {
                            'class': 'g-btn g-right g-blue',
                            'name': file,
                            'type': 'down',
                            'db': db2,
                        },
                    };
                    delete spandata[Module.onRunning ? 'data-downtext' :  'data-writetext'];
                    html += T.runaction('span_button_string', [file, spandata, gelm]);
                    if (entry[1].file) {
                        html += '<ul>';
                        entry[1].file.forEach(f => {
                            html += '<li>' + f + '</li>';
                        });
                        html += '</ul>';
                    }
                    html += '</li>'
                });
            } else {
                let islibjs = !['userdata', 'retroarch'].includes(db);
                if (!Module.FS || islibjs) {
                    let path = elm.getAttribute('data-path');
                    if (path) this.$('.g-file .tips-' + db).innerHTML = path;
                    Array.from(await T.getAllKeys(db) || []).forEach(entry => {
                        if (!islibjs && !entry.split('.')[1]) return;
                        let file = entry;
                        if (path) file = file.replace(path, '');
                        html += '<li>';
                        let spandata = {
                            'data-deltext': {
                                'class': "g-btn g-red",
                                'name': entry,
                                'type': "del",
                                'db': db,
                            },
                            'data-edittext': {
                                'class': "g-btn g-blue",
                                'name': entry,
                                'type': "edit",
                                'db': db,
                            },
                            'data-downtext': {
                                'class': "g-btn g-right g-blue",
                                'name': entry,
                                'type': "down",
                                'db': db,
                            },

                        };
                        if (islibjs) {
                            delete spandata['data-edittext'];
                            delete spandata['data-downtext'];
                        } else {
                            if (!['cfg', 'opt', 'cht'].includes(file.split('.').pop())) delete spandata['data-edittext'];
                        }
                        html += T.runaction('span_button_string', [file, spandata, gelm]);
                        html += '</li>';

                    });
                }
            }
            if (!html) html = gelm.getAttribute('data-nulltext');
            this.$('.g-file .result-' + db).innerHTML = html;
            this.$('.g-file .result-' + db).hidden = false;

        },
        'file-result-action': async (elm, e) => {
            let newelm = e.target;
            let type = newelm.getAttribute('data-type');
            let db = newelm.getAttribute('data-db');
            let file = newelm.getAttribute('data-name');
            if (db) {
                if (type == 'down'){
                    T.unitl.download(file.split('/').pop(), await T.getContent(db=='data-info'?'data-rooms':db, file));
                }else if (type == 'del') {
                    await T.removeItem(db, file);
                    if (db == 'data-info') await T.removeItem('data-rooms', file);
                    newelm.parentNode.remove();
                } else if (type == 'write') {
                    this.runaction('game-welcome-WriteFile', [file, newelm]);
                }
            }
        },
        'file-clear-data': async elm => {
            let db = elm.getAttribute('data-db');
            await T.clearDB(db);
            if (db == 'data-rooms') await T.clearDB('data-info');
        },
        'upload': func => {
            let input = T.$ce('input');
            input.type = 'file';
            input.onchange = e => {
                let files = e.target.files;
                if (files && files.length > 0) {
                    Object.entries(files).forEach(file => {
                        return func(file[1], file[1].name, file[1].type);
                        file[1].arrayBuffer().then(buf => {
                            func(new Uint8Array(buf), file[1].name, file[1].type);
                        })
                    });
                }
                input.remove();
            };
            input.click();
        },
        'setting-callback': (elm, e) => {
            let target = e.target;
            if (target instanceof Element) {
                let setting = target.getAttribute('data-setting');
                if (setting) T.runaction('setting-' + setting, [target, e]);
            }
        },
        'setting-showfile': elm => {
            this.$('.g-main .g-file').hidden = false;
            this.$('.g-header .g-hideother').hidden = false;
            T.runaction('closemenu');
        },
        'setting-reload': () => {
            location.reload();
        },
        'setting-quality': (elm) => {
            let p = elm.getAttribute('data-p');
            if (p) {
                p = parseInt(p);
                Module.canvasQuality = p > 0 ? p : 720;
                Module.resizeCanvasSize();
                T.runaction('closemenu');
            }
        },
        'setting-record-action': () => {
            let Record = this.runaction('setting-record-create');
            if (Record) {
                if (Record.state == 'recording') Record.stop();
                else Record.start();
            }
            this.runaction('closemenu');
        },
        'setting-record-create': () => {
            if (!this.Module.onRunning || !this.Module.canvas) return;
            if (this.Module.Record) return this.Module.Record;
            let Media_Stream = this.Module.canvas.captureStream(30);
            let recorder;
            if (Media_Stream) {
                ['video/mp4', 'video/webm'].forEach(val => {
                    if (!recorder && MediaRecorder.isTypeSupported(val)) recorder = new MediaRecorder(Media_Stream, {
                        'mimeType': val
                    });
                });
            }
            if (recorder) {
                recorder.Blobs = [];
                recorder.ondataavailable = e => {
                    recorder.Blobs.push(e.data);
                };
                T.on(recorder, 'stop', e => {
                    if (recorder.Blobs.length > 0) {
                        let mime = recorder.mimeType.split(';')[0].replace(/\s/g, '');
                        console.log(mime);
                        this.unitl.download('录像recorder.' + mime.split('/')[1], new Blob(recorder.Blobs, {
                            'type': mime
                        }), mime);
                        recorder.Blobs = [];
                    }
                });
                this.Module.Record = recorder;
                return recorder;
            }
        },
        'span_button_string': (first, data, elm) => {
            let html = '';
            if (first) html += '<span>' + first + '</span>';
            if (data) {
                Object.entries(data).forEach(entry => {
                    let name = entry[0];
                    if (/^data-/.test(name)) name = elm.getAttribute(name);
                    if (!entry[1]) {
                        html += '<span>' + name + '</span>';
                    } else {
                        html += '<span';
                        Object.entries(entry[1]).forEach(key => {
                            if (key[0] == 'class') html += ' class="' + key[1] + '"';
                            else html += ' data-' + key[0] + '="' + key[1] + '"';
                        });
                        html += '>' + name + '</span>';
                    }
                });
            }
            return html;
        },
        'getSys': name => {
            let ext = name.split('.').pop();
            for (let [key, value] of Object.entries(this.action.sysType)) {
                if (value.includes(ext)) {
                    return key;
                }
            }
        },
        'checkSys': (name, sys) => {
            let ext = name.split('.').pop();
            let value = this.action.sysType[sys];
            return value.includes(ext);
        },
        'sysType': {
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
        },
        'retroarchjs_replace': txt => txt.replace(
                /_RWebAudioInit\(latency\)\s?\{/,
                '_RWebAudioInit(latency){Module.latency=latency;try{'
            )
            .replace(
                /Module\["pauseMainLoop"\]\(\);\n?\s*return\s?1\n?\s*\}/,
                'Module["pauseMainLoop"]();return 1;}catch(e){Module.RA_RERUN(RA);return 1;}}'
            ).replace(
                /function\s?_RWebAudioStart\(\)\s?\{/,
                'function _RWebAudioStart() {if(RA.context.state!="running"){Module.RA_RERUN(RA);}'
            ).replace(
                /_RWebAudioWrite\(\)\s?\{/,
                '_RWebAudioWrite(buf,size){if(RA.context.state!="running")return Module.RA_RERUN(RA);'
            ).replace(
                /_RWebAudioWriteAvail\(\)\s?\{/,
                `_RWebAudioWriteAvail (){return 0;`
            ).replace(
                /function\s?_RWebCamInit\(caps1,\s?caps2,\s?width,\s?height\)\s?\{/,
                `function _RWebCamInit( caps1, caps2, width, height) {alert(44);return 0;`
            ).replace(
                /\"mouse(up|down|move|enter|leave)\"/g,
                '"pointer$1"'
            ).replace(
                /if\s?\(node\.usedBytes\s?===\s?0\s?&&\s?position\s?===\s?0\)\s?\{\n?\s*node\.contents\s?=\s?new\s?Uint8Array\(buffer\.subarray\(offset,\s?offset\s?\+\s?length\)\);/,
                'if (node.usedBytes === 0 && position === 0) {if(this.SyncFsDB)this.SyncFsDB.synckUpate(stream);node.contents = new Uint8Array(buffer.subarray(offset, offset + length));'
            ).replace(
                /**auto sync FS git@github.com:BinBashBanana/webretro.git */
                /if\s?\(node\.usedBytes\s?===\s?0\s?&&\s?position\s?===\s?0\)\s?\{\n?\s*node\.contents\s?=\s?buffer\.slice\(offset,\s?offset\s?\+\s?length\);/,
                'if (node.usedBytes === 0 && position === 0) {if(this.SyncFsDB)this.SyncFsDB.synckUpate(stream);node.contents = buffer.slice(offset, offset + length);'
            ).replace(
                /msync:\s?MEMFS\.stream_ops\.msync/,
                `'msync':MEMFS.stream_ops.msync,
            'SyncFsDB':Module.SyncFsDB,`
            ).replace(
                /calledMain\s?=\s?true/,
                'calledMain = true;Module.onRunning=true;'
            ).replace(
                /**auto canvas position FS git@github.com:BinBashBanana/webretro.git */
                /HEAP32\[idx\s?\+\s?9\]\s?=\s?e\["movementX"\];\n?\s*HEAP32\[idx\s?\+\s?10\]\s?=\s?e\["movementY"\];\n?\s*var\s?rect\s?=\s?getBoundingClientRect\(target\);/,
                `var rect = getBoundingClientRect(target);
            var movementX = e.movementX || e.pageY - JSEvents.previousScreenX;
            var movementY = e.movementY || e.pageY - JSEvents.previousScreenY;
            HEAP32[idx + 9] = movementX;
            HEAP32[idx + 10] = movementY;
            if (e.type !== "wheel" && e.type !== "mousewheel") {
                JSEvents.previousScreenX = e.pageY;
                JSEvents.previousScreenY = e.pageY
            }
            if(target.widthNative!=rect.width){
                let sacl = target.widthNative/rect.width;
                HEAP32[idx + 11] = Math.ceil((e.clientX - rect.left)*sacl);
                HEAP32[idx + 12] = Math.ceil((e.clientY - rect.top)*sacl);
                return ;
            }
            `
            ).replace(
                /var rect\s?=\s?__specialEventTargets\.indexOf\(target\)\s?\s?<\s?0\s?\?\s?__getBoundingClientRect\(target\)\s?:\s?\{\n?\s*"left":\s?0,\n?\s*"top":\s?0\n?\s*\};/,
                `target = target  instanceof Element?target:Module.canvas;
            var rect = __getBoundingClientRect(target);
            if(rect.width!=target.widthNative){
                let sacl = target.widthNative/rect.width;
                rect = {
                    left:e.clientX + (rect.left - e.clientX)*sacl,
                    top:e.clientY + (rect.top - e.clientY)*sacl
                };
            }
            `
            ).replace(
                /if\s?\(Module\["noInitialRun"\]\)/,
                `Module.FS = FS;
            Module.GL = GL;
            Module.SYSCALLS = SYSCALLS;
            Module.RA = RA;
            Object.assign(
                Module.SyncFsDB,
                PATH,
                MEMFS,
                {
                    'mount':function(mount) {
                        let node = this.createNode(null,mount.mountpoint, 16384 | 511, 0);
                        if(this.getStoreName(mount)){
                            this.mountPromise.push(this.syncfs(mount,e=>console.log(e)) );
                        }
                        return node;
                    }
                }
            );
            if(Module["noInitialRun"])`
            )
    };
    Object.assign(Module, {
        'onRunning': false,
        'memFile': {},
        'printErr': text => {
            //Video @ 879x720
            if (/Video\s@\s\d+x\d+\.?\s*$/.test(text) || /Set\s?video\s?size\sto:\s\d+x\d+\./.test(text)) {
                let wh = text.split(' ').pop().split('x');
                console.log(wh);
                Module.resizeCanvasSize(wh);
            }
            console.log(text);
        },
        'locateFile': function (path) {
            if (this.memFile[path.split('/').pop()]) return this.memFile[path.split('/').pop()];
            return T.JSpath + 'cores/' + path;
        },
        'SyncFsDB': {
            'mountList': [],
            'mountPromise': [],
            'mountReady': async function () {
                return await Promise.all(this.mountPromise);
            },
            'getStoreName': mount => {
                return T.DB_STORE_MAP[mount.mountpoint];
            },
            'syncPromise': function (stream) {
                return new Promise((resolve, reject) => {
                    if (!this.syncMountList.includes(stream.node.mount)) this.syncMountList.push(stream.node.mount);
                    let Timer = setInterval(() => {
                        if (Timer != this.syncTime) {
                            clearInterval(Timer);
                            reject('other update');
                        }
                        if (stream.fd == null) {
                            clearInterval(Timer);
                            resolve('ok');
                        }
                    }, T.speed);
                    if (this.syncTime) clearInterval(this.syncTime);
                    this.syncTime = Timer;
                });
            },
            'syncMountList': [],
            'syncMount': async function () {
                if (this.syncMountList.length) {
                    let list = this.syncMountList.map(async mount => this.syncfs(mount));
                    this.syncMountList = [];
                    this.syncPath = [];
                    await Promise.all(list);
                }
            },
            'syncPath': [],
            'synckUpate': function (stream) {
                if (!this.getStoreName(stream.node.mount)) return;
                if (stream.path && stream.fd != null && !this.syncPath.includes(stream.path)) {
                    this.syncPath.push(stream.path)
                    console.log(stream);
                    this.syncPromise(stream).then(result => this.syncMount());
                }
            },
            'syncfs': async function (mount, callback, error) {
                error = error || (e => {
                    console.log(e);
                });
                let storeName = this.getStoreName(mount);
                if (!storeName) return console.log('indexDB Store Name erro', mount);
                let IsReady = mount.isReady,
                    local = await this.getLocalSet(mount),
                    remote = await this.getRemoteSet(storeName),
                    src = !IsReady ? remote : local,
                    dst = !IsReady ? local : remote;
                mount.isReady = true;
                if (!IsReady) this.mountList.push(mount.mountpoint);
                if (!remote || remote.entries.length == 0) return error('no data');
                let {
                    create,
                    remove,
                    total
                } = this.fscheck(src.entries, dst.entries, IsReady);
                if (!total) {
                    return error('no file need to sysfs');
                }
                let result = await this.fssync({
                    create,
                    remove,
                    store: T.transaction(storeName, remote.db),
                    type: dst.type
                });
                (callback instanceof Function) && callback(result);
                return result;
            },
            'fscheck': function (src, dst, IsReady) {
                let create = [],
                    remove = [],
                    total = 0;
                Object.entries(src).forEach(entry => {
                    var e2 = dst[entry[0]];
                    if (!e2 || entry[1].timestamp > e2.timestamp) {
                        create.push(entry[0]);
                        total++
                    }

                });
                if (IsReady) Object.entries(dst).forEach(entry => {
                    var e2 = src[entry[0]];
                    if (!e2) {
                        remove.push(entry[0]);
                        total++
                    }

                });
                return {
                    create,
                    remove,
                    total
                };
            },
            'fssync': async function (ARG) {
                let {
                    create,
                    remove,
                    store,
                    type
                } = ARG,
                result = "";
                create.sort();
                remove.sort();
                for (let a = 0; a < create.length; a++) {
                    let path = create[a];
                    if (type === "local") {
                        let entry = await this.loadRemoteEntry(store, path);
                        if (entry) {
                            result += await this.storeLocalEntry(path, entry) || ''
                        }
                    } else {
                        let entry2 = await this.loadLocalEntry(path);
                        result += await this.storeRemoteEntry(store, path, entry2)
                    }
                }
                for (let b = 0; b < remove.length; b++) {
                    let path2 = remove[b];
                    if (type === "local") {
                        result += await this.removeLocalEntry(path2);
                    } else {
                        result += await this.removeRemoteEntry(store, path2)
                    }
                }
                return result;
            },
            'loadLocalEntry': async function (path) {
                let FS = Module.FS,
                    stat, node;
                if (FS.analyzePath(path).exists) {
                    var lookup = FS.lookupPath(path);
                    node = lookup.node;
                    stat = FS.stat(path)
                } else {
                    return reject(e)
                }
                if (FS.isDir(stat.mode)) {
                    return {
                        timestamp: stat.mtime,
                        mode: stat.mode
                    };
                } else if (FS.isFile(stat.mode)) {
                    node.contents = this.getFileDataAsTypedArray(node);
                    return {
                        timestamp: stat.mtime,
                        mode: stat.mode,
                        contents: node.contents
                    };
                } else {
                    T.Err("node type not supported")
                }
            },
            'storeLocalEntry': async function (path, entry) {
                let FS = Module.FS,
                    p = path && path.split('/').slice(0, -1).join('/');
                if (p && !FS.analyzePath(p).exists) FS.createPath('/', p, !0, !0);
                if (FS.isDir(entry.mode)) {
                    FS.mkdir(path, entry.mode)
                } else if (FS.isFile(entry.mode)) {
                    FS.writeFile(path, entry.contents, {
                        canOwn: true,
                        encoding: "binary"
                    });
                } else {
                    T.Err("node type not supported");
                }
                FS.chmod(path, entry.mode);
                FS.utime(path, entry.timestamp, entry.timestamp);
                return `FS saved:${path}\n`;
            },
            'removeLocalEntry': function (path) {
                let FS = Module.FS;
                return new Promise((resolve, reject) => {
                    if (FS.analyzePath(path).exists) {
                        var stat = FS.stat(path);
                        if (FS.isDir(stat.mode)) {
                            FS.rmdir(path)
                        } else if (FS.isFile(stat.mode)) {
                            FS.unlink(path)
                        }
                        resolve(`FS unlink:${path}\n`)
                    } else {
                        return reject(`${path}is not exists\n`)
                    }
                })
            },
            'loadRemoteEntry': function (store, path) {
                return new Promise((resolve, reject) => {
                    var req = store.get(path);
                    req.onsuccess = event => {
                        resolve(event.target.result)
                    };
                    req.onerror = e => {
                        reject(req.error);
                        e.preventDefault()
                    }
                })
            },
            'storeRemoteEntry': function (store, path, entry) {
                return new Promise((resolve, reject) => {
                    var req = store.put(entry, path);
                    req.onsuccess = () => {
                        resolve(`indexDB save:${path}\n`)
                    };
                    req.onerror = e => {
                        reject(req.error);
                        e.preventDefault()
                    }
                })
            },
            'removeRemoteEntry': function (store, path) {
                return new Promise((resolve, reject) => {
                    var req = store.delete(path);
                    req.onsuccess = () => {
                        resolve(`indexDB delete:${path}\n`)
                    };
                    req.onerror = e => {
                        reject(req.error);
                        e.preventDefault()
                    }
                })
            },
            'getRemoteSet': async function (store, callback) {
                let db = await T.GET_DB(store);
                return new Promise(resolve => {
                    var type = "remote",
                        entries = {},
                        key = "timestamp",
                        STORE = T.transaction(store, db);
                    if (!STORE.indexNames.contains(key)) {
                        let remote = {
                            type,
                            db,
                            'entries': {}
                        };
                        callback && callback(remote);
                        resolve(remote);
                        return
                    }
                    T.transaction(store, db).index(key).openKeyCursor().onsuccess = evt => {
                        var cursor = evt.target.result;
                        if (cursor) {
                            entries[cursor.primaryKey] = {
                                "timestamp": cursor.key
                            };
                            cursor.continue()
                        } else {
                            let remote = {
                                type,
                                db,
                                entries
                            };
                            callback && callback(remote);
                            resolve(remote)
                        }
                    }
                })
            },
            'getLocalSet': async function (mount, callback) {
                return new Promise((resolve, reject) => {
                    if (!mount) return reject('mount:PATH ERROR');
                    let FS = Module.FS,
                        entries = {},
                        index = 0,
                        isRealDir = p => p !== "." && p !== "..",
                        toAbsolute = root => p => this.join2(root, p),
                        check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
                    if (!check) return reject('mount:PATH ERROR');
                    while (check.length) {
                        let path = check.pop();
                        index++;
                        if (FS.analyzePath(path).exists) {
                            let stat = FS.stat(path);
                            if (FS.isDir(stat.mode)) {
                                check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
                            }
                            entries[path] = {
                                timestamp: stat.mtime
                            }
                        }
                    }
                    let result = {
                        "type": "local",
                        entries
                    };
                    callback && callback(result);
                    resolve(result)
                })
            }
        },
        'resizeCanvasSize': wh => {
            if (wh) {
                [Module.width, Module.height] = wh;
                Module.AspectRatio = Module.width / Module.height;
            }
            if (Module.AspectRatio) {
                let opt = this.$('.game-ui').getBoundingClientRect(),
                    p = Module.canvasQuality || 720,
                    AspectRatio = Module.AspectRatio;
                if (typeof window.orientation != "undefined" && window.orientation != 0) {
                    T.$('.game-ui .g-ctrl').style.top = 45 + 'px';
                    AspectRatio = opt.width / opt.height;
                } else {
                    if (!T.$('.game-ui .g-ctrl').hidden) {
                        w = opt.width,
                            h = opt.width / AspectRatio;
                        if (h > opt.height) {
                            h = opt.height;
                            w = opt.height * AspectRatio;
                        }
                        T.$('.game-ui .g-ctrl').style.top = (h != opt.height ? h : 0) + 45 + 'px';
                    }
                }
                if (Module.setCanvasSize) {
                    //Module.canvasWidth = p * Module.AspectRatio;
                    //Module.canvasHeight = p;
                    Module.setCanvasSize(p * AspectRatio, p);
                }
            }
        },
        'CreateDataFile': (path, data, bool) => {
            let FS = Module.FS,
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
        },
        'KeyDown': (key, e) => {
            if (Module.keyCode_input) return Module.keyCode_input(key, true);
            let keyCode = Module.keyCode_map['input_' + key];
            if (keyCode) {
                Module.keyCode_enter(keyCode, 1);
            }
            if (e) return Module.stopEvent(e);
        },
        'KeyUp': (key, e) => {
            if (Module.keyCode_input) return Module.keyCode_input(key, false);
            let keyCode = Module.keyCode_map['input_' + key];
            if (keyCode) {
                Module.keyCode_enter(keyCode, 0);
            }
            if (e) return Module.stopEvent(e);
        },
        'KeyCode_click': key => {
            Module.KeyDown(key);
            setTimeout(() => Module.KeyUp(key), T.speed);
        },
        'keyCode_enter': (key, type) => {
            document.dispatchEvent(new KeyboardEvent(type ? 'keydown' : 'keyup', {
                'code': Module.keyCode_list[key],
                'key': key
            }));
        },
        'keyCode_map': {
            input_player1_a: "x",
            input_player1_b: "z",
            input_player1_down: "down",
            input_player1_l: "q",
            input_player1_l2: "nul",
            input_player1_l3: "nul",
            input_player1_left: "left",
            input_player1_r: "w",
            input_player1_r2: "nul",
            input_player1_r3: "nul",
            input_player1_right: "right",
            input_player1_select: "rshift",
            input_player1_start: "enter",
            input_player1_turbo: "nul",
            input_player1_up: "up",
            input_player1_x: "s",
            input_player1_y: "a",
            input_toggle_fast_forward: "space",
            input_toggle_fullscreen: "f",
            input_reset: "h",
            input_screenshot: "f8",
            input_load_state: "f4",
            input_save_state: "f2",
            input_menu_toggle: "f1",
            input_toggle_slowmotion: null,
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
            "escape": "Escape"
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
            if (!RA.context || RA.context.state != Module.RA_isSTOP && RA.context.state != Module.RA_isRUN) {
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
            }
            RA.context.resume();
            Module.resumeMainLoop();
        },
        'RA_RERUN': RA => {
            Module.pauseMainLoop && Module.pauseMainLoop();
            Module.RA_CLICK(() => {
                Module.RA_REST(RA);
            });
            return 1;
        },
        'RA_CLICK': func => {
            let elm = T.$('.g-mobile-click');
            if (!elm.hidden) return;
            elm.hidden = false;
            T.once(elm, 'pointerup', () => {
                elm.hidden = true;
                func();
            })
        }
    });
    this.docload(async () => {
        this.$$('.g-main .g-file .g-file-header').forEach(elm => {
            let data = {},
                db = elm.getAttribute('data-db');
            data[elm.innerHTML] = {
                'class': "g-btn g-blue2",
                'click': "file-toggle-result",
                db
            };
            elm.innerHTML = T.runaction('span_button_string', ['', Object.assign(data, {
                'data-cleartext': {
                    'class': "g-btn g-red",
                    'click': "file-clear-data",
                    db
                },
                'data-readtext': {
                    'class': "g-btn g-right",
                    'click': "file-read-data",
                    db
                }
            }), this.$('.g-main .g-file')]);
            let ul = T.$ce('ul');
            ul.classList.add('result-' + db);
            ul.setAttribute('data-click', 'file-result-action');
            ul.hidden = true;
            elm.parentNode.appendChild(ul);
        });
        this.$$('*[data-click]').forEach(elm => this.on(elm, 'pointerup', function (e) {
            let click = this.getAttribute('data-click');
            click && T.runaction(click, [this, e]);
        }));
        Module.stopGesture(document);
        this.on(document, 'contextmenu', e => Module.stopEvent(e));
        this.on(window, 'resize', () => Module.resizeCanvasSize());
        let keydown = function (e) {
                let key = this.getAttribute('data-key');
                key && key.split(',').forEach(k => Module.KeyDown(k));
                return Module.stopEvent(e);
            },
            keyup = function (e) {
                let key = this.getAttribute('data-key');
                key && key.split(',').forEach(k => Module.KeyUp(k));
                return Module.stopEvent(e);
            };
        this.$$('*[data-key]').forEach(elm => {
            this.on(elm, 'gotpointercapture', keydown);
            this.on(elm, 'pointerdown', keydown);
            this.on(elm, 'pointermove', keydown);
            this.on(elm, 'pointerout', keyup);
            this.on(elm, 'pointerup', keyup);
            this.on(elm, 'pointerlevel', keyup);
            Module.stopGesture(elm);
        });
    });
}).call(Nenge);