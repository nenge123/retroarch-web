# 运行流程 process

```javascript

var Module = new class{
    noInitialRun = true;//disable autostart
    arguments = ["-v", "--menu"];//[option] if autostart will using this arg
    //-v  show debug
    // --menu  statr on retroarch main UI.
    // ["-v", "[game file path]"] show debug and load this game file path.
    onRuntimeInitialized(){
        //when the 'gambatte_libretro.js' is run ,this func will running
        this.runaction('start');
    }
    action = {};
}
Moudule.runaction = Nenge.runaction; //set a  runaction

let coredata = Nenge.FetchItem({
    url:'gambatte_libretro.zip',
    unpack:true,
    store:'data-system'
});
/*
    {
        'gambatte_libretro.wasm':Uint8Araray,
        'gambatte_libretro.js':Uint8Araray,
    }
*/
Module.wasmBinary = coredata['gambatte_libretro.wasm'];
let asmjs = coredata['gambatte_libretro.js'];
//if not set will download file "gambatte_libretro.wasm" in gambatte_libretro.js
/*
    Nenge.I.toArr(
        coredata,
        entry=>{
            if(/\.wasm$/.test(entry[0]))Module.wasmBinary = entry[1];
            if(/\.js$/.test(entry[0]))asmjs = entry[1];

        }
    );
*/

asmjs = new TextDecoder().decode(asmjs);
//we must make sure Module.FS,Module.RA is a value.
asmjs = asmjs.replace(
    /Module\["run"\]\s*=\s*run;/,
    'Module.FS = FS;Module.RA = RA;Module["run"] = run;'
);
Module.action['start'] = ()=>{
    //core is start!
    //if must make file path,some times lost path can't running! like about snes.
    let FS = Module.FS;    
    FS.createPath('/', '/userdata', !0, !0);
    FS.createPath('/', '/home/web_user/retroarch/userdata', !0, !0);
    //like snes will have FS.createPath('/', '/home/web_user/retroarch/userdata/', !0, !0);
    FS.createPath('/', '/home/web_user/retroarch/bundle', !0, !0);
    ///home/web_user/retroarch/userdata/retroarch.cfg
    FS.writeFile([gamepath],[gamedata]);
    
    Module.callMain(['-v','[gamepath]']);
};
(new Function('Module',asmjs))(Module);

```
