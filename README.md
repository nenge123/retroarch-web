# retroarch-web Core form

- libretro-cores form [https://buildbot.libretro.com/]
    >https://buildbot.libretro.com/nightly/emscripten/

- other-cores 
  - [https://github.com/BinBashBanana/webretro]
  - [https://www.emulatorjs.com] this site cores have crc hash key each hours change!.

# Module.js
- NengeDisk
    > replace FS.mout
    ```javascript
    let disk = new NengeDisk(Moudule),path='saves';
    FS.createPath('/', path, !0, !0);
    FS.mount(disk, {}, path);

    await disk.mountReady();
    //wait indexDB file => FS file;
    ```
    > if FS file changge, this file will auto save in indexDB.
- RetroArch Sound Bug in Mobile.
    > replace js
    ```javascript
    replace(
        /_RWebAudioInit\(latency\)\s?\{/,
        '_RWebAudioInit(latency){Module.latency=latency;'
    ).replace(
        /function\s?_RWebAudioStart\(\)\s?\{/,
        'function _RWebAudioStart() {if(RA.context && RA.context.state != "running") return Module.mobileAudioRun(RA);'
    ).replace(
        /_RWebAudioWrite\(\)\s?\{/,
        '_RWebAudioWrite(buf,size){if(RA.context&&RA.context.state != "running")return Module.mobileAudioRun(RA);\n'
    );
    {
        mobileAudioRun(RA) {
            let M = Module;
            M.pauseMainLoop && M.pauseMainLoop();
            //show some UI to user
            //some event like click  to run==>mobileAudioRest(RA);
        };
        mobileAudioRest(RA) {
            let M = Module;
            RA = RA || M.RA;
            if (RA.context) RA.context.resume();
            if (!RA.context || RA.context.state != 'running') {
                RA.bufIndex = 0;
                RA.bufOffset = 0
                var ac = window["AudioContext"] || window["webkitAudioContext"];
                if (RA.context) {
                    RA.context.close();
                    delete RA.context;
                }
                RA.context = new ac;
                RA.numBuffers = M.latency * RA.context.sampleRate / (1e3 * RA.BUFFER_SIZE) | 0;
                if (RA.numBuffers < 2) RA.numBuffers = 2;
                for (var i = 0; i < RA.numBuffers; i++) {
                    RA.buffers[i] = RA.context.createBuffer(2, RA.BUFFER_SIZE, RA.context.sampleRate);
                    RA.buffers[i].endTime = 0
                }
                RA.nonblock = false;
                RA.startTime = 0;
                RA.context.createGain();
                RA.setStartTime();
                RA.context.resume();
            }
            M.resumeMainLoop();
        }
    }
    ```
    

# common.js
- indexDB info in `NengeStart.js`
    ```javascript
    T.DB_NAME = 'RetroArch_WEB';
    T.LibStore = 'data-libjs';
    T.version = 5;
    T.DB_STORE_MAP = {
        'data-rooms': {},
        'data-info': { 'system': false },
        'data-system': {},
        'data-bios': { 'system': false },
        'retroarch': { 'timestamp': false },
        'userdata': { 'timestamp': false },
        'data-libjs': {},
    };
    ```
- IndexDB use guide
    ```javascript
    let system = Nenge.getStore('data-system');
    await system.get('gambatte_libretro.zip');
    //output {contents:{xxx.js:Uint8Array},system:'gb',filesize: ,filetype: ,timestamp: ,type}
    //if has 'contents' and filesize>0x6400000:gambatte_libretro.zip,gambatte_libretro.zip-part-1,gambatte_libretro.zip-part-2=>contents0,contents1,contents2=>contents
    await system.data('gambatte_libretro.zip');
    //output {xxx.js:Uint8Array}
    system.remove('gambatte_libretro.zip');
    //indexdb remove  gambatte_libretro.zip
    system.put('gambatte_libretro.zip',1);
    //indexdb add  gambatte_libretro.zip=>1
    //if filesize>0x6400000 will add gambatte_libretro.zip,gambatte_libretro.zip-part-1,gambatte_libretro.zip-part-2
    system.setData('gambatte_libretro.zip',1);
    //indexdb add  gambatte_libretro.zip=>{contents:1,timestamp:}
    await system.keys();
    //output ['gambatte_libretro.zip']
    await system.all();
    //output {'gambatte_libretro.zip':{data...}}
    await system.cursor('system',1);
    //output {'gambatte_libretro.zip':{system:'gb'}}
    await system.cursor('system',1,IDBKeyRange.only('gb'));
    //output {'gambatte_libretro.zip':{system:'gb'}}
    await system.cursor('system',1,IDBKeyRange.only('gba'));
    //output {}
    ```
- FetchItem
    >this is support post
    ```javascript
    Nenge.FetchItem({
        url:'gambatte_libretro.zip',//core file
        unpack:true,//if a zip/7z/rar4
        key:'gambatte_libretro.zip',//if null this name will be href name;
        store:'data-system',//if set this,will save or load on IndexDB
        dataOption:{
            system:'gb'//indexDB add save option data
        },
        /* other option */
        get:{k:1},//if set, url=>gambatte_libretro.zip?k=1
        post:Nenge.I.post({'key':1} | [FormElment][FormData] ),//post method
        json:{},//if post a json File Body
        /* end option */
        success(contents){
            if(contents instanceof Uint8Array){
                //base return 
            }else{
                //if a  zip/7z/rar4 and open upack=true
                Nenge.I.toArr(contents,entry=>{

                });
            }
        },
        error(text){
        },
        process(status){
            // 0% => 100% download
        }

    });
    Nenge.FetchItem({
        url:'xx.json',
        type:'json',
        success(json){
        },
        error(text){
        },
        process(status){
            // 0% => 100% download
        }
    });

    ```
- ajax
    > this not have indexdb,only use to get page content
    ```javascript
    Nenge.ajax({
        url:'xx.json',
        type:'json',
        success(json){
        },
        error(text){
        },
        process(status){
            // 0% => 100% download
        },
        PostProcess(status){
            // 0% => 100% upload
        }
    });

    ```