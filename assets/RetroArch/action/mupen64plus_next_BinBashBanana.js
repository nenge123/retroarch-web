(async function () {
    let T=this,Module = T.Module,FS = Module.FS,CreateDataFile = Module.CreateDataFile,RAND = T.unitl.random;
    Module.system_name = ['n64'];
    Module.system_ext = T.action.sysType['n64'];
    Module.system_bios = this.JSpath+'bios/n64.png';
    await T.runaction('game-FS-mount-db',[FS]);
    T.runaction('game-FS-mkdir-base',[FS]);
    let cfg_path = '/home/web_user/retroarch/userdata/retroarch.cfg';
    await T.runaction('game-FS-config-cfg',[FS,cfg_path]);
    Module.canvasX = 0;
    Module.canvasY = 0;
    T.on(Module.canvas,'touchend',e=>{
        if(e.changedTouches[0]){
            let x = e.changedTouches[0].screenX,y=e.changedTouches[0].screenY;
            Module.canvasMovementX = x - Module.canvasX;
            Module.canvasMovementY = y - Module.canvasY;
            Module.canvasX = x;
            Module.canvasY = y;
        }
    });
    T.on(Module.canvas,'toucmove',e=>{
        if(e.changedTouches[0]){
            let x = e.changedTouches[0].screenX,y=e.changedTouches[0].screenY;
            Module.canvasMovementX = x - Module.canvasX;
            Module.canvasMovementY = y - Module.canvasY;
            Module.canvasX = x;
            Module.canvasY = y;
        }
    });
    Module.getClientX = (e,rect,sacl)=>{
        if(rect.left==0){
            return e.clientX - rect.left;
        }
    };
    Module.getClientY = (e,rect,sacl)=>{
        if(rect.left==0){
            return e.clientY - rect.top;
        }
    };
    Module.argumentsInfo = file=>file&&[file,"--verbose"]||["--verbose",'--menu'];
}).call(Nenge);