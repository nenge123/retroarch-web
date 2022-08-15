(async function () {
    let T=this,Module = T.Module,FS = Module.FS;
    Module.system_name = ['psx'];
    Module.system_ext = T.action.sysType['psx'];
    Module.system_ext.push('ccd');
    Module.system_bios = this.JSpath+'bios/psx.png';
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