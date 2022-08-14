(async function () {
    let T=this,Module = T.Module,FS = Module.FS,CreateDataFile = Module.CreateDataFile,RAND = T.unitl.random;
    Module.system_name = ['n64'];
    Module.system_ext = T.action.sysType['n64'];
    Module.system_bios = this.JSpath+'bios/psx.png?'+RAND;
    FS.createPath('/', '/userdata', !0, !0);
    FS.createPath('/', '/home/web_user/retroarch/userdata', !0, !0);
    FS.mount(Module.SyncFsDB, {}, '/userdata');
    FS.mount(Module.SyncFsDB, {}, '/home/web_user/retroarch/userdata');
    await Module.SyncFsDB.mountReady();
    FS.createPath('/', '/userdata/saves', !0, !0);
    FS.createPath('/', '/userdata/states', !0, !0);
    FS.createPath('/', '/userdata/screenshots', !0, !0);
    FS.createPath('/', '/userdata/cheats', !0, !0);
    FS.createPath('/', '/userdata/rooms', !0, !0);
    FS.createPath('/', '/userdata/rooms/downloads', !0, !0);
    FS.createPath('/', '/userdata/config', !0, !0);
    FS.createPath('/', '/userdata/config/remaps', !0, !0);
    FS.createPath('/', '/userdata/thumbnails', !0, !0);
    FS.createPath('/', '/system', !0, !0);
    let cfg_path = '/home/web_user/retroarch/userdata/retroarch.cfg';
    if (!FS.analyzePath(cfg_path).exists) {
        let cfg_txt = await (await fetch(this.JSpath + 'config/retroarch.js?' + RAND)).text();
        cfg_txt += '\nsavefile_directory = "userdata/saves"'
        +'\nsavestate_directory = "userdata/states"'
        +'\nscreenshot_directory = "userdata/screenshots"'
        +'\nsystem_directory = "system/"'
        +'\nrgui_browser_directory = "userdata/rooms"'
        +'\ncore_assets_directory = "userdata/rooms/downloads"'
        +'\ncheat_database_path = "userdata/cheats"'
        +'\nrgui_config_directory = "userdata/config"'
        +'\ninput_remapping_directory = "userdata/config/remaps"'
        +'\nthumbnails_directory = "userdata/thumbnails"';
        CreateDataFile(cfg_path, cfg_txt);

    }
    if (!FS.analyzePath('/bundle/assets/glui/').exists) Object.entries(await this.FectchItem({
        'url': this.JSpath + 'frontend/bundle.png?'+RAND,
        'unpack': true,
        'store': 'data-libjs',
        'key': 'retroarch-glui',
        'version': T.version,
    })).forEach(value => {
        CreateDataFile('/home/web_user/retroarch/bundle/' + value[0], value[1]);
    });
    Module.canvasX = 0;
    Module.canvasY = 0;
    T.on(Module.canvas,'touchend',e=>{
        if(e.changedTouches[0]){
            let x = e.changedTouches[0].screenX,y=e.changedTouches[0].screenY;
            Module.canvasMovementX = x - Module.canvasX;
            Module.canvasMovementY = y - Module.canvasY;
            Module.canvasX = x;
            Module.canvasY = y;
        }
    });
    T.on(Module.canvas,'toucmove',e=>{
        if(e.changedTouches[0]){
            let x = e.changedTouches[0].screenX,y=e.changedTouches[0].screenY;
            Module.canvasMovementX = x - Module.canvasX;
            Module.canvasMovementY = y - Module.canvasY;
            Module.canvasX = x;
            Module.canvasY = y;
        }
    });
    Module.getClientX = (e,rect,sacl)=>{
        if(rect.left==0){
            return e.clientX - rect.left;
        }
    };
    Module.getClientY = (e,rect,sacl)=>{
        if(rect.left==0){
            return e.clientY - rect.top;
        }
    };
    Module.argumentsInfo = file=>file&&[file,"--verbose"]||["--verbose",'--menu'];
}).call(Nenge);