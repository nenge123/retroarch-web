(async function () {
    let T=this,Module = T.Module,FS = Module.FS,CreateDataFile = Module.CreateDataFile;
    FS.createPath('/', '/userdata', !0, !0);
    FS.createPath('/', '/userdata/saves', !0, !0);
    FS.createPath('/', '/userdata/states', !0, !0);
    FS.createPath('/', '/userdata/screenshots', !0, !0);
    FS.createPath('/', '/userdata/cheats', !0, !0);
    FS.createPath('/', '/userdata/rooms', !0, !0);
    FS.createPath('/', '/userdata/rooms/downloads', !0, !0);
    FS.createPath('/', '/userdata/config', !0, !0);
    FS.createPath('/', '/userdata/config/remaps', !0, !0);
    FS.createPath('/', '/userdata/thumbnails', !0, !0);
    FS.createPath('/', '/home/web_user/retroarch/userdata', !0, !0);
    FS.mount(Module.SyncFsDB, {}, '/userdata');
    FS.mount(Module.SyncFsDB, {}, '/home/web_user/retroarch/userdata');
    await Module.SyncFsDB.mountReady();
    let cfg_path = '/home/web_user/retroarch/userdata/retroarch.cfg';
    if (!FS.analyzePath(cfg_path).exists) {
        let cfg_txt = await (await fetch(this.JSpath + 'config/retroarch.js?' + RAND)).text();
        cfg_txt += `\nsavefile_directory = "userdata/saves"
    savestate_directory = "userdata/states"
    screenshot_directory = "userdata/screenshots"
    system_directory = "${sys2}"
    rgui_browser_directory = "userdata/rooms"
    core_assets_directory = "userdata/rooms/downloads"
    cheat_database_path = "userdata/cheats"
    rgui_config_directory = "userdata/config"
    input_remapping_directory = "userdata/config/remaps"
    thumbnails_directory = "userdata/thumbnails"
    `;
        CreateDataFile(cfg_path, cfg_txt);

    }
    if (!FS.analyzePath('/bundle/assets/glui/').exists) Object.entries(await this.FectchItem({
        'url': this.JSpath + 'frontend/bundle.js',
        'unpack': true,
        'store': 'data-libjs',
        'key': 'retroarch-glui',
        'version': T.version,
    })).forEach(value => {
        CreateDataFile('/home/web_user/retroarch/bundle/' + value[0], value[1]);
    });
    let gamename = '--menu';
    Object.entries(await this.FectchItem({
        'url': this.JSpath + 'test.zip',
        'unpack': true,
        'store': 'data-libjs',
        'key': 'retroarch-test-gba',
        'version': T.version,
    })).forEach(value => {
        if (/\.gba/i.test(value[0])) gamename = value[0];
        CreateDataFile('/' + value[0], value[1]);
    });
    delete Module.wasmBinary;
    corefile = null;
    let callInfo = ['-v', gamename];
    this.$('.start').hidden = true;
    this.$('.game-ui').classList.add('active');
    "ontouchend" in document ? Module.onceClick(() => {
        this.Module.callMain(callInfo);
    }) : this.Module.callMain(callInfo);
}).call(Nenge);