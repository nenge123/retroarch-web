(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Object.assign(Module,{
        'system_name':['gba'],
        'system_ext':Module.sys_map['vbanext'],
        'system_bios':this.JSpath+'bios/gba.png'
    });;
    this.$('.g-game-ctrl').classList.add('gba');
}).call(Nenge);