(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Object.assign(Module,{
        'system_name':['gba'],
        'system_ext':Module.systemMap['vbanext'],
        'system_bios':Module.JSpath+'bios/gba.png'
    });;
    this.$('.g-game-ctrl').classList.add('gba');
}).call(Nenge);