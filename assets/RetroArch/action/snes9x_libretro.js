(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['snes'];
    Module.system_ext = T.action.sysType['snes'];
    Module.system_bios = this.JSpath+'bios/snes.png';
    this.$('.game-ui .g-ctrl').classList.add('snes');
}).call(Nenge);