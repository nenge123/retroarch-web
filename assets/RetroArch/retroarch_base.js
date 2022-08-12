(function () {
    let T = this;
    let RAND = T.unitl.random;
    let Module = this.Module;
    this.speed = 1000/60;
    this.action = {
        'showmenu': elm => elm.classList.toggle('active'),
        'closemenu': () => this.$('.g-header .menu').classList.remove('active'),
        'showsys': elm => {
            Module.KeyCode_click('menu_toggle');
        },
        'forward':elm=>{
            Module.KeyCode_click('toggle_fast_forward');
        },
        'reload':()=>{
            location.reload();
        },
        'addcontent': () => {
            if (!Module.system_name) return;
            this.runaction('upload',[async (data,file)=>{
                let key = Module.system_name.join('|')+'-'+file;
                let content = {
                    contents:data,
                    filesize: data.byteLength,
                    timestamp:T.DATE,
                    type: "Uint8Array",
                    version: T.version
                };
                await T.setItem('data-rooms',key,content);
                let filelist = [];
                let filetype = T.runaction('check_buffer_type',[data]);
                let unFile = Module.system_zip&&filetype=='zip';
                content.unFile = false;
                if(!unFile&&['zip','rar','7z'].includes(filetype)){
                    let zipdata = await T.unitl.unFile(data);
                    if(zipdata instanceof Uint8Array){
                        filelist.push(file);
                        Module.CreateDataFile(file,zipdata);
                        this.runaction('addHTMLonWelcome',[file]);
                    }else{
                        content.unFile = true;
                        Object.entries(zipdata).forEach(
                            entry=>{
                                filelist.push(entry[0]);
                                Module.CreateDataFile(entry[0],entry[1]);
                                this.runaction('addHTMLonWelcome',[entry[0]])
                            }
                        );
                    }
                }else{
                    filelist.push(file);
                    Module.CreateDataFile(file,data);
                    this.runaction('addHTMLonWelcome',[file]);
                }
                delete content.contents;
                content.system = Module.system_name;
                content.file = filelist;
                await T.setItem('data-info',key,content);
            }]);
        },
        'addHTMLonWelcome':file=>{
            let type = file.split('.').pop(),sysType = Module.system_ext;
            if(sysType.includes(type)){
                let div = T.$ce('div'),result = T.$('.game-ui .start-result'),loadtext = result.getAttribute('data-loadtext');
                div.innerHTML = file+'<span data-name="'+file+'" data-type="file">'+loadtext+'</span>';
                result.appendChild(div);
            }
        },
        'addHTMLonInfo':async(file,elm)=>{
            let info = Module.RoomsInfo[file];
            elm.removeAttribute('data-name');
            elm = elm.parentNode;
            elm.innerHTML = '';
            let contents = await T.getContent('data-rooms',file);
            if(info.unFile===false){
                Module.CreateDataFile(info.file[0],contents);
                this.runaction('addHTMLonWelcome',[info.file[0]]);
            }else{
                Object.entries(await T.unitl.unFile(contents,text=>elm.innerHTML=text)).forEach(
                    entry=>{
                        Module.CreateDataFile(entry[0],entry[1]);
                        this.runaction('addHTMLonWelcome',[entry[0]])
                    }
                );
                elm.remove();
            }
            contents = null;
        },
        'addDATAonWelcome':async ()=>{
            Module.RoomsInfo = await T.GetItems('data-info');
            let sysType = Module.system_ext,result = T.$('.game-ui .start-result'),loadtext = result.getAttribute('data-loaddata');
            Object.entries(Module.RoomsInfo).forEach(entry=>{
                let isShow = false;
                let html = entry[0]+'<span data-name="'+entry[0]+'" data-type="info">'+loadtext+'</span><ul>';
                entry[1].file.forEach(val=>{
                    html+='<li>'+val+'</li>';
                    if(sysType.includes(val.split('.').pop())){
                        isShow = true;
                    }
                });
                if(isShow){
                    let div = T.$ce('div');
                    div.innerHTML = html+'</ul>';
                    result.appendChild(div);
                }
            });
        },
        'runcontent':(elm,e)=>{
            let aelm = e.target;
            let file = aelm.getAttribute('data-name');
            if(file){
                let type = aelm.getAttribute("data-type");
                if(type){
                    if(type=='file')Module.callRunFile(file);
                    else if(type == 'info')this.runaction('addHTMLonInfo',[file,aelm])
                }
            }
        },
        'addbios': async elm => {
            if (Module.system_bios) {
                elm.removeAttribute('data-click');
                T.FectchItem({
                    'url': Module.system_bios,
                    'unpack': true,
                    'process': text => {
                        elm.innerHTML = text;
                    },
                    'success': data => {
                        console.log(data);
                        Object.entries(data).forEach(entry => {
                            Module.CreateDataFile('/system/' + entry[0], entry[1]);
                        });
                    }
                });
            }
        },
        'check_buffer_type':buffer=>{
            let head = this.runaction('get_head_string_16',[buffer,0,8]);
            for(ext in T.unitl.mimepreg){
                if(T.unitl.mimepreg[ext].test(head))return ext;
            }
            return ;
        },
        'get_head_string_16':(buffer,start,end)=>{
            return Array.from(new Uint8Array(buffer.slice(start,end))).map(v=>v.toString(16).padStart(2,0).toLocaleUpperCase()).join('');;
        },
        'upload':func=>{
            let input = T.$ce('input');
            input.type = 'file';
            input.onchange = e=>{
                let files = e.target.files;
                if(files&&files.length>0){
                    Object.entries(files).forEach(file=>{
                        file[1].arrayBuffer().then(buf=>{
                            func(new Uint8Array(buf),file[1].name,file[1].type);
                        })
                    });
                }
                input.remove();
            };
            input.click();
        },
        'startCores': async elm => {
            this.Module.canvas = this.$('#canvas');
            let sys = elm.getAttribute('data-sys'),
                sys2 = sys.replace(/\-/g, '_'),
                sysext = elm.getAttribute('data-mode') ? '_' + elm.getAttribute('data-mode') : '',
                sysurl = this.JSpath + 'cores/' + sys2 + sysext + '.png?' + RAND;
            Module.system_key = elm.getAttribute('data-sys');
            Module.system_keytext = sys2;
            Module.system_type = sysext;
            Module.system_fullkey = sys2 + sysext;
            elm.hidden = true;
            let corefile = await this.FectchItem({
                'url': sysurl,
                'unpack': true,
                'unpack': true,
                'store': 'data-libjs',
                'key': sys2 + sysext,
                'version': T.version,
            });
            Module.jsFile = {};
            Object.entries(corefile).forEach(entry => {
                if (/\.wasm/.test(entry[0])) Module.wasmBinary = entry[1];
                else if (/\.mem/.test(entry[0])) Module.memFile[entry[0].split('/').pop()] = T.unitl.URL(entry[1], 'application/octet-stream');
                else if (/\.js/.test(entry[0])) Module.jsFile[entry[0]] = new TextDecoder().decode(entry[1]);
                delete corefile[entry[0]];
            });
            corefile = null;
            if (Module.jsFile[sys2 + '_libretro.js']) {
                Module.printErr = text => {
                    if (/Video\s@\s\d+x\d+\.$/.test(text) || /Set\s?video\s?size\sto:\s\d+x\d+\./.test(text)) {
                        let wh = text.split(' ').pop().split('x');
                        Module.resizeCanvasSize(wh);
                    }
                };
                Module.onRuntimeInitialized = async () => {
                    await T.addJS(Module.jsFile[sys + '.js'] ? Module.jsFile[sys + '.js'] : this.JSpath + 'action/' + sys2 + sysext + '.js?' + RAND);
                };
                let coreTxt = this.runaction('retroarchjs_replace', [Module.jsFile[sys2 + '_libretro.js']]);
                new Function('Module', coreTxt)(Module);
            }
        },
        'retroarchjs_replace': txt => txt.replace(
            /_RWebAudioInit\(latency\)\s?\{/,
            '_RWebAudioInit(latency){Module.latency=latency;try{'
        ).replace(
            /RA.nonblock\s?=\s?false;/,
            'RA.nonblock = false;}catch(e){Module.needAudio(()=>_RWebAudioInit(latency));Module["pauseMainLoop"]();return 1;}'
        ).replace(
            /_RWebAudioWrite\(buf,\s?size\)\s?\{/,
            '_RWebAudioWrite(buf,size){if(RA.context.state!="running"){Module.pauseMainLoop();Module.resetAudio(RA);return;}'
        ).replace(
            /\"mouse(up|down|move)\"/g,
            '"pointer$1"'
        ).replace(
            /node\.contents\s?=\s?new\s?Uint8Array\(buffer\.subarray\(offset,\s?offset\s?\+\s?length\)\);/,
            'node.contents = new Uint8Array(buffer.subarray(offset, offset + length));if(this.SyncFsDB)this.SyncFsDB.synckUpate(stream);'
        ).replace(
            /msync:\s?MEMFS\.stream_ops\.msync/,
            `msync:MEMFS.stream_ops.msync,
            'SyncFsDB':Module.SyncFsDB,`
        ).replace(
            /calledMain\s?=\s?true/,
            'calledMain = true;Module.onRunning=true'
        ) + `
        Module.FS = FS;
        Module.GL = GL;
        Module.SYSCALLS = SYSCALLS;
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
        );`,
        'Record': () => {
            let Record = this.runaction('setRecord');
            if (Record) {
                if (Record.state == 'recording') Record.stop();
                else Record.start();
            }
            this.runaction('closemenu');
        },
        'setRecord': () => {
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
        }
    };
    Object.assign(Module, {
        'onRunning': false,
        'memFile': {},
        'locateFile': function (path) {
            if (this.memFile[path.split('/').pop()]) return this.memFile[path.split('/').pop()];
            return T.JSpath + 'cores/' + path;
        },
        'callRunFile':file=>{
            T.$('.game-ui .welcome').remove();
            this.$('.g-header .add').hidden = true;
            this.$('.g-header .forward').hidden = false;
            if(Module.wasmBinary)delete Module.wasmBinary;
            if(Module.memFile)Object.entries(Module.memFile).forEach(entry=>{
                T.unitl.removeURL(entry[1]);
                delete Module.memFile[entry[0]];
            });
            if(Module.jsFile)Object.entries(Module.jsFile).forEach(entry=>{
                delete Module.jsFile[entry[0]];
            });
            Module.callMain(['-v',file||Module.gameFile]);
        },
        'sysFile': mount => {
            clearTimeout(Module.sysTime);
            Module.sysTime = setTimeout(() => Module.SyncFsDB.syncfs(mount), 1000);
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
        'resetAudio': RA => {
            this.$('.needclick').hidden = false;
            this.once(this.$('.needclick'), 'pointerup', () => {
                this.$('.needclick').hidden = true;
                Module["pauseMainLoop"]();
                RA.bufIndex = 0;
                RA.bufOffset = 0
                var ac = window["AudioContext"] || window["webkitAudioContext"];
                if (!ac) return 0;
                RA.context.close();
                delete RA.context;
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
                window["setTimeout"](RA.setStartTime, 0);
            })
        },
        'onceClick': func => {
            this.$('.needclick').hidden = false;
            this.once(this.$('.needclick'), 'pointerup', () => {
                this.$('.needclick').hidden = true;
                func();
            })
        },
        'resizeCanvasSize': wh => {
            if (wh) {
                let [width, height] = wh;
                Module.AspectRatio = width / height;
            }
            if (Module.AspectRatio) {
                let opt = this.$('.game-ui').getBoundingClientRect(),
                    w, h;
                w = opt.width;
                h = opt.width / Module.AspectRatio;
                if (h > opt.height) {
                    h = opt.height;
                    w = opt.height * Module.AspectRatio;
                }
                if (Module.setCanvasSize) Module.setCanvasSize(w, h);
            }
        },
        'CreateDataFile': (path, data, bool) => {
            let FS = Module.FS,
                dir = path.split('/').slice(0, -1).join('/');
            if (!FS.analyzePath(dir).exists) {
                let pdir = dir.split('/').slice(0, -1).join('/');
                if (!FS.analyzePath(pdir).exists) FS.createPath('/', pdir, !0, !0);
                FS.createPath('/', dir, !0, !0);
            }
            if (typeof data == 'string') data = new TextEncoder().encode(data);
            if (bool) {
                if (FS.analyzePath(path).exists) FS.unlink(path);
                //{canOwn: true,encoding: "binary"}
                //FS.createDataFile(dir, path.split('/').pop(), data, !0, !0);
                FS.writeFile(path, data, {
                    canOwn: true,
                    encoding: "binary"
                });
            } else if (!FS.analyzePath(path).exists) {
                //FS.createDataFile(dir, path.split('/').pop(), data, !0, !0);
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
        }
    });
    this.docload(async () => {
        this.$$('*[data-click]').forEach(elm => this.on(elm, 'pointerup', function (e) {
            let click = this.getAttribute('data-click');
            click && T.runaction(click, [this, e]);
        }));
        Module.stopGesture(this.$('.game-ui'));
        this.on(window, 'resize', () => Module.resizeCanvasSize());
        this.on(document, 'touchstart', e => e.touches && e.touches.lenth > 1 && Module.stopEvent(e));
        this.on(document, 'touchend', e => {
            let now = new Date().getTime();
            if (Module.lastTouchTime && now - Module.lastTouchTime <= 300) Module.stopEvent(e);
            Module.lastTouchTime = now;
        });
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
            this.on(elm, 'pointerover', keydown);
            this.on(elm, 'pointerout', keyup);
            this.on(elm, 'pointerup', keyup);
            this.on(elm, 'pointerlevel', keyup);
            Module.stopGesture(elm);
        });
    });
}).call(Nenge);