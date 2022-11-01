(function () {
    let T = this,F=T.F,I=T.is,Module = T.Module;
    let getAttr = (elm)=>Nttr(elm)['attrs'];
    let setAttr = (elm,name,value)=>Nttr(elm).attr(name,value===undefined?null:value);
    Object.assign(T.action, {
        'menu-show': elm => {
            elm.classList.toggle('active');
            T.runaction('menu-hide');
        },
        'menu-close': () => T.$('.g-btn-menu').classList.remove('active'),
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
            let div = T.runaction('game-welcome-elm', [result]);
            if(!file&&file!=0)return div.innerHTML =  getAttr(result)['data-nulltext'];
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
                setAttr(elm,'data-name');
                elm = elm.parentNode;
                elm.innerHTML = '';
            }
            let contents = await T.getContent('data-rooms', file);
            if (info.unFile === false) {
                Module.FileDB.MKFILE(info.file[0], contents);
                T.runaction('game-welcome-additem', [info.file[0]]);
            } else {
                let zipdata = contents&&await T.unFile(contents, text => {
                    if (elm) elm.innerHTML = text
                });
                if (I.u8obj(zipdata)) {
                    Module.FileDB.MKFILE(info.file[0], zipdata);
                    T.runaction('game-welcome-additem', [info.file[0]]);
                } else if(zipdata){
                    I.toArr(zipdata,
                        entry => {
                            Module.FileDB.MKFILE(entry[0], entry[1]);
                            T.runaction('game-welcome-additem', [entry[0]]);
                            zipdata[entry[0]] = null;
                        }
                    );
                    zipdata = null;
                }else{
                    T.runaction('game-welcome-additem', [null]);
                }
            }
            if (elm) elm.remove();
            contents = null;
        },
        'game-welcome-ReadRooms': async () => {
            T.$('.g-btn-add').hidden = false;
            T.$('.g-game-ui').hidden = false;
            T.$('.g-main .g-start-ui').remove();
            Module.RoomsInfo = await T.getAllData('data-info');
            let result = T.$('.g-game-welcome-result');
            if (!result) return;
            I.toArr(Module.RoomsInfo,entry => {
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
                    let div = T.runaction('game-welcome-elm', [result]);
                    if (div) div.innerHTML = html;
                }
            });
        },
        'game-content-add': () => {
            if (!Module.system_name) return;
            T.runaction('upload', [async (file, filename, Mime) => {
                let filetype = filename.split('.').pop().split('?')[0],
                    bigfile = file.size > T.maxsize,
                    u8 = new Uint8Array(await file.arrayBuffer());
                if (!Mime || bigfile) {
                    filetype = F.checkBuffer(u8);
                    if (filetype !== 'unkonw') {
                        filename = filename.split('.').slice(0, -1).join('.') + '.' + filetype;
                        Mime = F.gettype(filetype);
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
                    let div = T.runaction('game-welcome-elm');
                    let zipdata = await T.unFile(u8, text => {
                        div && (div.innerHTML = filename + ' -- ' + text)
                    });
                    div && div.remove();
                    I.toArr(zipdata,
                        entry => {
                            unList.push(entry[0].split('/').pop());
                            Module.FileDB.MKFILE(entry[0], entry[1]);
                            T.runaction('game-welcome-additem', [entry[0]]);
                            zipdata[entry[0]] = null;

                        }
                    )
                    zipdata = null;
                } else {
                    unList.push(filename);
                    Module.FileDB.MKFILE(filename, u8);
                    T.runaction('game-welcome-additem', [filename]);
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
            let url = Module.system_bios,attr = getAttr(elm);
            if (url) {
                setAttr(elm,'data-click');
                T.FetchItem({
                    'url': I.get(url,T.time),
                    'unpack': true,
                    'store': 'data-libjs',
                    'key': 'bios-' + url.split('/').pop(),
                    'process': text => {
                        elm.innerHTML = text;
                    },
                    'success': data => {
                        if (!data) return elm.innerHTML = attr['data-error'];
                        I.toArr(data,entry => {
                            Module.FileDB.MKFILE('/system/' + entry[0], entry[1]);
                        });
                        elm.innerHTML = attr['data-sussces'];
                    }
                });
            }
        },
        'game-content-write': (elm, e) => {
            let aelm = e.target;
            let attr =  getAttr(aelm),file = attr['data-name'];
            if (file) {
                let type = attr['data-type'];
                if (type) {
                    if (type == 'file') T.runaction('game-cores-run', [file]);
                    else if (type == 'down') F.download(file.split('/').pop(), Module.FS.readFile(file));
                    else if (type == 'info') T.runaction('game-welcome-WriteFile', [file, aelm])
                }
            }
        },
        'game-FS-ui-file': async (FS, elm) => {
            if (Module.system_noui) return;
            FS = FS || Module.FS;
            let uiname = Module.system_uiname || 'glui',
                path = Module.system_uipath || '/home/web_user/retroarch/bundle/';
            if (!FS.analyzePath(path + 'assets/' + uiname).exists) I.toArr(await T.FetchItem({
                'url': I.get(Module.JSpath + 'frontend/' + uiname + '-bundle.png',T.time),
                'unpack': true,
                'store': 'data-libjs',
                'key': 'retroarch-ui-' + uiname,
                'version': T.version,
                'process': text => {
                    if (elm) elm.innerHTML = text;
                }
            }),value => {
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
                    let configdata = await T.FetchItem({
                        'url': I.get(Module.JSpath + 'config/' + name + '.js',T.time)
                    }) || '';
                    if (configdata) {
                        cfg_txt = new TextDecoder().decode(configdata);
                    }
                }
                if (I.u8obj(data)) data = new TextDecoder().decode(data);
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
            if (Module.setArgument) info = Module.setArgument(file);
            else info = ['--verbose', file || '--menu'];
            if (!info) return;
            T.$('.g-game-welcome') && T.$('.g-game-welcome').remove();
            T.$('.g-btn-forward').hidden = false;
            if (I.mobile) Nttr('.g-game-ctrl').hidden = false;
            if (!Module.wasmBinary) {
                Module.wasmBinary = null;
                delete Module.wasmBinary;
            }
            if (Module.cacheFile) {
                I.toArr(Module.cacheFile,entry => {
                    F.removeURL(entry[1]);
                    Module.cacheFile[entry[0]] = null;
                    delete Module.cacheFile[entry[0]];
                });
                Module.cacheFile = null;
                delete Module.cacheFile;
            }
            if (Module.jsFile) {
                I.toArr(Module.jsFile,entry => {
                    Module.jsFile[entry[0]] = null;
                    delete Module.jsFile[entry[0]];
                });
                Module.jsFile = null;
                delete Module.jsFile;
            }
                console.log(info);
                Module.firstFile = file;
                Module.callMain(info);
                T.runaction('game-start');
                T.on(document, 'contextmenu', e => Module.stopEvent(e));
                T.runaction('game-cores-bindkey');
                T.runaction('game-touch-key');
        },
        'game-cores-forward': elm => {
            Module.inputEnter('toggle_fast_forward');
        },
        'game-cores-sys': elm => {
            if (!T.$('.g-btn-hide').hidden) return T.runaction('menu-hide');
            Module.inputEnter('menu_toggle');
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
                        if (typeof Module.inputMap[key] != "undefined") {
                            Module.inputMap[key] = value;
                        }
                    });


                }
            }
        },
        'game-cores-install': async (list, e) => {
            let elm = e.target,attr = getAttr(elm);
            if (!elm || !attr['data-sys']) return;
            let sys = attr['data-sys'];
            setAttr(elm,'data-sys');
            Module.canvas = T.$('#canvas');
            let sys2 = sys.replace(/\-/g, '_'),
                sysext = attr['data-mode'] || '',
                sysurl = I.get(Module.JSpath + 'cores/' + (sysext ? sysext + '/' : '') + sys2 + '.png',T.time);
            Module.system_key = sys;
            Module.system_keytext = sys2;
            Module.system_keyend = sysext;
            Module.system_fullkey = sys2 + (sysext ? '_' + sysext : '');
            let corefile = await T.FetchItem({
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
            I.toArr(corefile,entry => {
                if (/\.wasm/.test(entry[0])) Module.wasmBinary = entry[1];
                else if (/\.mem/.test(entry[0])) Module.cacheFile[entry[0].split('/').pop()] = F.URL(entry[1], 'application/octet-stream');
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
            let loadjs = Module.jsFile['main.js'] ? Module.jsFile['main.js'] : I.get(Module.JSpath + 'action/' + (sysext ? sysext + '/' : '') + sys2 + '.js',T.time);
            let asmfile = Module.jsFile[sys2 + '_libretro.js'] || Module.jsFile['retroarch.js'];
            if (asmfile) {
                if (sys2 == 'snes9x'&&sysext=='BinBashBanana') {
                    asmfile = new TextDecoder().decode(await await T.FetchItem({
                        'url': I.get(Module.JSpath + sys2 + '_libretro.js',T.time)
                    }));
                }
                await T.addJS(loadjs);
                let coreTxt = Module.replaceAsmJs(asmfile);
                if (Module.myReplace) coreTxt = Module.myReplace(coreTxt);
                await T.addJS(coreTxt);
                Module.RetroarchJS && Module.RetroarchJS();
            }
        },
        'game-touch-key': () => {
            let getkey = (elm) => {
                if (I.elment(elm)) {
                    let key = getAttr(elm)['data-key'];
                    if (key && elm.classList.contains('vk')) {
                        return key;
                    }
                }
                return '';
            }
            if (I.mobile) {
                let touchlist = [];
                T.$$('*[data-key]').forEach(elm => {
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
                                    Module.inputUp(touchlist);
                                    Module.inputDown(newlist);
                                    touchlist = newlist;
                                }
                            }, {
                                passive: false
                            });
                        }
                    )
                });

            } else {
                T.$$('*[data-key]').forEach(elm => {
                    ['mousedown'].forEach(evt => T.on(elm, evt, e => {
                        let newlist = getkey(e.target);
                        if (newlist) {
                            Module.inputDown(newlist.split(','));
                        }
                    }));
                    ['mouseup', 'mouseout'].forEach(evt => T.on(elm, evt, e => {
                        let newlist = getkey(e.target);
                        if (newlist) {
                            Module.inputUp(newlist.split(','));
                        }
                    }));
                })
            }
        },
        'file-menu-init': () => {
            let fileElm = T.$('.g-file-manager');
            T.$$('.g-file-header').forEach(elm => {
                let data = {},attr = getAttr(elm),
                    db = attr['data-db'],
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
                        'path': attr['data-path'] || '',
                        db
                    }
                }), fileElm]);
                ['tips', 'result'].forEach(k => {
                    let v = T.$ce(k == 'tips' ? 'div' : 'ul');
                    v.classList.add('g-' + k);
                    setAttr(v,'data-click', 'file-' + k + '-action');
                    setAttr(v,'data-db', db)
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
            let db = getAttr(elm)['data-db'];
            let elm2 = T.$('.g-result[data-db=' + db + ']');
            if (elm2) {
                elm2.hidden = !elm2.hidden;
            }

        },
        'file-data-read': async elm => {
            let attr = getAttr(elm),
                db = attr['data-db'],
                gelm = T.$('.g-file-manager'),
                div = T.$('.g-result[data-db=' + db + ']'),
                html = '';
                if(!div)return;
                div.hidden = false;
            if (db == 'data-info') {
                let db2 = 'data-rooms';
                I.toArr(await T.getAllData(db),entry => {
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
                let path =  attr['data-path'];
                if (!Module.FileDB || !path) {
                    if (path) {
                        let pelm = T.$('.g-tips[data-db=' + db + ']');
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
            if (!html) html = getAttr(gelm)['data-nulltext'];
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
                        t = getAttr(gelm)['data-updirtext'];
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
            let newelm = e.target,
                attr = getAttr(newelm);
            let type = attr['data-type'];
            let db = attr['data-db'];
            let file = attr['data-name'];
            if (db) {
                if (type == 'down') {
                    F.download(file.split('/').pop(), await T.getContent(db == 'data-info' ? 'data-rooms' : db, file));
                } else if (type == 'del') {
                    await T.removeItem(db, file);
                    if (db == 'data-info') await T.removeItem('data-rooms', file);
                    newelm.parentNode.remove();
                } else if (type == 'write') {
                    T.runaction('game-welcome-WriteFile', [file, newelm]);
                } else if (type == 'edit') {
                    T.runaction('file-data-edit', [elm, file, db]);
                } else if (type == 'readpath') {
                    T.runaction('file-data-fs', [file,db]);
                } else if (type == 'fsdown') {
                    F.download(file.split('/').pop(), Module.FS.readFile(file));
                }
            }
            e.preventDefault();
        },
        'file-data-clear': async elm => {
            let db = getAttr(elm)['data-db'];
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
            setAttr(pathor,'data-db', db);
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
                db = getAttr(pathor)['data-db'],
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
                    I.toArr(files,file => {
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
            if (I.elment(target)) {
                let setting = getAttr(target)['data-setting'];
                if (setting) T.runaction('setting-' + setting, [target, e]);
            }
        },
        'setting-showfile': elm => {
            T.$('.g-file-ui').hidden = false;
            T.$('.g-btn-hide').hidden = false;
            T.runaction('menu-close');
        },
        'setting-reload': () => {
            location.reload();
        },
        'setting-quality': (elm) => {
            let p = getAttr(elm)['data-p'];
            if (p) {
                p = parseInt(p);
                Module.canvasQuality = p > 0 ? p : 720;
                Module.resetCanvasSize();
                T.runaction('menu-close');
            }
        },
        'setting-record-action': () => {
            let Record = T.runaction('setting-record-create');
            if (Record) {
                if (Record.state == 'recording') Record.stop();
                else Record.start();
            }
            T.runaction('menu-close');
        },
        'setting-record-create': () => {
            if (!Module.onRunning || !Module.canvas) return;
            if (Module.Record) return Module.Record;
            let Media_Stream = Module.canvas.captureStream(30);
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
                        F.download('录像recorder.' + mime.split('/')[1], new Blob(recorder.Blobs, {
                            'type': mime
                        }), mime);
                        recorder.Blobs = [];
                    }
                });
                Module.Record = recorder;
                return recorder;
            }
        },
        'span_button_string': (first, data, elm) => {
            let html = '',attr = getAttr(elm);
            if (first) html += '<span>' + first + '</span>';
            if (data) {
                I.toArr(data,entry => {
                    let name = entry[0];
                    if (/^data-/.test(name)) name = attr[name];
                    if (!entry[1]) {
                        html += '<span>' + name + '</span>';
                    } else {
                        html += '<span';
                        I.toArr(entry[1],key => {
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
    T.docload(async () => {
        T.runaction('file-menu-init');
        T.$$('*[data-click]').forEach(elm => T.on(elm, 'pointerup', function (e) {
            let click = getAttr(this)['data-click'];
            click && T.runaction(click, [this, e]);
        }));
        Module.stopGesture(document);
        T.on(window, 'resize', () => Module.resetCanvasSize());
    });
T.on(window,'error',function (e) {
    console.log(e);
    let {message, filename, lineno, colno, error} = e;
    var extra = !colno ? '' : '\ncolumn: ' + colno;
    extra += !error ? '' : '\nerror: ' + error;
    alert("Error: " + message + "\nurl: " + filename + "\nline: " + lineno + extra);
    throw message;
});
}).call(Nenge);