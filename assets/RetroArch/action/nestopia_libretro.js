(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['nes'];
    Module.system_ext = T.action.sysType['nes'];
    Module.system_bios = this.JSpath+'bios/nes.png';
    this.$('.game-ui .g-ctrl').classList.add('nes');
}).call(Nenge);