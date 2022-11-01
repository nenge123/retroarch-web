(async function () {
    let T = this,
        Module = T.Module,FS,
        saveStateBtn = Nttr('[data-key="save_state"]');
        Object.assign(this.action,{
            
            'game-action-save':()=>Module._cmd_savefiles(),
            'game-start':()=>{
                Module._event_load_save_files();
            },
            'indexdb-sync':(ready,data)=>{
                console.log(ready,data);
                if(ready){
                    data.forEach(val=>{
                        if(/\.state/.test(val)){
                            Module.alert('即时存档已保存\n'+val);
                            saveStateBtn.hidden = false;
                        }
                        })
                }
            }
        })
        Object.assign(Module, {
            /**key: e6f9b2cd63d3666d5ba080adcbcefdbd7d4c43e0f2069d6c85ff2c6517f6403f
key2: 17333c36c2966df588510b1e9868c3a132d57c66d2f3ea56d2af90bef14773f0 
ad708b6ff060dd70c2ce3adcb065dbe7

key: 45b269885dd9162e9e8a1c2ab3e5edbb
     7d4c43e0f2069d6c85ff2c6517f6403f
key2: 3796f63fcc26d8c2d3fc3da575c65fbe
      32d57c66d2f3ea56d2af90bef14773f0
1774be3320ec7d8b76d1b852502fe276
32d57c66d2f3ea56d2af90bef14773f0
537403BC

key: d60aeb80aaa019c15230adc269e862d
    d7d4c43e0f2069d6c85ff2c6517f6403f
key2: 6ccd78a4401ae6c9fda8e770ddbf7608
    32d57c66d2f3ea56d2af90bef14773f0
    537403BC
*/
            'hash': '17333c36c2966df588510b1e9868c3a132d57c66d2f3ea56d2af90bef14773f0',
            'hash_key':'2',
            'hash_key2':'6ccd78a4401ae6c9fda8e770ddbf7608'+'32d57c66d2f3ea56d2af90bef14773f0',
            'system_name': ['psx'],
            'system_ext': Module.systemMap['psx'],
            'system_bios': Module.JSpath + 'bios/psx.png',
            'system_uipath': '/bundle/',
            'setArgument': file => {
                if (!file) {
                    return alert('must need game file');
                }
                return ['--verbose', '/' + file, Module.hash_key&&Module.get_content_crc?Module.hash:Module.hash_key2];
            },
            customLog(text){
                if(/Redirecting savestate to /.test(text)){
                    //[INFO] Redirecting savestate to "userdata/states/Dragon Quest Monsters 1 & 2.state".
                    let match = text.match(/"(.+?)"/);
                    if(match[1]){
                        this.stateFilePath = match[1];
                    }

                }else{
                    this.setResizeWH(text);
                    console.log(text);
                }
            },
            'myRuntimeInitialized': (FS) => {

            },
            'myKeyEnter': (type, key, str) => {
                let data = type?1:0;
                let code = Module.keyCode_mymap['input_'+str];
                if(data &&(code >= 0x10 && code <= 0x17)){
                    data = 0x7fff;
                }
                if(code instanceof Function)return code(data);
                Module["_simulate_input"](0,code,data);
            },
            'keyCode_mymap': {
                input_player1_b: 0,
                input_player1_a: 8,
                input_player1_x:9,
                input_player1_y: 1,
                input_player1_select: 2,
                input_player1_start: 3,
                input_player1_up: 4,
                input_player1_down: 5,
                input_player1_left: 6,
                input_player1_right: 7,
                input_player1_l: 10,
                input_player1_r: 11,
                input_player1_l2: 12,
                input_player1_r2: 13,
                input_player1_l3: 14,
                input_player1_r3: 15,
                input_player1_l_x_plus:16,
                input_player1_l_x_minus:17,
                input_player1_l_y_plus:18,
                input_player1_l_y_minus:19,
                input_player1_r_x_plus:20,
                input_player1_r_x_minus:21,
                input_player1_r_y_plus:22,
                input_player1_r_y_minus:23,
                input_reset:()=>Module._system_restart(),
                input_screenshot:()=>Module.cwrap('cmd_take_screenshot', '', []),
                input_pause_toggle:48,
                input_load_state:()=>Module._cmd_load_state(),
                input_save_state:()=>{
                    if(saveStateBtn.hidden) return;
                    saveStateBtn.hidden = true;
                    if(Module.stateFilePath){
                        if (Module.FS.analyzePath(Module.stateFilePath).exists) Module.FS.unlink(Module.stateFilePath);
                    }
                    if(Module.saveTime)clearTimeout(Module.saveTime);
                    Module.saveTime = setTimeout(()=>Module._cmd_save_state(),200)},
                input_menu_toggle: "f1",
                input_toggle_slowmotion: "nul",
                /**
                 * 
         * 37 
         * 40 即时存档
         * 41 即时读档
         * 42 摄像头
         * 43 退出
         * 44 存档位置 增加
         * 45 存档位置 减少
         * 47 录制??
         * 48 暂停/继续
         * 49 暂停*/
            },
            //'inputClick': (index, key, status) => Module.cwrap('simulate_input', 'null', ['number', 'number', 'number'])(index, key, status),
            'RetroarchJS': async () => {
                    let datainfo = await T.FetchItem({
                        'url':'https://www.emulatorjs.com/api/v?name='+Module.system_keytext+'&_t='+T.F.random,
                        'type':'json',
                        'success':(text,headers)=>{
                            if(headers.key){
                                Module.hash_key = headers.key;
                            }
                            if(headers.key2){
                                Module.hash_key2 = headers.key2;
                            }
                            console.log(text);
                        }
                    });
                    if(!datainfo){
                        alert('必须链接网络,must connnect network');
                        location.reload();
                    }
                    Module.coreInfo = datainfo;
                if (typeof window.EmulatorJS_ != 'undefined') {
                    await window.EmulatorJS_(Module);
                    FS = Module.FS;
                    if (Module.specialHTMLTargets) {
                        Module.specialHTMLTargets['0'] = Module.canvas;
                        Module.specialHTMLTargets['#canvas'] = Module.canvas;
                    }
                    FS.createPath('/', '/bundle/shaders/', !0, !0);
                    FS.createPath('/', '/etc', !0, !0);
                    T.runaction('game-FS-mount-path', ['/userdata']);
                    await Module.FileDB.mountReady();
                    let config = T.runaction('game-FS-config-path');
                    config +=
                        '\nautosave_interval = "1"\n' +
                        'camera_allow = "false"\n' +
                        'camera_driver = "null"\n' +
                        'camera_device = "null"\n' +
                        'video_vsync = true\n' +
                        'video_shader = /bundle/shaders/shader.glslp\n' +
                        'video_shader_enable = true\n' +
                        'video_font_enable = false\n' +
                        'video_scale = 1.0\n' +
                        'fastforward_ratio = 1.0\n' +
                        'video_smooth = false\n' +
                        'auto_screenshot_filename = "false"\n' +
                        'video_shader_dir = "bundle/shaders"';
                    T.runaction('game-FS-ui-file', [FS]);
                    T.runaction('game-FS-config-cfg', [FS, '/etc/retroarch.cfg', config]);
                    T.runaction('game-FS-mkdir-base', [FS]);
                    let tipsdiv = T.$ce('div');
                    document.body.appendChild(tipsdiv);
                    Module.tipsdiv = Nttr(tipsdiv);
                    Module.tipsdiv.hidden = true;
                    Module.tipsdiv.css = 'position: fixed;top: 32px;left: 0;right: 0;bottom: 0;margin:auto;height:120px;width:250px;z-index: 99999999;background: #fff;';
                }
            },
            alert(text){
                this.tipsdiv.obj.innerHTML = text;
                this.tipsdiv.hidden = false;
                setTimeout(()=>this.tipsdiv.hidden=true,1000);
            }
        });
    //Module.callMain(['-v','/Dragon Quest Monsters 1 & 2.img','9ab0c765d6622ab96b07c801b6bcd2cd32d57c66d2f3ea56d2af90bef14773f0'])
}).call(Nenge);