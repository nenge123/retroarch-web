(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['sega'];
    Module.system_ext = Module.systemMap['sega'];
    Module.system_bios = Module.JSpath+'bios/sega.png';
    this.$('.g-game-ctrl').classList.add('sega');
}).call(Nenge);