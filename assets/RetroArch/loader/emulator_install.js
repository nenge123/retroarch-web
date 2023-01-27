class NengeInstall {
    'hash' = '2b35cacf70aef5cbb3f38c0bb20e488cc8ad0c350400499a0';
    constructor(S, elm) {
        let T = S.T,
            I = T.I,
            Module = T.Module;
        I.defines(this, {S,T,I,Module}, 1);
        this.runaction = T.runaction;
        this.install(elm);
    }
    async install(elm) {
        let L = this,S = L.S,T = L.T,Module = T.Module,I=L.I;
        let loghtml = `<h2>${T.getLang('FS log')}</h2>`;
        let core = Module.core;
        let urlfile = core+'-wasm.data';
        let corefile = await T.FetchItem({
            'url': 'https://www.emulatorjs.com/cores/'+core+'-wasm.data',
            'process':e=>{
                elm.innerHTML = urlfile+e;
            },
            'Filter': (buf) => {
                buf = buf.slice(12);buf.set([55, 122, 188, 175, 39, 28, 0, 3],0);
                return buf;
            },
            key:'emulatorjs-'+core,
            store:Module.DB.system,
            unpack:true,
        });
        if(!corefile){
            corefile = await T.FetchItem({
                url:Module.JSpath+'cores/emulatorjs/'+core+'-wasm.7z',
                'process':e=>{
                    elm.innerHTML = urlfile+e;
                },
                key:'emulatorjs-'+core,
                store:Module.DB.system,
                unpack:true,
            });
            if(!corefile){
                return ;
            }
        }else{
            //get crc
            await T.FetchItem({
                'url': 'https://www.emulatorjs.com/api/v?name=' + Module.core + '&_t=' + T.time,
                'type': 'json',
                'success': async (jsondata, headers) => {
                    if (headers.key) {
                        Module.hashKey = headers.key;
                    }
                    if (headers.key2) {
                        Module.hashKey2 = headers.key2;
                    }
                    Module.headers = headers;
                    Module.jsondata = jsondata;
                }
            });
        }
        Module.action['replaceController'] = Controller=>{
            Controller.keyMap = {};
            let simulate_input = Module.cwrap('simulate_input', 'null', ['number', 'number', 'number']);
            let keyEventList = {}; 
            I.toArr(this.defaultControllers,entry=>{
                if(entry[1].value2 != undefined){
                    keyEventList[Controller.Reflect[this.keyMap[entry[1].value]]] = entry[0];
                    Controller.keyMap[this.keyMap[entry[1].value].toLowerCase()] = entry[0];
                }
            });
            Controller.action['EnterKey'] = (keylist,type)=>{
                keylist.forEach(
                    v=>simulate_input(0,v,type?1:0)
                );
            };
            T.on(document,'keyup',e=>{
                if(keyEventList[e.code] != undefined)simulate_input(0,keyEventList[e.code],0);
            });
            T.on(document,'keydown',e=>{
                if(keyEventList[e.code] != undefined)simulate_input(0,keyEventList[e.code],1);
            });
        }
        T.I.toArr(corefile,entry=>{
            if(/\.js$/.test(entry[0])){
                Module.CacheFile[entry[0]] = new TextDecoder().decode(entry[1]);
            }else if(/\.wasm$/.test(entry[0])){
                Module.wasmBinary = new Uint8Array(entry[1]);
                Module.FileLoder = entry[0].replace('.wasm', '.js');
            }else if(/\.mem$/.test(entry[0])){
                Module.memBinary = new Uint8Array(entry[1]);
                Module.FileLoder = entry[0].replace('.js.mem', '.js');
            }else{
                Module.CacheFile[entry[0]] = new Blob([entry[1]], { 'type': T.F.gettype() });
            }
        });
        let asmjs = Module.CacheFile[Module.FileLoder];
        if (Module.memBinary) {
            asmjs = asmjs.replace(Module.FileLoder + '.mem', T.F.URL(Module.memBinary, T.F.gettype()));
            delete Module.memBinary;
        }
        asmjs = Module.replaceAsmJs(asmjs);
        (new Function('Module',asmjs+"if (typeof EmulatorJS_ != 'undefined')EmulatorJS_(Module);else if (typeof EmulatorJS != 'undefined')EmulatorJS(Module);"))(Module);
        //asmjs = Module.replaceAsmJs(asmjs);
        if(Module.hashKey2&&Module._get_content_crc){
            L.hash = Module.hashKey2;
        }

        Module.arguments.push(L.hash);
        [
            '/userdata',
            '/system',
            '/shaders',
            '/userdata/saves',
            '/userdata/states',
            '/userdata/screenshots',
            '/userdata/cheats',
            '/userdata/rooms',
            '/userdata/rooms/downloads',
            '/userdata/config',
            '/userdata/config/remaps',
            '/userdata/thumbnails',
            '/etc',
            '/rooms',
        ].forEach(dir=>Module.FS.createPath('/',dir,!0,!0));
        Module.DFS.MKFILE('/etc/retroarch.cfg',this.runaction('getCfg'));
        await T.FetchItem({
            url:Module.JSpath+'frontend/shader.zip',
            key:'emulatorjs-shader',
            store:T.LibStore,
            unpack:true,
            success(data){
                T.I.toArr(data,entry=>{
                    Module.DFS.MKFILE('/bundle/shaders/'+entry[0],entry[1]);
                    loghtml+='<p>/bundle/shaders/'+entry[0]+'</p>';
                });
            }
        });
        delete Module.CacheFile[Module.FileLoder];
        Module.addMount('/userdata');
        Module.action['DiskReadyOut'] = txt => loghtml && (loghtml += txt.split('\n').map(t => `<p>${t}</p>`).join(''));
        await Module.getMountStatus();
        Nttr('.system-cores-list').remove();
        T.$('.g-start-ui').remove();
        T.$('.g-game-ui').hidden = false;
        T.$('.g-FS-log').innerHTML = loghtml;
        await this.S.runaction('DefaultBios');
        await this.S.runaction('DefaultRooms');
    }
    //var _0x2ee59a = _0xc73c4['data']['slice'] ? _0xc73c4['data']['slice'](0xc) : _0xc73c4['data']['subarray'](0xc);
    //_0x2ee59a['set']([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x0, 0x3], 0x0), _0x54fa0b(_0x2ee59a);
    action = {
        getCfg(){
            return 'menu_mouse_enable = "true"' +
            '\nmenu_pointer_enable = "true"' +
            '\nsavefile_directory = "userdata/saves"' +
            '\nsavestate_directory = "userdata/states"' +
            '\nscreenshot_directory = "userdata/screenshots"' +
            '\nsystem_directory = "system/"' +
            '\nrgui_browser_directory = "userdata/rooms"' +
            '\ncore_assets_directory = "userdata/rooms/downloads"' +
            '\ncheat_database_path = "userdata/cheats"' +
            '\nrgui_config_directory = "userdata/config"' +
            '\ninput_remapping_directory = "userdata/config/remaps"' +
            '\nthumbnails_directory = "userdata/thumbnails"'+
            '\nautosave_interval = "1"' +
            '\ncamera_allow = "false"' +
            '\ncamera_driver = "null"' +
            '\ncamera_device = "null"' +
            '\nvideo_vsync = true' +
            '\nvideo_shader_enable = true' +
            '\nvideo_font_enable = false' +
            '\nvideo_scale = 1.0' +
            '\nfastforward_ratio = 1.0' +
            '\nvideo_smooth = false' +
            '\nauto_screenshot_filename = "false"' +
            '\nvideo_shader = "/shaders/shader.glslp"' +
            '\nvideo_shader_dir = "/shaders"';
        }
    };
    buttons = {
        "0": "B",
        "1": "Y",
        "2": "SELECT",
        "3": "START",
        "4": "UP",
        "5": "DOWN",
        "6": "LEFT",
        "7": "RIGHT",
        "8": "A",
        "9": "X",
        "10": "L",
        "11": "R",
        "12": "L2",
        "13": "R2",
        "14": "L3",
        "15": "R3",
        "19": "L STICK UP",
        "18": "L STICK DOWN",
        "17": "L STICK LEFT",
        "16": "L STICK RIGHT",
        "23": "R STICK UP",
        "22": "R STICK DOWN",
        "21": "R STICK LEFT",
        "20": "R STICK RIGHT"
    };
    'defaultControllers' = {        
        0x0: {
            'value': '88',
            'value2': '1'
        },
        0x1: {
            'value': '83',
            'value2': '3'
        },
        0x2: {
            'value': '16',
            'value2': '8'
        },
        0x3: {
            'value': '13',
            'value2': '9'
        },
        0x4: {
            'value': '38',
            'value2': '12'
        },
        0x5: {
            'value': '40',
            'value2': '13'
        },
        0x6: {
            'value': '37',
            'value2': '14'
        },
        0x7: {
            'value': '39',
            'value2': '15'
        },
        0x8: {
            'value': '90',
            'value2': '0'
        },
        0x9: {
            'value': '65',
            'value2': '2'
        },
        0xa: {
            'value': '81',
            'value2': '4'
        },
        0xb: {
            'value': '69',
            'value2': '5'
        },
        0xc: {
            'value': '82',
            'value2': '6'
        },
        0xd: {
            'value': '84',
            'value2': '7'
        },
        0xe: {},
        0xf: {},
        0x10: {
            'value': '72'
        },
        0x11: {
            'value': '70'
        },
        0x12: {
            'value': '71'
        },
        0x13: {
            'value': '84'
        },
        0x14: {},
        0x15: {},
        0x16: {},
        0x17: {}

    };
    'keyMap' = {
        0x8: 'backspace',
        0x9: 'tab',
        0xd: 'enter',
        0x10: 'shift',
        0x11: 'ctrl',
        0x12: 'alt',
        0x13: 'pause/break',
        0x14: 'caps lock',
        0x1b: 'escape',
        0x20: 'space',
        0x21: 'page up',
        0x22: 'page down',
        0x23: 'end',
        0x24: 'home',
        0x25: 'left',
        0x26: 'up',
        0x27: 'right',
        0x28: 'down',
        0x2d: 'insert',
        0x2e: 'delete',
        0x30: '0',
        0x31: '1',
        0x32: '2',
        0x33: '3',
        0x34: '4',
        0x35: '5',
        0x36: '6',
        0x37: '7',
        0x38: '8',
        0x39: '9',
        0x41: 'a',
        0x42: 'b',
        0x43: 'c',
        0x44: 'd',
        0x45: 'e',
        0x46: 'f',
        0x47: 'g',
        0x48: 'h',
        0x49: 'i',
        0x4a: 'j',
        0x4b: 'k',
        0x4c: 'l',
        0x4d: 'm',
        0x4e: 'n',
        0x4f: 'o',
        0x50: 'p',
        0x51: 'q',
        0x52: 'r',
        0x53: 's',
        0x54: 't',
        0x55: 'u',
        0x56: 'v',
        0x57: 'w',
        0x58: 'x',
        0x59: 'y',
        0x5a: 'z',
        0x5b: 'left window key',
        0x5c: 'right window key',
        0x5d: 'select key',
        0x60: 'numpad 0',
        0x61: 'numpad 1',
        0x62: 'numpad 2',
        0x63: 'numpad 3',
        0x64: 'numpad 4',
        0x65: 'numpad 5',
        0x66: 'numpad 6',
        0x67: 'numpad 7',
        0x68: 'numpad 8',
        0x69: 'numpad 9',
        0x6a: 'multiply',
        0x6b: 'add',
        0x6d: 'subtract',
        0x6e: 'decimal point',
        0x6f: 'divide',
        0x70: 'f1',
        0x71: 'f2',
        0x72: 'f3',
        0x73: 'f4',
        0x74: 'f5',
        0x75: 'f6',
        0x76: 'f7',
        0x77: 'f8',
        0x78: 'f9',
        0x79: 'f10',
        0x7a: 'f11',
        0x7b: 'f12',
        0x90: 'num lock',
        0x91: 'scroll lock',
        0xba: 'semi-colon',
        0xbb: 'equal sign',
        0xbc: 'comma',
        0xbd: 'dash',
        0xbe: 'period',
        0xbf: 'forward slash',
        0xc0: 'grave accent',
        0xdb: 'open bracket',
        0xdc: 'back slash',
        0xdd: 'close braket',
        0xde: 'single quote'
    };
}