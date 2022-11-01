(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['snes'];
    Module.system_ext = Module.systemMap['snes'];
    Module.system_bios = Module.JSpath+'bios/snes.png';
    this.$('.g-game-ctrl').classList.add('snes');
}).call(Nenge);