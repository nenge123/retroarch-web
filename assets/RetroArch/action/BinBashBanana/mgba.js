(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['gba'];
    Module.system_ext = Module.sys_map['gba'];
    Module.system_bios = this.JSpath+'bios/gba.png';
    this.$('.g-game-ctrl').classList.add('gba');
}).call(Nenge);