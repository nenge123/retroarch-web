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
            if(!file&&file!=0)return div.innerHTML =  result.getAttribute('data-nulltext');
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
                Module.FileDB.MKFILE(info.file[0], contents);
                this.runaction('game-welcome-additem', [info.file[0]]);
            } else {
                let zipdata = contents&&await T.unFile(contents, text => {
                    if (elm) elm.innerHTML = text
                });
                if (zipdata instanceof Uint8Array) {
                    Module.FileDB.MKFILE(info.file[0], zipdata);
                    this.runaction('game-welcome-additem', [info.file[0]]);
                } else if(zipdata){
                    Object.entries(zipdata).forEach(
                        entry => {
                            Module.FileDB.MKFILE(entry[0], entry[1]);
                            this.runaction('game-welcome-additem', [entry[0]]);
                            zipdata[entry[0]] = null;
                        }
                    );
                    zipdata = null;
                }else{
                    this.runaction('game-welcome-additem', [null]);
                }
            }
            if (elm) elm.remove();
            contents = null;
        },
        'game-welcome-ReadRooms': async () => {
            this.$('.g-btn-add').hidden = false;
            this.$('.g-game-ui').hidden = false;
            this.$('.g-main .g-start-ui').remove();
            Module.RoomsInfo = await T.getAllData('data-info');
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
                    let zipdata = await T.unFile(u8, text => {
                        div && (div.innerHTML = filename + ' -- ' + text)
                    });
                    div && div.remove();
                    Object.entries(zipdata).forEach(
                        entry => {
                            unList.push(entry[0].split('/').pop());
                            Module.FileDB.MKFILE(entry[0], entry[1]);
                            this.runaction('game-welcome-additem', [entry[0]]);
                            zipdata[entry[0]] = null;

                        }
                    )
                    zipdata = null;
                } else {
                    unList.push(filename);
                    Module.FileDB.MKFILE(filename, u8);
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
                            Module.FileDB.MKFILE('/system/' + entry[0], entry[1]);
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
                Module.FileDB.MKFILE(path + value[0], value[1]);
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
                Module.FileDB.MKFILE(path, cfg_txt);
            }

        },
        'game-FS-config-path': () => {
            return '\nmenu_mouse_enable = "true"' +
                '\nmenu_pointer_enable = "true"' +
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
            else info = ['--verbose', file || '--menu'];
            if (!info) return;
            T.$('.g-game-welcome') && T.$('.g-game-welcome').remove();
            this.$('.g-btn-forward').hidden = false;
            if (T.isMobile) T.$('.g-game-ctrl').hidden = false;
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
                console.log(info);
                Module.callMain(info);
                this.on(document, 'contextmenu', e => Module.stopEvent(e));
                T.runaction('game-cores-bindkey');
                T.runaction('game-touch-key');
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
                sysext = elm.getAttribute('data-mode') || '',
                sysurl = T.JSpath + 'cores/' + (sysext ? sysext + '/' : '') + sys2 + '.png?' + RAND;
            Module.system_key = sys;
            Module.system_keytext = sys2;
            Module.system_keyend = sysext;
            Module.system_fullkey = sys2 + (sysext ? '_' + sysext : '');
            let corefile = await T.FectchItem({
                'url': sysurl,
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
            let loadjs = Module.jsFile['main.js'] ? Module.jsFile['main.js'] : T.JSpath + 'action/' + (sysext ? sysext + '/' : '') + sys2 + '.js?' + RAND;
            let asmfile = Module.jsFile[sys2 + '_libretro.js'] || Module.jsFile['retroarch.js'];
            if (asmfile) {
                if (sys2 == 'snes9x'&&sysext=='BinBashBanana') {
                    asmfile = new TextDecoder().decode(await await this.FectchItem({
                        'url': T.JSpath + sys2 + '_libretro.js?' + RAND
                    }));
                }
                await T.addJS(loadjs);
                let coreTxt = Module.js_replace(asmfile);
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
            let edit_content = T.$('.g-file-editor-content'),
                edit_path = T.$('.g-file-editor-path');
            ['keydown', 'keyup'].forEach(
                evt => [edit_content, edit_path].forEach(
                    elm => T.on(elm, evt, e => {
                        e.stopPropagation();;
                        return true
                    }, true)
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
            let gelm = T.$('.g-file-manager'),
                div = T.$('.g-result[data-db=' + db + ']'),
                html = '';
                if(!div)return;
                div.hidden = false;
            if (db == 'data-info') {
                let db2 = 'data-rooms';
                Object.entries(await T.getAllData(db)).forEach(entry => {
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
                let path = elm.getAttribute('data-path');
                if (!Module.FileDB || !path) {
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
                }else{
                    return T.runaction('file-data-fs',[path,db,path])
                }
            }
            if (!html) html = gelm.getAttribute('data-nulltext');
            div.innerHTML = html;

        },
        'file-data-fs':(path,db)=>{
            let html = '',
                gelm = T.$('.g-file-manager');

            Module.FS.readdir(path).forEach(t=>{
                if(t=='.') return;
                let name = path,type='readpath';
                    if(t !='..'){
                        name += '/'+t;
                    }
                    else if(path!='/'){
                        name = path.split('/').slice(0,-1).join('/') || '/';
                        t = gelm.getAttribute('data-updirtext');
                    }else return;
                html += '<li>';
                let spandata = {};
                spandata[t] = {'class': "g-btn g-blue",type,name,db};
                let ext = t.split('.')[1];
                if(ext){
                    delete spandata[t].type;
                    if(['cfg', 'opt', 'cht'].includes(ext)){
                        spandata['data-edittext'] = {'class': "g-btn g-blue2",name,'type': "edit",'db': db,}
                    }
                    spandata['data-downtext']={
                        'class': "g-btn g-right g-blue",
                        'type': "fsdown",
                        'db': db,
                        name
                    };
                }
                html += T.runaction('span_button_string', ['', spandata, gelm]);
                html += '</li>';
            });
            T.$('.g-result[data-db=' + db + ']').innerHTML = html;
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
                } else if (type == 'readpath') {
                    T.runaction('file-data-fs', [file,db,newelm.getAttribute('data-base')]);
                } else if (type == 'fsdown') {
                    T.unitl.download(file.split('/').pop(), Module.FS.readFile(file));
                }
            }
            e.preventDefault();
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
                else if (content.value) Module.FileDB.MKFILE(file, new TextEncoder().encode(content.value), true);
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
        }
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
    /*
    var addChrome = T.$('.add-home-app');
    if (addChrome) {

        var isWebApp = navigator.standalone || false
        if (!!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)) {
            if (!isWebApp) {
                addChrome.hidden = false;
            }
        }
        T.on(addChrome, 'click', () => {
            if (addChrome.e) {
                addChrome.e.prompt();
            }
            addChrome.hidden = true;
        });
        T.on(window, 'beforeinstallprompt', e => {
            e.preventDefault();
            addChrome.e = e;
            addChrome.hidden = false;
            T.once(window,'click', () => addChrome.click());
            e.prompt()
        });
    }
    */
}).call(Nenge);

window.onerror = function (msg, url, line, col, error) {
    var extra = !col ? '' : '\ncolumn: ' + col;
    extra += !error ? '' : '\nerror: ' + error;
    alert("Error: " + msg + "\nurl: " + url + "\nline: " + line + extra);
    window.onerror = console.log
    throw msg;
};