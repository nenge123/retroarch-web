(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['gba'];
    Module.system_ext = Module.systemMap['gba'];
    Module.system_bios = Module.JSpath+'bios/gba.png';
    this.$('.g-game-ctrl').classList.add('gba');
}).call(Nenge);