(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['nes'];
    Module.system_ext = Module.systemMap['nes'];
    Module.system_bios = Module.JSpath+'bios/nes.png';
    this.$('.g-game-ctrl').classList.add('nes');
}).call(Nenge);