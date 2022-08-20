(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['gb'];
    Module.system_ext = T.action.sysType['gb'];
    Module.system_bios = this.JSpath+'bios/gba.png';
    this.$('.g-game-ctrl').classList.add('gba');
}).call(Nenge);