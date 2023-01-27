const RetroArch = new class NengeStart {
    version = 1;
    constructor(T) {
        let I = T.I, JSpath = document.currentScript && document.currentScript.src.split('/').slice(0, -1).join('/') + '/';;
        T.docload(async e => {
            T.DB_NAME = 'RetroArch_WEB';
            T.LibStore = 'data-libjs';
            T.version = 6;
            T.DB_STORE_MAP = {
                'data-rooms': {},
                'data-info': { 'system': false },
                'data-system': {},
                'data-bios': { 'system': false },
                'retroarch': { 'timestamp': false },
                'userdata': { 'timestamp': false },
                'data-libjs': {},
            };
            T.LibPack = 'common_libjs.zip';
            I.defines(NengeModule.prototype, { T, I }, 1);
            const Module = new NengeModule(window.Module);
            Module.JSpath = JSpath;
            let DB = {
                rooms:T.getStore('data-rooms'),
                info:T.getStore('data-info'),
                system:T.getStore('data-system'),
                bios:T.getStore('data-bios'),
                retroarch:T.getStore('retroarch'),
                userdata:T.getStore('userdata'),
                libjs:T.getStore(T.LibStore),
            };
            Module.DB = Object.assign(DB,{
                '/userdata': DB.userdata,
                '/home/web_user/retroarch/userdata':DB.retroarch,
            });
            I.define(T, 'Module', {
                get() {
                    return Module
                }
            });
            window.Module = Module;
            I.defines(this, { T, I, Module }, 1);
            I.defines(T, { RunStart: this }, 1);
            this.runaction = T.runaction;
            console.log('Start JS');
            T.lang = await T.FetchItem({ url: Module.JSpath + 'language/' + T.language + '.json', 'type': 'json' });
            Nttr('.MenuBtn').click(e => {
                Nttr('.MenuBtn').active = !Nttr('.MenuBtn').active;
                Nttr('.FileUI').hidden = true;
            });
            Nttr('.SysBtn').click(e => {
                Nttr('.MenuBtn').active = false;
                Nttr('.FileUI').hidden = true;
                Module.runaction('RetroarchMenu');
            });
            this.BulidMenuList();
            if (location.search) {
                let urlsearch = new URLSearchParams(location.search);
                Module.urlrooms = urlsearch.get('rooms');
                Module.urlbios = urlsearch.get('bios');
                Module.urlcorepath = urlsearch.get('corepath');
                Module.urlcore = urlsearch.get('core');
                Module.urlsys = urlsearch.get('sys');
                if (Module.urlcore || Module.urlsys) {
                    return this.RunUrlCore();
                }
            }
            this.BulidCores();
            if (!/(127\.0\.0\.1|localhost)/.test(location.host)) {
                //Module.JSpath = Module.JSpath.replace(/^https?:\/\/.+?\//,'https://retroarch.nenge.net/')
                T.FetchItem({
                    url: 'https://unpkg.com/gitalk/dist/gitalk.css', type: 'text', success: async (csstext, headers) => {
                        /**
                         * @var version 获取gitalk 版本
                         */
                        let version = headers.url.match(/@([\d\.]+)/)[1];
                        await T.addJS(csstext, undefined, 1);
                        //await T.addJS('https://unpkg.com/gitalk/dist/gitalk.min.js', undefined);
                        let txt = await T.loadScript('https://unpkg.com/gitalk/dist/gitalk.min.js',{version},1);
                        txt = txt.replace(/\w\.axiosJSON\.post\(\w\.options\.proxy,\{code:\w,client_id:\w\.options\.clientID,client_secret:\w\.options\.clientSecret\}\)\.then\(function\((\w)\)\{/, 'Nenge.FetchItem({url:n.options.proxy,json:{code:r,client_id:n.options.clientID,client_secret:n.options.clientSecret}}).then(function($1){console.log($1);$1={data:$1};');
                        await T.addJS(txt);
                        const gitalk = new Gitalk({
                            enable: true,
                            clientID: 'b2b8974cb49ea9ae7d10',
                            clientSecret: '4618bde13d3fa57c5fb53692ad65d483baec6204',
                            repo: 'retroarch-web',
                            owner: 'nenge123',
                            admin: ['nenge123'],
                            labels: ['Gitalk'],
                            //proxy: "https://api.nenge.net/gitalk.php",
                            //http://pigass.cn/proxy/https://github.com/login/oauth/access_token
                            title: "模拟器交流",
                            id: 'retroarch.nenge.net',      // Ensure uniqueness and length less than 50
                            distractionFreeMode: true  // Facebook-like distraction free mode
                        });
                        gitalk.render('gitalk-container');
                    }
                });
            }
        });
    }
    action = {
        async DefaultLoader(asmjs) {
            let S = this, T = S.T, I = T.I, Module = T.Module;
            asmjs = Module.replaceAsmJs(asmjs);
            await T.addJS(asmjs);
            delete Module.CacheFile[Module.FileLoder];
            delete Module.wasmBinary;
            Module.addMount('/userdata');
            Module.addMount('/home/web_user/retroarch/userdata');
            let loghtml = `<h2>${T.getLang('FS log')}</h2>`;
            Module.action['DiskReadyOut'] = txt => loghtml && (loghtml += txt.split('\n').map(t => `<p>${t}</p>`).join(''));
            await Module.getMountStatus();
            let FS = Module.FS;
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
                '/rooms',
            ].forEach(
                dir => {
                    if (!FS.analyzePath(dir).exists) {
                        FS.createPath('/', dir, !0, !0);
                    }
                }
            );
            let cfgPath = '/home/web_user/retroarch/userdata/retroarch.cfg';
            Module.configPath = cfgPath;
            if (!FS.analyzePath(cfgPath).exists) {
                S.addLoaderStatus(T.getLang('Loading retroarch.cfg'));
                let Retroarchcfg = await T.FetchItem({ url: Module.JSpath + 'config/retroarch.cfg.js', type: 'text' });
                Retroarchcfg += '\nmenu_mouse_enable = "true"' +
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
                Module.FSWRITE(cfgPath, Retroarchcfg);
                loghtml += `<p><b>retroarch.cfg file:</b>${cfgPath}</p>`;
            }
            let uipath = '/home/web_user/retroarch/bundle/';
            let UIcontents = I.toArr(T.Module.DB.libjs.data('ui-assets'));
            if (UIcontents.length > 0) {
                UIcontents.forEach(value => {
                    Module.FSWRITE(uipath + value[0], value[1]);
                    loghtml += `<p><b>UI file:</b>${uipath + value[0]}</p>`;
                });
            } else {
                let uiStatus = S.addLoaderStatus(T.getLang('Loading retroarch UI File'));
                let configTxt = new TextDecoder().decode(FS.readFile(cfgPath));
                let uiname = configTxt.match(/menu_driver\s*=\s*"(.+?)"/)[1];
                if (!FS.analyzePath(uipath + 'assets/glui' + uiname).exists) I.toArr(await T.FetchItem({
                    'url': I.get(Module.JSpath + 'frontend/' + uiname + '-bundle.zip', T.time),
                    'unpack': true,
                    'store': T.Module.DB.libjs,
                    'key': 'retroarch-ui-' + uiname,
                    'version': T.version,
                    'process': text => {
                        uiStatus.innerHTML = text;
                    }
                }), value => {
                    Module.FSWRITE(uipath + value[0], value[1]);
                    loghtml += `<p><b>UI file:</b>${uipath + value[0]}</p>`;
                });
                uiStatus.innerHTML = uiname.toUpperCase() + T.getLang('UI is ok!');
            }
            T.$('.g-FS-log').innerHTML = loghtml;
            loghtml = null;
        },
        async DefaultBios() {
            let S = this, T = S.T, I = T.I, Module = T.Module;
            let system = Module.system || Module.core;
            console.log(system);
            Nttr('.g-bios').click(async e => {
                let elm = e.target;
                if (I.elment(elm)) {
                    let act = elm.getAttribute('data-act');
                    if (act) {
                        if (act == 'write') {
                            let name = elm.getAttribute('data-file');
                            elm.removeAttribute('data-act');
                            S.runaction('WriteBios', [name, await T.Module.DB.bios.data(name)]);
                            elm.parentNode.remove();
                        } else if (act == 'down') {
                            elm.removeAttribute('data-act');
                            if (!S.CoreSystem[system]['bios']) {
                                elm.classList.add('g-red');
                                return elm.innerHTML = T.getLang('No Bios Download');
                            }
                            let url = Module.JSpath + 'bios/' + S.CoreSystem[system]['bios'];
                            elm.innerHTML = T.getLang('reading...');
                            await S.FileManager.BIOS_download(url, system, elm, contents => {
                                S.runaction('WriteBios', [url, contents]);
                                elm.innerHTML = T.getLang(contents ? 'complete' : 'NetError');
                            });
                        } else if (act == 'upload') {
                            S.FileManager.BIOS_upload(Module.system, (filename, contents) => {
                                if (!contents) {
                                    return S.addLoaderStatus('<b>BIOS:</b>' + filename + '&nbsp;' + T.getLang('reading...'));
                                } else {
                                    S.runaction('WriteBios', [filename, contents]);
                                }
                            });
                        } else if (act == 'unpack') {
                            S.FileManager.BIOS_unpack(Module.system, (filename, contents) => {
                                if (!contents) {
                                    return S.addLoaderStatus('<b>BIOS:</b>' + filename + '&nbsp;' + T.getLang('reading...'));
                                } else {
                                    S.runaction('WriteBios', [filename, contents]);
                                }
                            });
                        }
                    }
                }
            });
            let html = `<h2>${T.getLang('Write a BIOS')}</h2><p class="flex"><button class="g-btn" data-act="down">${T.getLang('DownBios')}</button><button class="g-btn g-blue2" data-act="upload">${T.getLang('Write Files Directly')}</button><button class="g-btn g-blue2" data-act="unpack">${T.getLang('Write to a compressed file')}</button></p><p>${T.getLang('<b>warning:</b>here is upload will unpack(zip|7z|rar4),so you want to upload zip please pack a new zip!')}</p><ul class="g-bios-result">`;
            I.toArr(await T.Module.DB.bios.cursor('system', !0, { Range: IDBKeyRange.only(system), 'index': 'system' }), entry => {
                html += `<li><b>${entry[0]}</b>&nbsp;<button class="g-btn" data-act="write" data-file="${entry[0]}">${T.getLang('WriteBios')}</button></li>`;
            });
            html += '</ul>';
            Nttr('.g-bios').html(html);
            if (Module.urlbios) {
                let urlbios = Module.urlbios;
                if (/^(http|blob)/.test(urlbios)) {
                    urlbios = urlbios;
                } else if (/^\//.test(urlbios)) {
                    urlbios = location.href.split('?')[0].split('&')[0].split('/').slice(0, -1).join('/') + '/' + urlbios;
                } else {
                    urlbios = Module.JSpath + 'bios/' + urlbios;
                }
                let delm = S.addLoaderStatus('<b>BIOS:</b>' + urlbios + '&nbsp;' + T.getLang('reading...'));
                S.FileManager.BIOS_download(urlbios, system,delm, (contents) => {
                    if(I.u8obj(contents))S.runaction('WriteBios', [T.F.getname(urlbios), contents]);
                    else I.toArr(contents,entry=>S.runaction('WriteBios', [entry[0],entry[1]]))
                });
            }
        },
        WriteBios(path, contents) {
            let S = this, T = S.T, I = T.I, Module = T.Module;
            if (!contents) return S.addLoaderStatus('<b>BIOS:</b>' + path + '&nbsp;' + T.getLang('is can not write!'));
            if (contents instanceof Uint8Array) {
                Module.FSWRITE('/system/' + T.F.getname(path), contents);
                S.addLoaderStatus('<b>BIOS:</b>' + '/system/' + T.F.getname(path) + '&nbsp;' + T.getLang('is write!'));
            }
            else I.toArr(contents, entry => {
                Module.FSWRITE('/system/' + entry[0], entry[1]);
                S.addLoaderStatus('<b>BIOS:</b>' + '/system/' + entry[0] + '&nbsp;' + T.getLang('is write!'));
            });
        },
        async DefaultRooms(bool) {
            let S = this, T = S.T, I = T.I, Module = T.Module, html = "";
            let system = Module.system || Module.core;
            Nttr('.g-rooms').click(async e => {
                let elm = e.target;
                if (I.elment(elm)) {
                    let act = elm.getAttribute('data-act');
                    if (act) {
                        if (act == T.Module.DB.retroarch.table) {
                            S.runaction('DefaultStart');
                        } else if (act == 'upload') {
                            S.FileManager.Rooms_upload(Module.system, (filename, contents) => {
                                if (!contents) {
                                    return S.addLoaderStatus('<b>ROOMS:</b>' + filename + '&nbsp;' + T.getLang('reading...'));
                                } else {
                                    let elm = T.$ce('li');
                                    T.$('.g-rooms-result').appendChild(elm);
                                    console.log(contents);
                                    S.runaction('WriteRooms', [filename, contents, elm]);
                                }

                            });
                        } else if (act == 'unpack') {
                            S.FileManager.Rooms_unpack(Module.system, (filename, contents) => {
                                if (!contents) {
                                    return S.addLoaderStatus('<b>ROOMS:</b>' + filename + '&nbsp;' + T.getLang('reading...'));
                                } else {
                                    let elm = T.$ce('li');
                                    T.$('.g-rooms-result').appendChild(elm);
                                    console.log(contents);
                                    S.runaction('WriteRooms', [filename, contents, elm]);
                                }

                            });
                        } else if (act == 'write') {
                            let fileKey = elm.getAttribute('data-key');
                            let pelm = elm.parentNode;
                            elm.removeAttribute('data-act');
                            let data = await T.Module.DB.rooms.get(fileKey, null, { fileKey, process: status => pelm.innerHTML = status });
                            if (!data) {
                                pelm.innerHTML = fileKey + '&nbsp;' + T.getLang('is can not read!');
                                return;
                            }
                            if (data.contents instanceof Uint8Array && data.unpack) {
                                data.contents = await T.unFile(data.contents, status => pelm.innerHTML = status, { password: data.password });
                            }
                            S.runaction('WriteRooms', [data.file && data.file[0] || fileKey, data.contents, pelm]);
                            data = null;
                        } else if (act == 'run') {
                            S.runaction('DefaultRun', [elm.getAttribute('data-path')]);
                        } else if (act == 'readsys') {
                            let shtml = '', bhtml = "", system = elm.getAttribute('data-sys');
                            Nttr('.g-rooms').$$('[data-sys]').forEach(selm => {
                                selm.classList.remove('g-red');
                                selm.setAttribute('data-act', 'readsys');
                            });
                            elm.removeAttribute('data-act');
                            elm.classList.add('g-red');
                            Module.system = system;
                            I.toArr(await T.Module.DB.info.all(1, { Range: IDBKeyRange.only(system), 'index': 'system' }), entry => {
                                shtml += `<li><b>${entry[0]}</b><button class="g-btn" data-act="write" data-key="${entry[0]}">${T.getLang('WirteRooms')}</button><ul>${entry[1]['file'].map(file => `<li>${file}</li>`).join('')}</ul></li>`;
                            });
                            I.toArr(await T.Module.DB.bios.cursor('system', !0, { Range: IDBKeyRange.only(system), 'index': 'system' }), entry => {
                                bhtml += `<li><b>${entry[0]}</b>&nbsp;<button class="g-btn" data-act="write" data-file="${entry[0]}">${T.getLang('WriteBios')}</button></li>`;
                            });
                            T.$('.g-bios-result').innerHTML = bhtml;
                            T.$('.g-rooms-result').innerHTML = shtml;
                        }
                    }
                }

            });
            html += `<h2>${T.getLang('write game rooms')}</h2><p class="flex">`;
            if (bool) {
                html += `<button class="g-btn g-blue2" data-act="retroarch">${T.getLang('Enter on Retroarch')}</button>`;
            }
            html += `<button class="g-btn g-blue2" data-act="upload">${T.getLang('Write Files Directly')}</button><button class="g-btn g-blue2" data-act="unpack">${T.getLang('Write to a compressed file')}</button></p><p>${T.getLang('<b>warning:</b>compressed file support (7z|Zip|RAR4),Automatically determine the format!')}</p>`;
            if (Module.otherSystem) {
                html += '<div class="flex platform">';
                html += `<button class="g-btn g-red" data-sys="${system}">${T.getLang('platform')}:${system.toUpperCase()}</button>`;
                Module.otherSystem.split('|').forEach(sys => {
                    html += `<button class="g-btn" data-act="readsys" data-sys="${sys}">${T.getLang('platform')}:${sys.toUpperCase()}</button>`;
                });
                html += '</div>';
            }
            html += '<ul class="g-rooms-result">';
            html += '</ul>';
            Nttr('.g-rooms').html(html);
            if (Module.urlrooms) {
                let urlrooms = Module.urlrooms;
                if (/^(http|blob)/.test(urlrooms)) {
                    urlrooms = urlrooms;
                } else if (/^\//.test(urlrooms)) {
                    urlrooms = location.href.split('?')[0].split('&')[0].split('/').slice(0, -1).join('/') + urlrooms;
                } else {
                    urlrooms = Module.JSpath + 'rooms/' + urlrooms;
                }
                S.FileManager.Rooms_down(urlrooms, system, (filename, contents) => {
                    if (!contents) return S.addLoaderStatus('<b>ROOMS:</b>' + filename + '&nbsp;' + T.getLang('reading...'));
                    let pelm = T.$ce('li');
                    T.$('.g-rooms-result').appendChild(pelm);
                    S.runaction('WriteRooms', [filename, contents, pelm]);
                });
            } else {
                let rhtml = "";
                I.toArr(await T.Module.DB.info.all(1, { Range: IDBKeyRange.only(system), 'index': 'system' }), entry => {
                    rhtml += `<li><b>${entry[0]}</b><button class="g-btn" data-act="write" data-key="${entry[0]}">${T.getLang('WirteRooms')}</button><ul>${entry[1]['file'].map(file => `<li>${file}</li>`).join('')}</ul></li>`;

                });
                T.$('.g-rooms-result').innerHTML = rhtml;
            }
        },
        WriteRooms(path, contents, elm) {
            let S = this, T = S.T, I = T.I, Module = T.Module;
            if (!contents) elm.remove();
            if (contents instanceof Uint8Array) {
                let filePath = '/rooms/' + T.F.getname(path);
                Module.FSWRITE(filePath, contents);
                elm.innerHTML = `<b>${path}</b><button class="g-btn  g-blue" data-act="run" data-path="${filePath}">${T.getLang('RunRooms')}</button>`;
                S.addLoaderStatus('<b>ROOMS:</b>' + filePath + '&nbsp;' + T.getLang('is write!'));
            }
            else {
                let html = `<h4>${T.F.getname(path)}</h4><ul>`;
                I.toArr(contents, entry => {
                    let filePath = '/rooms/' + entry[0];
                    Module.FSWRITE(filePath, entry[1]);
                    S.addLoaderStatus('<b>ROOMS:</b>' + filePath + '&nbsp;' + T.getLang('is write!'));
                    html += `<li><b>${entry[0]}</b><button class="g-btn g-blue" data-act="run" data-path="${filePath}">${T.getLang('RunRooms')}</button></li>`;
                });
                elm.innerHTML = html + '</ul>';
            }
            contents = null;
        },
        DefaultStart() {
            let S = this, T = S.T, I = T.I, Module = T.Module;
            Nttr('.g-status').remove();
            Nttr('.g-bios').remove();
            Nttr('.g-rooms').remove();
            T.$('.g-game-welcome').remove();
            T.$('.g-btn-addContent').hidden = true;
            T.$('.g-btn-forward').hidden = false;
            T.Controller = new NengeController(T);
            Module.runaction('replaceArguments');
            Module.runaction('replaceController',[T.Controller]);
            console.log(Module.arguments);
            Module.callMain(Module.arguments);
            Module.running = true;
        },
        DefaultRun(path) {
            Module.arguments[1] = path;
            this.runaction('DefaultStart');
        }
    };
    BulidMenuList() {
        let S = this, T = S.T, MenuList = T.$('.g-menu-list .g-list');
        let btn = [T.$ce('div'), T.$ce('div'), T.$ce('div')], html = "";
        btn[0].innerHTML = T.getLang('File Manager');
        btn[1].innerHTML = T.getLang('Refresh Page');
        btn[2].innerHTML = T.getLang('Help And Teach');
        btn.forEach(v => MenuList.appendChild(v));
        Nttr(btn[1]).click(e => location.reload());
        Nttr(btn[2]).click(e => location.href = 'readme.html');
        S.FileManager = new NengeFile(T, btn[0]);
    }
    async BulidCores() {
        let S = this, T = S.T, CoresList = await T.Module.DB.system.keys(), html = "";
        html += `<h3>${T.getLang('Installed Cores')}</h3><ul>`;
        CoresList.forEach(v => html += S.addCoreItem(v.split('-'), 1));
        html += '</ul>'
            + `<p><b>${T.getLang('Remove Cores,not delete RoomFile/SaveFile/SateFile.')}</b></p>`
            + `<h3>${T.getLang('Cores List')}</h3>`
            + '<ul>';
        T.I.toArr(this.CoreSystem).forEach(
            System => {
                if (System[1]['cores']) {
                    let shtml = "";
                    T.I.toArr(System[1]['cores'], coresItem => {
                        shtml += S.addCoreItem([System[0], coresItem[0]]);
                    });
                    if (shtml) html += `<li><h4 data-act="show">${System[1]['name']}</h4><ul hidden>${shtml}</ul></li>`;
                }
            }
        );
        html += '</ul>';
        T.$('.system-cores-list').innerHTML = html;
        Nttr('.system-cores-list').click(e => {
            if (Nttr('.system-cores-list').active) return;
            let elm = e.target;
            if (elm instanceof Element) {
                let act = elm.getAttribute('data-act');
                if (act == 'show') {
                    elm.nextElementSibling.hidden = !elm.nextElementSibling.hidden;
                } else {
                    let coresItem = elm.getAttribute('data-cores');
                    if (coresItem) {
                        if (elm.classList.contains('g-red')) {
                            T.Module.DB.system.remove(coresItem);
                            elm.parentNode.remove();
                            return;
                        }
                        Nttr('.system-cores-list').active = true;
                        this.InstallCores(coresItem);
                    }

                }
            }
        });
        //<link rel="stylesheet" href="https://unpkg.com/gitalk/dist/gitalk.css">
        //<script src="https://unpkg.com/gitalk/dist/gitalk.min.js"></script>
    }
    getCore(system, core) {
        let S = this;
        //if(Module.coreInfo)return Module.coreInfo;
        if (S.CoreSystem[system] && S.CoreSystem[system]['cores']) {
            return S.CoreSystem[system]['cores'][core];
        }
    }
    addCoreItem(CoreItem, bool) {
        let S = this, T = S.T, info = "", del = "", [system, core] = CoreItem, coreInfo = S.getCore(system, core),corename;
        if (coreInfo) {
            if (coreInfo.install) return '';
            info = `<p><b>${T.getLang('support')}:</b>${coreInfo.support}</p>`;
            coreInfo.install = true;
        }
        if (bool) {
            del = `&nbsp;|&nbsp;<button class="g-btn g-red" data-cores="${system}-${core}">${T.getLang('removeCores')}</button>`;
        }
        console.log(system, core,coreInfo);
        if(coreInfo.system){
            corename = S.CoreSystem[coreInfo.system]['name']+'('+core+')';
        }else{
            corename = S.CoreSystem[system]['name'];
            corename = bool ? corename + '(' + core + ')' : core;
        }
        return `<li><h4>${corename}</h4>${info}<button class="g-btn g-blue" data-cores="${system}-${core}">${T.getLang('InstallCores?')}</button>${del}</li>`;
    }
    async RunUrlCore() {
        let S = this, T = S.T, I = T.I, CoresFile, core = Module.urlcore, system = Module.urlsys, coreKey;
        if (!core && system) {
            I.toArr(this.CoreSystem, v => {
                if (coreKey) return;
                if (v[0] == system) {
                    I.toArr(v[1].cores, k => {
                        if (coreKey) return;
                        coreKey = v[0] + '-' + k[0];
                    });
                }
            });
        } else if (core && !system) {
            I.toArr(this.CoreSystem, v => {
                if (coreKey) return;
                I.toArr(v[1].cores, k => {
                    if (coreKey) return;
                    if (k[0] == core) {
                        coreKey = v[0] + '-' + k[0];
                    }
                });
            });
        } else if (core && system) {
            coreKey = system + '-' + core;
        }
        if (!coreKey) {
            return this.BulidCores();
        }
        if (Module.urlcorepath) {
            Module.urlcorepath = /^http/.test(Module.urlcorepath) ? Module.urlcorepath : S.Module.JSpath + 'cores/' + Module.urlcorepath;
            CoresFile = await T.FetchItem({
                url: Module.urlcorepath, 'key': coreKey, 'store':T.Module.DB.system, 'unpack': true,
                dataOption: { system },
                Filter: Module.Uint8Filter,
                process: str => {
                    T.$('.system-cores-list').innerHTML = str;
                }
            });
        }
        return await this.InstallCores(coreKey, CoresFile);
    }
    async InstallCores(coreKey, CoresFile) {
        let S = this, T = S.T, [system, core] = coreKey.split('-'), coreInfo = S.getCore(system, core), listelm = Nttr('.system-cores-list'),systemInfo = S.CoreSystem[system];
        let elm = T.$('[data-cores="' + system + '-' + core + '"]');
        if (!elm) elm = T.$('.system-cores-list');
        coreInfo.key = system;
        coreInfo.core = core;
        system = coreInfo.system||system;
        Module.cores = coreKey;
        Module.SYSINFO = coreInfo;
        Module.system = system;
        Module.core = core;
        if(systemInfo.loader){
            coreInfo.loader = systemInfo.loader;
        }
        let installjs = coreInfo.installjs||systemInfo.installjs;
        if(installjs){
            let loaderUrl = /^http/.test(installjs) ? installjs : Module.JSpath + 'loader/' + installjs+'?'+Math.random();
            let coresLoader = await T.FetchItem({ url: loaderUrl, type: 'text', key: 'system-' + Module.coreKey});
            if (coresLoader) {
                await T.addJS(coresLoader);
                return new NengeInstall(this,elm);
            }
        }
        if (!CoresFile) {
            console.log(S.Module.JSpath + 'cores/' + coreInfo.url);
            if (coreInfo && coreInfo.url) {
                CoresFile = await T.FetchItem({
                    'url': S.Module.JSpath + 'cores/' + coreInfo.url,
                    'key': coreKey,
                    'store': T.Module.DB.system,
                    'unpack': true,
                    'dataOption': { system },
                    'Filter': Module.Uint8Filter,
                    process: str => {
                        elm.innerHTML = str;
                    }
                });
            } else {
                CoresFile = await T.Module.DB.system.data(coreKey);
            }
        }
        if (CoresFile && Object.entries(CoresFile).length > 1) {
            T.Module.CacheFile = {};
            Object.entries(CoresFile).forEach(
                entry => {
                    if (/\.wasm$/.test(entry[0])) {
                        T.Module.FileLoder = entry[0].replace('.wasm', '.js');
                        T.Module.wasmBinary = new Uint8Array(entry[1]);
                    } else if (/\.js.mem$/.test(entry[0])) {
                        T.Module.FileLoder = entry[0].replace('.mem', '');
                        T.Module.memBinary = new Uint8Array(entry[1]);
                    } else if (/\.js$/.test(entry[0])) {
                        T.Module.CacheFile[entry[0]] = new TextDecoder().decode(entry[1]);
                    } else {
                        T.Module.CacheFile[entry[0]] = new Blob([entry[1]], { type: T.F.gettype() });
                    }
                }
            )
            CoresFile = null;
            if (!T.Module.FileLoder) {
                if (!window.confirm(T.getLang('NotMatchAsmLoaderFile'))) {
                    listelm && (listelm.active = false);
                    return;
                }
            }
            this.RunCores();
        } else {
            listelm && (listelm.active = false);
        }
    }
    addLoaderStatus(txt) {
        let S = this, T = S.T, elm = T.$ct('p', txt);
        T.$('.g-status').appendChild(elm);
        return elm;
    }
    async RunCores() {
        let S = this, T = S.T, I = T.I, Module = T.Module, coreInfo = Module.SYSINFO;
        Nttr('.system-cores-list').remove();
        T.$('.g-start-ui').remove();
        T.$('.g-game-ui').hidden = false;
        if (typeof coreInfo.otherSystem != 'undefined') Module.otherSystem = coreInfo.otherSystem;
        T.$('.g-status').innerHTML = `<h2>${T.getLang('contrlllor status')}</h2>`;
        if (Module.FileLoder) {
            let asmjs = Module.CacheFile[Module.FileLoder];
            if (Module.memBinary) {
                asmjs = asmjs.replace(Module.FileLoder + '.mem', T.F.URL(Module.memBinary, T.F.gettype()));
                delete Module.memBinary;
            }
            let loaderStatus = S.addLoaderStatus(T.getLang('TryDefaultLoader?'));
            if (coreInfo.loader) {
                let loaderUrl = /^http/.test(coreInfo.loader) ? coreInfo.loader : Module.JSpath + 'loader/' + coreInfo.loader;
                let coresLoader = await T.FetchItem({ url: loaderUrl, type: 'text', key: 'system-' + Module.coreKey });
                if (coresLoader) {
                    await T.addJS(coresLoader);
                    new NengeLoader(this, asmjs);
                    delete Module.CacheFile[Module.FileLoder];
                    return;
                }
            }
            loaderStatus.innerHTML = T.getLang('UsingDefaultLoader');
            await S.runaction('DefaultLoader', [asmjs]);
            loaderStatus.innerHTML = T.getLang('please write bios or rooms.');
            await S.runaction('DefaultBios');
            await S.runaction('DefaultRooms', [1]);
        }

    }
    CoreSystem = {
        'gb': {
            name: 'Game Boy / Color',
            bios: 'gba.zip',
            cores: {
                'gambatte': {
                    support: 'gb',
                    url: 'gambatte_libretro.zip',
                }
            }
        },
        'gba': {
            name: 'Game Boy Advance',
            bios: 'gba.zip',
            cores: {
                'mGBA': {
                    support: 'gb|gba',
                    otherSystem: 'gb',
                    url: 'mgba_libretro.zip',
                },
                'vba_next': {
                    support: 'gba',
                    url: 'vba_next_libretro.zip',

                }
            }
        },
        'n64': 'N64',
        'nes': {
            name: 'NES / Famicom',
            cores: {
                'nestopia': {
                    url: 'nestopia_libretro.zip',
                    support: 'nes',
                },
            }
        },
        'snes': {
            name: 'SNES',
            cores:{
                'snes9x':{
                    url:'snes9x_libretro.zip',
                    support: 'nes',
                }
            }
        },
        'nds': {
            name: 'NDS'
        },
        'psx': {
            name: 'PS1'
        },
        'arcade': {
            name: 'Arcade',

        },
        'sega': {
            name: 'Sega - MS/GG/MD/CD',
            cores: {
                'genesis_plus_gx': {
                    url: 'genesis_plus_gx_libretro.zip',
                    support: 'sega',
                    otherSystem: 'segaCD',
                },
            }
        },
        'emulatorjs':{
            name:"www.emulator.com",
            installjs:"emulator_install.js",
            "cores":{
                "psx":{
                    url: 'emulatorjs/psx-wasm.7z',
                    system: 'psx',
                    support: 'psx',
                },
                "gba":{
                    system: 'gba',
                    support: 'gba|gb',
                },
                "gb":{
                    system: 'gb',
                    support: 'gb',
                },
                "nes":{
                    system: 'nes',
                    support: 'nes',
                },
                "snes":{
                    system: 'snes',
                    support: 'snes',
                },
                "nds":{
                    system: 'nds',
                    support: 'nds',
                },
            }
        }
        /*
        'segacd':{
            name:'segacd'
        },
        //'mesen': ['fds', 'nes', 'unif', 'unf'],
        'vb':{
            name:'vb'
        },
        '3do':{
            name:'3do'
        },
        'lynx':{
            name:'lynx',
        },
        'jaguar':{
            name:'jaguar'
        },
        'a7800':{
            name:'a7800'
        },
        'a2600':{
            name:'a2600'
        },
        'ngp':{
            name:'ngp'
        },
        'pce':{
            name:'pce'
        },
        */
    }
}(Nenge);