(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['gba'];
    Module.system_ext = T.action.sysType['gba'];
    Module.system_bios = this.JSpath+'bios/gba.png';
    await T.runaction('game-FS-mount-db',[FS]);
    T.runaction('game-FS-mkdir-base',[FS]);
    await T.runaction('game-FS-config-cfg',[FS,'/home/web_user/retroarch/userdata/retroarch.cfg','',true]);
    this.$('.game-ui .g-ctrl').classList.add('gba');
}).call(Nenge);