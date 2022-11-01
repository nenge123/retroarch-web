(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['gb'];
    Module.system_ext = Module.systemMap['gb'];
    Module.system_bios = Module.JSpath+'bios/gba.png';
    this.$('.g-game-ctrl').classList.add('gba');
}).call(Nenge);