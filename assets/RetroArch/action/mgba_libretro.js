(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['gba'];
    Module.system_ext = T.action.sysType['gba'];
    Module.system_bios = this.JSpath+'bios/gba.png';
    this.$('.game-ui .g-ctrl').classList.add('gba');
}).call(Nenge);