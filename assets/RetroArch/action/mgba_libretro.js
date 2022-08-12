(async function () {
    let T=this,Module = T.Module,FS = Module.FS,CreateDataFile = Module.CreateDataFile,RAND = T.unitl.random;
    Module.system_name = ['gba'];
    Module.system_ext = T.action.sysType['gba'];
    Module.system_bios = this.JSpath+'bios/gba.png?'+RAND;
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
    delete Module.wasmBinary;
    corefile = null;
    this.$('.g-main .start').hidden = true;
    this.$('.g-header .add').hidden = false;
    this.$('.game-ui').classList.add('active');
    this.$('.game-ui .ctrl').classList.add('gba');
    T.runaction('addDATAonWelcome');
}).call(Nenge);