class NengeController{
    constructor(T){
        let C=this,I = T.I,Module=T.Module;
        I.defines(this,{T,I,Module},1);
        //Module.action['checkLog'] = txt=>this.checkLog(txt);
        Nttr('.g-mobile-click').click(
            ()=>{
                Nttr('.g-mobile-click').hidden = true;
            }
        )
        Object.assign(Module.action,{
            AudioReset(func){
                Nttr('.g-mobile-click').hidden = false;
                Nttr('.g-mobile-click').once('pointerup',func);
                return true;
            },
            checkLog(txt){
                return C.checkLog(txt);
            },
            RetroarchMenu(){
                if(this.running){
                    C.runaction('EnterKey',[['f1'],1]);
                    setTimeout(()=>C.runaction('EnterKey',[['f1'],0]),300);
                }
            }
        })
        Module.canvas&&(Module.canvas.hidden = false);
        this.runaction = T.runaction;
        this.runaction('BulidQuality');
        this.runaction('BulidButton');
        T.on(window, 'resize', () => this.runaction('ReSizeCanvas'));
    }
    checkLog(text){
        console.log(text);
        if (/Video\s@\s\d+x\d+\.?\s*$/.test(text) || /Set\s?video\s?size\s?to:\s?\d+x\d+\s?\.?\s?/.test(text)) {
            let wh = text.match(/\d+/g);
            this.runaction('ReSizeCanvas',[wh]);
        }
    }
    button = {
        'a':{
            key:'input_player1_a',
            name:'A',
            pos:'xyab',
        },
        'b':{
            key:'input_player1_b',
            name:'B',
            pos:'xyab',
        },
        'x':{
            key:'input_player1_x',
            name:'X',
            pos:'xyab',
        },
        'y':{
            key:'input_player1_y',
            name:'Y',
            pos:'xyab',
        },
        'up':{
            key:'input_player1_up',
            name:'↑',
            pos:'dp',
            class:'up'
        },
        'down':{
            key:'input_player1_down',
            name:'↓',
            pos:'dp',
            class:'down'
        },
        'left':{
            key:'input_player1_left',
            name:'←',
            pos:'dp',
            class:'left'
        },
        'right':{
            key:'input_player1_right',
            name:'→',
            pos:'dp',
            class:'right'
        },
        'select':{
            key:'input_player1_select',
            name:'SELETC',
            pos:'left',
            class:'select'
        },
        'start':{
            key:'input_player1_start',
            name:'START',
            pos:'right',
            class:'start'
        },
        'l':{
            key:'input_player1_l',
            name:'L',
            pos:'left',
            class:'l'
        },
        'r':{
            key:'input_player1_l',
            name:'R',
            pos:'right',
            class:'r'
        }
    }
    action = {
        BulidButton(){
            let C=this,T=C.T,I=C.I,Module = T.Module,BtnContent = Nttr('.game-controller'),leftContent = BtnContent.$('.g-left'),RightContent = BtnContent.$('.g-right'),lefthtml="",righthtml="";
            I.toArr(C.button,entry=>{
                let [btn,info] = entry;
                if(info.pos=='left'){
                    lefthtml += C.runaction('getButton',['left',btn]);
                }
                if(info.pos=='right'){
                    righthtml +=  C.runaction('getButton',['right',btn]);
                }
            });
            lefthtml +='<button class="g-menu">Menu</button>';
            lefthtml +='<div class="g-dp">'+C.runaction('getArrow')+'</div>';
            righthtml +='<div class="g-dp">'+C.runaction('getXYAB')+'</div>';
            leftContent.innerHTML=lefthtml;
            RightContent.innerHTML = righthtml;
            let touchlist = [];
            T.stopGesture(T.$('.game-controller'));
            T.stopGesture(Module.canvas);
            BtnContent.on('contextmenu', e => T.stopProp(e));
            ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(
                evt => {
                    BtnContent.on(evt, e => {
                        let newlist = [];
                        if (e.type == 'touchstart') {
                            newlist = touchlist.concat(C.runaction('getButtonKey',[e.target]));
                        } else if (e.touches) {
                            if (e.touches.length) {
                                newlist = Array.from(e.touches).map(entry => C.runaction('getButtonKey',[document.elementFromPoint(entry.pageX, entry.pageY)]));
                            }
                        }
                        if (newlist.length > 0) {
                            newlist = newlist.join(',').split(',');
                        }
                        if (newlist.join() != touchlist) {
                            C.runaction('sendInputKey',[touchlist,newlist]);
                            //Module.inputUp(touchlist);
                            //Module.inputDown(newlist);
                            touchlist = newlist;
                            //console.log(touchlist);
                        }
                    }, {
                        passive: false
                    });
                }
            );
            let menulist = Nttr('.game-controller .g-menulist'),menubtn = Nttr('.game-controller .g-menu');
            menubtn.click(e=>{
                let elm = e.target,active = menulist.hidden;
                menubtn.active = active;
                menulist.hidden = !active;
                return T.stopProp(e);
            },'pointerup',{passive:false});
            menulist.click(e=>{
                C.runaction('CallMenu',[e.target,menulist]);
                return T.stopProp(e);
            });
            C.runaction('BulidMenu',[BtnContent,leftContent]);
            //Nttr('.game-controller')
            //400x400
        },
        CallMenu(elm){

        },
        BulidMenu(BtnContent,leftContent){

        },
        sendInputKey(touchlist,newlist){
            let C=this,T=C.T,I=C.I,Module = T.Module;
            touchlist = touchlist.filter(v=>v&&!newlist.includes(v));
            newlist = newlist.filter(v=>v);
            if(!C.keyMap){
                let retroarchcfg = new TextDecoder().decode(Module.FS.readFile(Module.configPath));
                C.keyMap = {};
                retroarchcfg.split('\n').forEach(v=>{
                    let arr = v.match(/^(\w+)\s=\s("|')?(.+?)("|')?$/);
                    if(arr&&arr[1]&&arr[3]){
                    C.keyMap[arr[1]] = arr[3]=="false"?false:arr[3]=='true'?true:isNaN(arr[3])?arr[3]:parseInt(arr[3]);

                    }
                });
                //console.log(C.keyMap);
            }
            touchlist = touchlist.map(v=>C.keyMap[C.button[v].key]);
            newlist = newlist.map(v=>C.keyMap[C.button[v].key]);
            C.runaction('EnterKey',[touchlist,false]);
            C.runaction('EnterKey',[newlist,true]);
            //console.log(touchlist,1,newlist);
            
        },
        EnterKey(keylist,type){
            let C=this,T=C.T,I=C.I,Module = T.Module;
            keylist.forEach(
                v=>C.runaction('keyEvent',[type||false,{code:C.Reflect[v],key:v}])
            )
        },
        keyEvent(type,edata){
            document.dispatchEvent(new KeyboardEvent(type ? 'keydown' : 'keyup', edata));
        },
        getButtonKey(elm){
            let C=this,T=C.T,I=C.I;
            if (I.elment(elm)) {
                let key = elm.getAttribute('data-key');
                if (key) {
                    return key;
                }
            }
            return '';
        },
        getArrow(){
            let C =this,html="";
            ['up,left','up','up,right','left','','right','down,left','down','down,right'].forEach(
                (v,index)=>{
                    html += C.runaction('getButton',['left',v]);
                }
            );
            return html;
        },
        getXYAB(){
            let C =this,html="";
            ['x','y','a','b'].forEach(
                (v,index)=>{
                    html += C.runaction('getButton',['right',v]);
                }
            );
            return html;
        },
        getButton(pos,btn){
            let C = this,info = C.button[btn],btn2=btn;
            if(!info){
                if(pos=='right') return;
                btn2='';
                info ={};
            }
            return  `<button type="button" data-key="${btn}" class="key-${pos}-${btn2||'null'} ${(info.class?'key-'+info.class:'')}" style="${(info.style?info.style:'')}">${(info.name||"")}</button>`;
        },
        ReSizeCtrl(opt,height){
            let width = height/this.AspectRatio;
            console.log(width,height);
        },
        ReSizeCanvas(wh){
            let C = this,T=C.T,I=C.I,Module = C.Module;  
            if (wh) {
                [C.width, C.height] = wh.map(v=>parseInt(v));
                C.AspectRatio = C.width / C.height;
            }
            let opt = Nttr('.g-game-ui').getBoundingClientRect(),QualityHeight = C.Quality||720,AspectRatio = opt.width / opt.height;
            if(I.mobile){
                if(C.AspectRatio){
                    if (typeof window.orientation != "undefined" && window.orientation != 0) {
                        Nttr('.game-controller').css = "";
                    }else{
                        AspectRatio = C.AspectRatio;
                        let mt=0,h=opt.height - opt.width/AspectRatio-20,height = Math.min(h,400);
                        if(h-50>height){
                            mt = h-50-height;
                        }
                        Nttr('.game-controller').css = 'height:'+height+'px;margin-top:'+mt+'px';
                    }
                    Module.setCanvasSize(QualityHeight*AspectRatio,QualityHeight);
                    C.runaction('ReSizeCtrl',[opt,Module.canvas.getBoundingClientRect().height]);
                }
            }else{
                let p = opt.height > QualityHeight ? opt.height:QualityHeight;
                Module.setCanvasSize(p*AspectRatio,p);
            }
        },
        BulidQuality(){
            let C=this,T=C.T,btn =[T.$ce('h3'), T.$ce('ul')],MenuList = T.$('.g-menu-list .g-list'),html="";
            btn[0].innerHTML = T.getLang('Canvas Quality');
            [1080, 720, 480, 240].forEach(v => {
                html += `<li data-value="${v}">${v}p</li>`;
            });
            btn[1].innerHTML = html;
            Nttr(btn[1]).click(e => {
                let elm = e.target;
                if (elm instanceof Element) {
                    let value = elm.getAttribute('data-value');
                    if (value) {
                        Nttr('.MenuBtn').active = false;
                        C.Quality = value;
                        this.runaction('ReSizeCanvas');
                    }
                }
            });
            btn.forEach(v => MenuList.appendChild(v));
        }
    };
    Reflect = {
        "tilde": "Backquote",
        "num1": "Digit1",
        "num2": "Digit2",
        "num3": "Digit3",
        "num4": "Digit4",
        "num5": "Digit5",
        "num6": "Digit6",
        "num7": "Digit7",
        "num8": "Digit8",
        "num9": "Digit9",
        "num0": "Digit0",
        "minus": "Minus",
        "equal": "Equal",
        "backspace": "Backspace",
        "tab": "Tab",
        "q": "KeyQ",
        "w": "KeyW",
        "e": "KeyE",
        "r": "KeyR",
        "t": "KeyT",
        "y": "KeyY",
        "u": "KeyU",
        "i": "KeyI",
        "o": "KeyO",
        "p": "KeyP",
        "a": "KeyA",
        "s": "KeyS",
        "d": "KeyD",
        "f": "KeyF",
        "g": "KeyG",
        "h": "KeyH",
        "j": "KeyJ",
        "k": "KeyK",
        "l": "KeyL",
        "z": "KeyZ",
        "x": "KeyX",
        "c": "KeyC",
        "v": "KeyV",
        "b": "KeyB",
        "n": "KeyN",
        "m": "KeyM",
        "leftbracket": "BracketLeft",
        "rightbracket": "BracketRight",
        "backslash": "Backslash",
        "capslock": "CapsLock",
        "semicolon": "Semicolon",
        "quote": "Quote",
        "enter": "Enter",
        "shift": "ShiftLeft",
        "comma": "Comma",
        "period": "Period",
        "slash": "Slash",
        "rshift": "ShiftRight",
        "ctrl": "ControlLeft",
        "lmeta": "MetaLeft",
        "alt": "AltLeft",
        "space": "Space",
        "ralt": "AltRight",
        "menu": "ContextMenu",
        "rctrl": "ControlRight",
        "up": "ArrowUp",
        "left": "ArrowLeft",
        "down": "ArrowDown",
        "right": "ArrowRight",
        "kp_period": "NumpadDecimal",
        "kp_enter": "NumpadEnter",
        "keypad0": "Numpad0",
        "keypad1": "Numpad1",
        "keypad2": "Numpad2",
        "keypad3": "Numpad3",
        "keypad4": "Numpad4",
        "keypad5": "Numpad5",
        "keypad6": "Numpad6",
        "keypad7": "Numpad7",
        "keypad8": "Numpad8",
        "keypad9": "Numpad9",
        "add": "NumpadAdd",
        "numlock": "NumLock",
        "divide": "NumpadDivide",
        "multiply": "NumpadMultiply",
        "subtract": "NumpadSubtract",
        "home": "Home",
        "end": "End",
        "pageup": "PageUp",
        "pagedown": "PageDown",
        "del": "Delete",
        "insert": "Insert",
        "f12": "F12",
        "f10": "F10",
        "f9": "F9",
        "f8": "F8",
        "f7": "F7",
        "f6": "F6",
        "f5": "F5",
        "f4": "F4",
        "f3": "F3",
        "f2": "F2",
        "f1": "F1",
        "escape": "Escape",
        "`": {
            code: "Backquote"
        },
        "-": {
            code: "Minus"
        },
        "=": {
            code: "Equal"
        },
        "[": {
            code: "BracketLeft"
        },
        "]": {
            code: "BracketRight"
        },
        "\\": {
            code: "Backslash"
        },
        ";": {
            code: "Semicolon"
        },
        "'": {
            code: "Quote"
        },
        ",": {
            code: "Comma"
        },
        ".": {
            code: "Period"
        },
        "/": {
            code: "Slash"
        },
        "\t": {
            code: "Tab"
        },
        "\n": {
            code: "Enter"
        },
        " ": {
            code: "Space"
        },
        "Q": {
            code: "KeyQ",
            shift: true
        },
        "W": {
            code: "KeyW",
            shift: true
        },
        "E": {
            code: "KeyE",
            shift: true
        },
        "R": {
            code: "KeyR",
            shift: true
        },
        "T": {
            code: "KeyT",
            shift: true
        },
        "Y": {
            code: "KeyY",
            shift: true
        },
        "U": {
            code: "KeyU",
            shift: true
        },
        "I": {
            code: "KeyI",
            shift: true
        },
        "O": {
            code: "KeyO",
            shift: true
        },
        "P": {
            code: "KeyP",
            shift: true
        },
        "A": {
            code: "KeyA",
            shift: true
        },
        "S": {
            code: "KeyS",
            shift: true
        },
        "D": {
            code: "KeyD",
            shift: true
        },
        "F": {
            code: "KeyF",
            shift: true
        },
        "G": {
            code: "KeyG",
            shift: true
        },
        "H": {
            code: "KeyH",
            shift: true
        },
        "J": {
            code: "KeyJ",
            shift: true
        },
        "K": {
            code: "KeyK",
            shift: true
        },
        "L": {
            code: "KeyL",
            shift: true
        },
        "Z": {
            code: "KeyZ",
            shift: true
        },
        "X": {
            code: "KeyX",
            shift: true
        },
        "C": {
            code: "KeyC",
            shift: true
        },
        "V": {
            code: "KeyV",
            shift: true
        },
        "B": {
            code: "KeyB",
            shift: true
        },
        "N": {
            code: "KeyN",
            shift: true
        },
        "M": {
            code: "KeyM",
            shift: true
        },
        ")": {
            code: "Digit0",
            shift: true
        },
        "!": {
            code: "Digit1",
            shift: true
        },
        "@": {
            code: "Digit2",
            shift: true
        },
        "#": {
            code: "Digit3",
            shift: true
        },
        "$": {
            code: "Digit4",
            shift: true
        },
        "%": {
            code: "Digit5",
            shift: true
        },
        "^": {
            code: "Digit6",
            shift: true
        },
        "&": {
            code: "Digit7",
            shift: true
        },
        "*": {
            code: "Digit8",
            shift: true
        },
        "(": {
            code: "Digit9",
            shift: true
        },
        "~": {
            code: "Backquote",
            shift: true
        },
        "_": {
            code: "Minus",
            shift: true
        },
        "+": {
            code: "Equal",
            shift: true
        },
        "{": {
            code: "BracketLeft",
            shift: true
        },
        "}": {
            code: "BracketRight",
            shift: true
        },
        "|": {
            code: "Backslash",
            shift: true
        },
        ":": {
            code: "Semicolon",
            shift: true
        },
        "\"": {
            code: "Quote",
            shift: true
        },
        "<": {
            code: "Comma",
            shift: true
        },
        ">": {
            code: "Period",
            shift: true
        },
        "?": {
            code: "Slash",
            shift: true
        },
    };
}