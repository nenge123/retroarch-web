(async function () {
    let T = this,
        Module = T.Module,
        FS = Module.FS;
    Object.assign(Module, {
        'hash': '9ab0c765d6622ab96b07c801b6bcd2cd32d57c66d2f3ea56d2af90bef14773f0',
        'system_name': ['psx'],
        'system_ext': T.action.sysType['psx'],
        'system_bios': this.JSpath + 'bios/psx.png',
        'argumentsInfo':file=>{
            return ['-v',file,Module.hash];
        },
        'myRuntimeInitialized': async () => {
            Module.specialHTMLTargets && (Module.specialHTMLTargets['#canvas'] = Module.canvas);
            
        },
        'RetroarchJS': () => {
            if (typeof window.EmulatorJS_) {
                window.EmulatorJS_(Module);
            }
        }
    });
    //Module.callMain(['-v','/Dragon Quest Monsters 1 & 2.img','9ab0c765d6622ab96b07c801b6bcd2cd32d57c66d2f3ea56d2af90bef14773f0'])
}).call(Nenge);