(function () {
    let T = this;
    let RAND = T.unitl.random;
    let Module = this.Module;
    this.speed = 1000 / 60;
    this.action = this.action || {};
    Object.assign(this.action, {
        'menu-show': elm => {
            elm.classList.toggle('active');
            this.runaction('menu-hide');
        },
        'menu-close': () => this.$('.g-btn-menu').classList.remove('active'),
        'menu-hide': () => {
            ['g-file-ui'].forEach(val => {
                let newelm = T.$('.' + val);
                if (newelm) newelm.hidden = true;
            });
            T.$('.g-btn-hide').hidden = true;
        },
        'menu-reload': () => {
            T.runaction('game-cores-run');
        },
        'game-welcome-elm': elm => {
            elm = elm || T.$('.g-game-welcome-result');
            if (elm) {
                let div = T.$ce('div');
                elm.appendChild(div);
                return div;
            }
        },
        'game-welcome-additem': file => {
            let result = T.$('.g-game-welcome-result');
            if (!result) return;
            let div = this.runaction('game-welcome-elm', [result]);
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
                Module.MKFILE(info.file[0], contents);
                this.runaction('game-welcome-additem', [info.file[0]]);
            } else {
                let zipdata = await T.unitl.unFile(contents, text => {
                    if (elm) elm.innerHTML = text
                });
                if (zipdata instanceof Uint8Array) {
                    Module.MKFILE(info.file[0], zipdata);
                    this.runaction('game-welcome-additem', [info.file[0]]);
                } else {
                    Object.entries(zipdata).forEach(
                        entry => {
                            Module.MKFILE(entry[0], entry[1]);
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
            this.$('.g-btn-add').hidden = false;
            this.$('.g-game-ui').hidden = false;
            this.$('.g-main .g-start-ui').remove();
            Module.RoomsInfo = await T.GetItems('data-info');
            let result = T.$('.g-game-welcome-result');
            if (!result) return;
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
                    let div = this.runaction('game-welcome-elm', [result]);
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
                            Module.MKFILE(entry[0], entry[1]);
                            this.runaction('game-welcome-additem', [entry[0]]);
                            zipdata[entry[0]] = null;

                        }
                    )
                    zipdata = null;
                } else {
                    unList.push(filename);
                    Module.MKFILE(filename, u8);
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
                            Module.MKFILE('/system/' + entry[0], entry[1]);
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
                    if (type == 'file') T.runaction('game-cores-run', [file]);
                    else if (type == 'down') T.unitl.download(file.split('/').pop(), Module.FS.readFile(file));
                    else if (type == 'info') this.runaction('game-welcome-WriteFile', [file, aelm])
                }
            }
        },
        'game-FS-ui-file': async (FS, elm) => {
            if (Module.system_noui) return;
            FS = FS || Module.FS;
            let uiname = Module.system_uiname || 'glui',
                path = Module.system_uipath || '/home/web_user/retroarch/bundle/';
            if (!FS.analyzePath(path + 'assets/' + uiname).exists) Object.entries(await this.FectchItem({
                'url': this.JSpath + 'frontend/' + uiname + '-bundle.png?' + RAND,
                'unpack': true,
                'store': 'data-libjs',
                'key': 'retroarch-ui-' + uiname,
                'version': T.version,
                'process': text => {
                    if (elm) elm.innerHTML = text;
                }
            })).forEach(value => {
                Module.MKFILE(path + value[0], value[1]);
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
            T.runaction('game-FS-mount-path', ['/userdata']);
            T.runaction('game-FS-mount-path', ['/home/web_user/retroarch/userdata']);
            await Module.FileDB.mountReady();

        },
        'game-FS-mount-path': path => {
            let FS = Module.FS;
            if (!FS.analyzePath(path).exists) {
                FS.createPath('/', path, !0, !0);
            }
            FS.mount(Module.FileDB, {}, path);
        },
        'game-FS-config-cfg': async (FS, path, data, isconfig) => {
            if (!Module.system_cfg && isconfig) {
                Module.system_cfg = path;
            }
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
                else if (name == 'retroarch.cfg' && !data) {
                    cfg_txt += T.runaction('game-FS-config-path');
                }
                Module.MKFILE(path, cfg_txt);
            }

        },
        'game-FS-config-path': () => {
            return '\nmenu_mouse_enable = "true"'+
                '\nmenu_pointer_enable = "true"'+
                '\nsavefile_directory = "userdata/saves"' +
                '\nsavestate_directory = "userdata/states"' +
                '\nscreenshot_directory = "userdata/screenshots"' +
                '\nsystem_directory = "system/"' +
                '\nrgui_browser_directory = "userdata/rooms"' +
                '\ncore_assets_directory = "userdata/rooms/downloads"' +
                '\ncheat_database_path = "userdata/cheats"' +
                '\nrgui_config_directory = "userdata/config"' +
                '\ninput_remapping_directory = "userdata/config/remaps"' +
                '\nthumbnails_directory = "userdata/thumbnails"';
        },
        'game-cores-run': file => {
            let info;
            if (Module.set_argument) info = Module.set_argument(file);
            else info = ['-verbose', file || '--menu'];
            if (!info) return;
            T.$('.g-game-welcome') && T.$('.g-game-welcome').remove();
            this.$('.g-btn-forward').hidden = false;
            if(T.isMobile)T.$('.g-game-ctrl').hidden = false;
            if (!Module.wasmBinary) {
                Module.wasmBinary = null;
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
            try{
            console.log(info);
            Module.callMain(info);
            this.on(document, 'contextmenu', e => Module.stopEvent(e));
            T.runaction('game-cores-bindkey');
            T.runaction('game-touch-key');

            }catch(e){
                console.log(e);
            }
        },
        'game-cores-forward': elm => {
            Module.KeyCode_click('toggle_fast_forward');
        },
        'game-cores-sys': elm => {
            if (!T.$('.g-btn-hide').hidden) return this.runaction('menu-hide');
            Module.KeyCode_click('menu_toggle');
        },
        'game-cores-base': async (FS, elm) => {
            try {
                await T.runaction('game-FS-mount-db', [FS]);
                T.runaction('game-FS-mkdir-base', [FS]);
                await T.runaction('game-FS-config-cfg', [FS, '/home/web_user/retroarch/userdata/retroarch.cfg', '', true]);
                await T.runaction('game-FS-ui-file', [FS, elm]);

            } catch (e) {
                console.log(e);
            }
        },
        'game-cores-bindkey': () => {
            if (Module.system_cfg && Module.FS.analyzePath(Module.system_cfg).exists) {
                let data = Module.FS.readFile(Module.system_cfg);
                if (data) {
                    (new TextDecoder().decode(data)).split("\n").forEach(line => {
                        let lineTxt = line.split('='),
                            key = lineTxt[0].trim(),
                            value = lineTxt[1] && lineTxt[1].replace(/(\s*"|\s*')/g, '').trim();
                        if (typeof Module.keyCode_map[key] != "undefined") {
                            Module.keyCode_map[key] = value;
                        }
                    });


                }
            }
        },
        'game-cores-install': async (list, e) => {
            let elm = e.target;
            if (!elm || !elm.getAttribute('data-sys')) return;
            let sys = elm.getAttribute('data-sys');
            elm.removeAttribute('data-sys');
            T.Module.canvas = T.$('#canvas');
            let sys2 = sys.replace(/\-/g, '_'),
                sysext = elm.getAttribute('data-mode') ? elm.getAttribute('data-mode')+ '/'  : '',
                sysurl = T.JSpath + 'cores/'+ sysext + sys2  + '.png?' + RAND;
            Module.system_key = sys;
            Module.system_keytext = sys2;
            Module.system_keyend = sysext;
            Module.system_fullkey = sys2 + sysext.replace(/\\/g,'_');
            let corefile = await T.FectchItem({
                'url': sysurl,
                'unpack': true,
                'unpack': true,
                'store': 'data-libjs',
                'key': 'cores-' + Module.system_fullkey,
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
            corefile = null;
            Module.onRuntimeInitialized = async () => {
                if (Module.myRuntimeInitialized) {
                    await Module.myRuntimeInitialized(Module.FS, elm);
                } else {
                    await T.runaction('game-cores-base', [Module.FS, elm]);
                }
                await T.runaction('game-welcome-ReadRooms');
            };
            let loadjs = Module.jsFile['main.js'] ? Module.jsFile['main.js'] : T.JSpath + 'action/'+ sysext + sys2  + '.js?' + RAND;
            window.Module = Module;
            let asmfile = Module.jsFile[sys2 + '_libretro.js'] || Module.jsFile['retroarch.js'];
            if (asmfile) {
                if (sys2 == 'mednafen_psx_hw') {
                    asmfile = new TextDecoder().decode(await await this.FectchItem({
                        'url': T.JSpath + sys2 + '_libretro.js?' + RAND
                    }));
                }
                await T.addJS(loadjs);
                let coreTxt = T.runaction('retroarchjs_replace', asmfile);
                if (Module.myReplace) coreTxt = Module.myReplace(coreTxt);
                await T.addJS(coreTxt);
                Module.RetroarchJS && Module.RetroarchJS();
            }
        },
        'game-touch-key': () => {
            let getkey = (elm) => {
                if (elm instanceof Element) {
                    let key = elm.getAttribute('data-key');
                    if (key && elm.classList.contains('vk')) {
                        return key;
                    }
                }
                return '';
            }
            if (T.isMobile) {
                let touchlist = [];
                this.$$('*[data-key]').forEach(elm => {
                    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(
                        evt => {
                            T.on(elm, evt, e => {
                                let newlist = [];
                                if (e.type == 'touchstart') {
                                    newlist = touchlist.concat(getkey(e.target));
                                } else if (e.touches) {
                                    if (e.touches.length) {
                                        newlist = Array.from(e.touches).map(entry => getkey(document.elementFromPoint(entry.pageX, entry.pageY)));
                                    }
                                }
                                if (newlist.length > 0) {
                                    newlist = newlist.join(',').split(',');
                                }
                                if (newlist.join() != touchlist) {
                                    Module.KeyUp(touchlist);
                                    Module.KeyDown(newlist);
                                    touchlist = newlist;
                                }
                            }, {
                                passive: false
                            });
                        }
                    )
                });

            } else {
                this.$$('*[data-key]').forEach(elm => {
                    ['mousedown'].forEach(evt => T.on(elm, evt, e => {
                        let newlist = getkey(e.target);
                        if (newlist) {
                            Module.KeyDown(newlist.split(','));
                        }
                    }));
                    ['mouseup', 'mouseout'].forEach(evt => T.on(elm, evt, e => {
                        let newlist = getkey(e.target);
                        if (newlist) {
                            Module.KeyUp(newlist.split(','));
                        }
                    }));
                })
            }
        },
        'file-menu-init': () => {
            let fileElm = T.$('.g-file-manager');
            T.$$('.g-file-header').forEach(elm => {
                let data = {},
                    db = elm.getAttribute('data-db'),
                    txt = elm.innerHTML;
                data[txt] = {
                    'class': "g-btn g-blue2",
                    'click': "file-toggle-result",
                    db
                };
                elm.innerHTML = T.runaction('span_button_string', ['', Object.assign(data, {
                    'data-cleartext': {
                        'class': "g-btn g-red",
                        'click': "file-data-clear",
                        db
                    },
                    'data-readtext': {
                        'class': "g-btn g-right",
                        'click': "file-data-read",
                        'path': elm.getAttribute('data-path') || '',
                        db
                    }
                }), fileElm]);
                ['tips', 'result'].forEach(k => {
                    let v = T.$ce(k == 'tips' ? 'div' : 'ul');
                    v.classList.add('g-' + k);
                    v.setAttribute('data-click', 'file-' + k + '-action');
                    v.setAttribute('data-db', db)
                    v.hidden = true;
                    elm.parentNode.appendChild(v);
                })
            });
            let edit_content = T.$('.g-file-editor-content'),edit_path = T.$('.g-file-editor-path');
            ['keydown','keyup'].forEach(
                evt=>[edit_content,edit_path].forEach(
                    elm=>T.on(elm,evt,e=>{e.stopPropagation();;return true},true)
                )
            );
        },
        'file-toggle-result': elm => {
            let db = elm.getAttribute('data-db');
            let elm2 = this.$('.g-result[data-db=' + db + ']');
            if (elm2) {
                elm2.hidden = !elm2.hidden;
            }

        },
        'file-data-read': async elm => {
            let db = elm.getAttribute('data-db');
            let gelm = T.$('.g-file-manager');
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
                    delete spandata[Module.onRunning ? 'data-downtext' : 'data-writetext'];
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
                    if (path) {
                        let pelm = this.$('.g-tips[data-db=' + db + ']');
                        pelm.hidden = false;
                        pelm.innerHTML = path;
                    }
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
            this.$('.g-result[data-db=' + db + ']').innerHTML = html;
            this.$('.g-result[data-db=' + db + ']').hidden = false;

        },
        'file-result-action': async (elm, e) => {
            let newelm = e.target;
            let type = newelm.getAttribute('data-type');
            let db = newelm.getAttribute('data-db');
            let file = newelm.getAttribute('data-name');
            if (db) {
                if (type == 'down') {
                    T.unitl.download(file.split('/').pop(), await T.getContent(db == 'data-info' ? 'data-rooms' : db, file));
                } else if (type == 'del') {
                    await T.removeItem(db, file);
                    if (db == 'data-info') await T.removeItem('data-rooms', file);
                    newelm.parentNode.remove();
                } else if (type == 'write') {
                    this.runaction('game-welcome-WriteFile', [file, newelm]);
                } else if (type == 'edit') {
                    T.runaction('file-data-edit', [elm, file, db]);
                }
            }
        },
        'file-data-clear': async elm => {
            let db = elm.getAttribute('data-db');
            await T.clearDB(db);
            if (db == 'data-rooms') await T.clearDB('data-info');
        },
        'file-data-edit': async (elm, file, db) => {
            if (!file) return;
            if (!db) return;
            let editor = T.$('.g-file-editor');
            if (!editor) return;
            editor.hidden = false;
            let content = T.$('.g-file-editor-content'),
                pathor = T.$('.g-file-editor-path'),
                data;
            T.$('.g-file-editor-name').innerHTML = file;
            pathor.value = file;
            pathor.setAttribute('data-db', db);
            content.disabled = true;
            if (Module.FS && !(/^data\-/.test(db))) {
                data = Module.FS.analyzePath(file) && Module.FS.readFile(file) || '';
            } else {
                data = await T.getContent(db, file) || '';
            }
            if (data && data.length) {
                content.value = new TextDecoder().decode(data);
                content.disabled = false;
            }

        },
        'file-data-submit': async () => {
            let editor = T.$('.g-file-editor');
            if (!editor) return;
            editor.hidden = false;
            T.$('.g-file-editor').hidden = true;
            let pathor = T.$('.g-file-editor-path'),
                file = pathor.value,
                db = pathor.getAttribute('data-db'),
                content = T.$('.g-file-editor-content');
            if (!file) return;
            if (!db) return;
            if (Module.FS && !(/^data\-/.test(db))) {
                if (content.disabled) Module.FS.rename(T.$('.g-file-editor-name').textContent, file);
                else if (content.value) Module.MKFILE(file, new TextEncoder().encode(content.value), true);
            } else {
                let data = await T.getItem(db, file);
                if (data) {
                    if (content.disabled) T.setItem(db, file, data);
                    else if (content.value) {
                        data.contents = new TextEncoder().encode(content.value);
                        T.setItem(db, file, data);
                    }
                }
            }
        },
        'file-editor-hide': elm => {
            elm.parentNode.parentNode.hidden = true;
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
            this.$('.g-file-ui').hidden = false;
            this.$('.g-btn-hide').hidden = false;
            T.runaction('menu-close');
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
                T.runaction('menu-close');
            }
        },
        'setting-record-action': () => {
            let Record = this.runaction('setting-record-create');
            if (Record) {
                if (Record.state == 'recording') Record.stop();
                else Record.start();
            }
            this.runaction('menu-close');
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
                'function _RWebAudioStart() {if(RA.context.state!="running") return Module.RA_RERUN(RA);'
            ).replace(
                /_RWebAudioWrite\(\)\s?\{/,
                '_RWebAudioWrite(buf,size){if(RA.context.state!="running")return Module.RA_RERUN(RA);'
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
                        m.set_fs_init(m,n,PATH);
                        m.run=run;
                    })(Module,MEMFS);`
            ),
    });
    Object.assign(Module, {
        'onRunning': false,
        'memFile': {},
        'printErr': text => {
            if (/Video\s@\s\d+x\d+\.?\s*$/.test(text) || /Set\s?video\s?size\s?to:\s?\d+x\d+\s?\.?\s?/.test(text)) {
                let wh = text.trim().split(' ').pop().split('x');
                Module.resizeCanvasSize(wh);
            }
            console.log(text);
        },
        'locateFile': function (path) {
            if (this.memFile[path.split('/').pop()]) return this.memFile[path.split('/').pop()];
            return T.JSpath + 'cores/' + path;
        },
        'FileDB': {
            'mount': function (mount) {
                if (!Module.FS.analyzePath(mount.mountpoint).exists) {
                    Module.FS.createPath('/', mount.mountpoint, !0, !0);
                }
                let len = mount.mountpoint.split('/').length;
                let node = this.createNode(len < 3 ?Module.FS.root:null,len < 3 ? mount.mountpoint.split('/').pop() : mount.mountpoint.replace(/^\//,''), 16384 | 511, 0);
                if (this.getStoreName(mount)) {
                    this.sync_mount_promise.push(this.syncfs(mount, e => console.log(e)));
                }
                return node;
            },
            'ops_write': function (stream, buffer, offset, length, position, canOwn) {
                if (buffer.buffer === Module.HEAP8.buffer) {
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
                        Module.FileDB.sync_file_update(stream);
                        node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
                        node.usedBytes = length;
                        return length
                    } else if (position + length <= node.usedBytes) {
                        node.contents.set(buffer.subarray(offset, offset + length), position);
                        return length
                    }
                }
                Module.FileDB.expandFileStorage(node, position + length);
                if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
                else {
                    for (var i = 0; i < length; i++) {
                        node.contents[position + i] = buffer[offset + i]
                    }
                }
                node.usedBytes = Math.max(node.usedBytes, position + length);
                return length
            },
            'mountReady': async function () {
                return await Promise.all(this.sync_mount_promise);
            },
            'getStoreName': mount => {
                return T.DB_STORE_MAP[mount.mountpoint];
            },
            'syncfs': async function (mount, callback, error) {
                error = error || (e => {
                    console.log(e);
                });
                let storeName = this.getStoreName(mount);
                if (!storeName) return error('indexDB Store Name erro', mount);
                let IsReady = mount.isReady,
                    local = await this.getLocalSet(mount),
                    remote = await this.getRemoteSet(storeName),
                    src = !IsReady ? remote : local,
                    dst = !IsReady ? local : remote;
                mount.isReady = true;
                if (!remote || remote.entries.length == 0) return error('no data');
                let {
                    create,
                    remove,
                    total
                } = this.sync_file_check(src.entries, dst.entries, IsReady);
                if (!total) {
                    return error('no file need to sysfs');
                }
                let result = await this.sync_file_write({
                    create,
                    remove,
                    store: T.transaction(storeName, remote.db),
                    type: dst.type
                });
                (callback instanceof Function) && callback(result);
                return result;
            },
            'sync_file_promise': function (stream) {
                return new Promise((resolve, reject) => {
                    if (!this.sync_mount_list.includes(stream.node.mount)) this.sync_mount_list.push(stream.node.mount);
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
            'sync_file_update': function (stream) {
                if (!this.getStoreName(stream.node.mount)) return;
                if (stream.path && stream.fd != null && !this.sync_mount_path.includes(stream.path)) {
                    this.sync_mount_path.push(stream.path)
                    this.sync_file_promise(stream).then(result => this.sync_mount_action());
                }
            },
            'sync_file_check': function (src, dst, IsReady) {
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
            'sync_file_write': async function (ARG) {
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
            'sync_mount_promise': [],
            'sync_mount_list': [],
            'sync_mount_action': async function () {
                if (this.sync_mount_list.length) {
                    let list = this.sync_mount_list.map(async mount => this.syncfs(mount));
                    this.sync_mount_list = [];
                    this.sync_mount_path = [];
                    await Promise.all(list);
                }
            },
            'sync_mount_path': [],
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
                return 'FS saved:' + path + '\n';
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
                        resolve('FS unlink:' + path + '\n')
                    } else {
                        return reject(path + 'is not exists\n')
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
                        resolve('indexDB save:${path}\n')
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
                        resolve('indexDB delete:${path}\n')
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
                let opt = this.$('.g-game-ui').getBoundingClientRect(),
                    p = Module.canvasQuality || 720,
                    AspectRatio = Module.AspectRatio;
                if (typeof window.orientation != "undefined" && window.orientation != 0) {
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
                    //Module.canvasWidth = p * Module.AspectRatio;
                    //Module.canvasHeight = p;
                    Module.setCanvasSize(p * AspectRatio, p);
                }
            }
        },
        'MKFILE': (path, data, bool) => {
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
            if (typeof key == 'string') key = [key];
            key.forEach(entry=>Module.keyCode_enter(Module.keyCode_map['input_' + entry], 1,entry));
            if (e) return Module.stopEvent(e);
        },
        'KeyUp': (key, e) => {
            if (typeof key == 'string') key = [key];
            key.forEach(entry=>Module.keyCode_enter(Module.keyCode_map['input_' + entry], 0,entry));
            if (e) return Module.stopEvent(e);
        },
        'KeyCode_click': key => {
            Module.KeyDown(key);
            setTimeout(() => Module.KeyUp(key), T.speed);
        },
        'keyCode_enter': (key, type,bkey) => {
            if (typeof key == "undefined"||key == "" || key == "nul" || key == "null") return;
            if (Module.myKeyEnter) return Module.myKeyEnter(type,key,bkey);
            let code = Module.keyCode_list[key];
            if(typeof code == 'undefined') return;
            let edata = typeof code == 'string' ? {code,key} : Object.assign(code,{key});
            document.dispatchEvent(new KeyboardEvent(type ? 'keydown' : 'keyup', edata));
        },
        'keyCode_map': {
            input_player1_a: "x",
            input_player1_b: "z",
            input_player1_x: "s",
            input_player1_y: "a",
            input_player1_l: "q",
            input_player1_l2: "nul",
            input_player1_l3: "nul",
            input_player1_r: "w",
            input_player1_r2: "nul",
            input_player1_r3: "nul",
            input_player1_up: "up",
            input_player1_left: "left",
            input_player1_right: "right",
            input_player1_down: "down",
            input_player1_select: "rshift",
            input_player1_start: "enter",
            input_player1_turbo: "nul",
            input_player1_l_x_minus:"nul",
            input_player1_l_x_plus:"nul",
            input_player1_l_y_minus:"nul",
            input_player1_l_y_plus:"nul",
            input_player1_r_x_minus:"nul",
            input_player1_r_x_plus:"nul",
            input_player1_r_y_minus:"nul",
            input_player1_r_y_plus:"nul",
            input_toggle_fast_forward: "space",
            input_toggle_fullscreen: "f",
            input_reset: "h",
            input_screenshot: "f8",
            input_load_state: "f4",
            input_save_state: "f2",
            input_menu_toggle: "f1",
            input_toggle_slowmotion: "nul",
            input_pause_toggle:"p",
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
        'set_fs_init': (m, n, PATH) => {
            n.stream_ops.write = m.FileDB.ops_write;
            if (n.ops_table) n.ops_table.file.stream.write = m.FileDB.ops_write;
            m.FileDB = Object.assign(PATH, n, m.FileDB);
        },
    });
    this.docload(async () => {
        T.runaction('file-menu-init');
        this.$$('*[data-click]').forEach(elm => this.on(elm, 'pointerup', function (e) {
            let click = this.getAttribute('data-click');
            click && T.runaction(click, [this, e]);
        }));
        Module.stopGesture(document);
        this.on(window, 'resize', () => Module.resizeCanvasSize());
    });
}).call(Nenge);