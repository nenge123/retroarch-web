(async function () {
    let T=this,Module = T.Module,FS = Module.FS,CreateDataFile = Module.CreateDataFile,RAND = T.unitl.random;
    Module.system_name = ['nes'];
    Module.system_ext = T.action.sysType['nes'];
    Module.system_bios = this.JSpath+'bios/nes.png';
    await T.runaction('game-FS-mount-db',[FS]);
    T.runaction('game-FS-mkdir-base',[FS]);
    let cfg_path = '/home/web_user/retroarch/userdata/retroarch.cfg';
    await T.runaction('game-FS-config-cfg',[FS,cfg_path]);
    this.$('.game-ui .g-ctrl').classList.add('nes');
}).call(Nenge);