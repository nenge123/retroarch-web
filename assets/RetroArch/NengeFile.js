class NengeFile{
    constructor(T,elm){
        let I = T.I,Module = T.Module;
        I.defines(this,{T,I,Module},1);
        this.btn = Nttr(elm).click(async e=>{
            Nttr('.MenuBtn').active = false;
            Nttr('.FileUI').hidden = false;
            Nttr('.g-file-editor').hidden = true;
            Nttr('.g-file-upload').hidden = true;
            await this.install();
        });
        Nttr('.g-btn-addContent').click(e=>{
            if(!Nttr('.g-file-upload').hidden){
                Nttr('.g-file-upload').hidden = true;
                Nttr('.FileUI').hidden = true;
                Nttr('.MenuBtn').active = false;
                return;
            }
            this.btn.click();
            this.runaction('ResultWrite',['data-info']);
        })
        this.runaction = T.runaction;
        this.content = Nttr('.FileUI').click(e=>{
            let elm = e.target;
            if(elm instanceof Element){
                let action = T.attr(elm,'f-action');
                action&&this.runaction(action,[elm]);
            }
        });
        this.btn.html(T.getLang(this.btn.html()));
    }
    async install(){
        if(this.installed) return;
        let F=this,T=F.T,db = await T.F.dbLoad();
        if(db){
            F.tablelist = Array.from(db.objectStoreNames);
            if(F.tablelist.length){
                let html = ""; 
                Array.from(db.objectStoreNames).forEach(val=>{
                    html += '<div class="g-box">'
                    +`<h3 class="g-file-header" d-db="${val}">`
                    +`<button class="g-btn g-blue2" f-action="ResultHide">${T.getLang('DatabaseTable')}:${val}</button>`
                    +'&nbsp;|&nbsp;'
                    +`<button class="g-btn g-blue" f-action="ResultWrite">${T.getLang('WriteTable')}</button>`
                    +'&nbsp;|&nbsp;'
                    +`<button class="g-btn" f-action="ResultRead">${T.getLang('ReadTable')}</button>`
                    +`<button class="g-btn g-red g-right" f-action="ResultClear">${T.getLang('ClearTable')}</button>`
                    +`</h3>`
                    +`<div class="g-tips">${T.getLang(val+' tips text')}</div>`
                    +`<ul class="FileResult" d-db="${val}" hidden></ul>`
                    +'</div>';
                });
                Nttr('.g-file-manager').html(html)
            }
        }
    }
    action = {
        ResultHide(elm){
            let T=this.T,pelm = elm.parentNode,dbname = T.attr(pelm,'d-db'),relm = Nttr('.FileResult[d-db="'+dbname+'"]');
            relm.hidden = !relm.hidden;

        },
        async ResultClear(elm){
            let T=this.T,pelm = elm.parentNode,dbname = T.attr(pelm,'d-db');
            Nttr('.FileResult[d-db="'+dbname+'"]').hidden = true;
            let ok = confirm(T.getLang('AreYouClear?'));
            if(ok){
                await Store.clear();
                if (dbname == 'data-info'){
                    await T.getStore('data-rooms').clear();
                    Nttr('.FileResult[d-db="data-rooms"]').html('');
                }
                Nttr('.FileResult[d-db="'+dbname+'"]').html('');

            }


        },
        ResultRead(elm){
            let T=this.T,dbname = elm instanceof Element?T.attr(elm.parentNode,'d-db'):elm,relm = Nttr('.FileResult[d-db="'+dbname+'"]');
            relm.hidden = false;
            if (dbname == 'data-info') {
                return this.runaction('ResultShowInfo',[relm,dbname]);
            }else if(['userdata','retroarch'].includes(dbname)){
                return this.runaction('ResultShowFSdata',[relm,dbname])
            }
            return this.runaction('ResultShowData',[relm,dbname]);
        },
        ResultWrite(elm){
            let T=this.T,dbname = elm instanceof Element? T.attr(elm.parentNode,'d-db'):elm,relm = Nttr('.FileResult[d-db="'+dbname+'"]');
            relm&&(relm.hidden = true);
            Nttr('.FileUI').hidden = false;
            Nttr('.g-file-upload').hidden = false;
            if(dbname=='data-rooms')dbname = 'data-info';
            Nttr('.g-file-upload').html(this.uploadHtml(dbname));

        },
        async ResultShowInfo(relm,dbname){
            let T=this.T,I=T.I,Store = T.getStore(dbname);
            let html="";
            I.toArr(await Store.all(),entry => {
                let [filename,info] = entry;
                html += '<li>'
                    +`<h3>${filename}</h3>`
                    +`<button class="g-btn g-blue" f-action="ResultDownloadItem" d-name="${filename}">${T.getLang('DownloadItem')}</button>`
                    +(Module.onRunning ? `&nbsp;|&nbsp;<button class="g-btn g-blue" d-name="${filename}">${T.getLang('WriteGame')}</button>`:'')
                    +`<button class="g-btn g-red g-right" f-action="ResultDeleteItem" d-name="${filename}">${T.getLang('deleteItem')}</button>`
                    +'<ol class="p-1">'
                    +(!info.file?'':Array.from(info.file).map(x=>`<li>${x}</li>`).join(''))
                    +'</ol>'
                    +'</li>';
            });
            relm.html(html);
        },
        async ResultDeleteItem(elm){
            let T = this.T, pelm = elm.parentNode.parentNode, dbname = T.attr(pelm, 'd-db'), Itemname = T.attr(elm, 'd-name'), Store = T.getStore(dbname),name=T.F.getname(Itemname),opt={'clear':true};
            let ok = confirm(T.getLang('AreYouRemove?'));
            if(ok){
                await Store.remove(Itemname,opt);
                if (dbname == 'data-info'){
                    await T.getStore('data-rooms').remove(Itemname,opt);
                    Nttr('.FileResult[d-db="data-rooms"]').html('');
                }
                Nttr('.FileResult[d-db="'+dbname+'"]').html('');
            }

        },
        async ResultDownloadItem(elm) {
            let T = this.T, pelm = elm.parentNode.parentNode, dbname = T.attr(pelm, 'd-db'), Itemname = T.attr(elm, 'd-name'), Store = T.getStore(dbname),name=T.F.getname(Itemname);
            if (dbname == 'data-info') Store = T.getStore('data-rooms');
            if (['data-rooms', 'data-libjs', 'userdata', 'retroarch']) T.down(name, await Store.data(Itemname));
            else {
                let result = await Store.get(Itemname);
                T.down(name, result && result.contents || result);
            }
        },
        async ResultShowData(relm,dbname){
            let T=this.T,I=T.I,Store = T.getStore(dbname);
            let html="";
            Array.from(await Store.keys()).forEach(
                filename => {
                html += '<li>'
                    +`<h3>${filename}</h3>`
                    +`<button class="g-btn g-blue" f-action="ResultDownloadItem" d-name="${filename}">${T.getLang('Download?')}</button>`
                    +`&nbsp;|&nbsp;<button class="g-btn g-blue" f-action="ResultView" d-name="${filename}">${T.getLang('View?')}</button>`
                    +`<button class="g-btn g-red g-right" f-action="ResultDeleteItem" d-name="${filename}">${T.getLang('deleteItem')}</button>`
                    +'</li>';
            });
            relm.html(html);
        },
        async ResultView(elm){
            if(elm.isview)return;
            let T = this.T, pelm = elm.parentNode.parentNode, dbname = T.attr(pelm, 'd-db'), Itemname = T.attr(elm, 'd-name'), Store = T.getStore(dbname),name=T.F.getname(Itemname);
            let result = await Store.get(Itemname);
            this.runaction('ViewData',[elm.parentNode,result,1,name]);
            elm.isview = true;
        },
        ViewData(elm,result,index,filename){
            if(elm.isview)return;
            let T = this.T;
            index++;
            if(T.I.obj(result)){
                let html="",ul = T.$ce('ul');
                T.I.toArr(result,entry=>{
                    let [name,data] = entry;
                    html +=`<li style="padding:3px 3px 3px 0px">${name}&nbsp;`
                        +(
                            data instanceof Blob||data instanceof Uint8Array||data instanceof ArrayBuffer ||(typeof data=='string'&&data.length>100)?`<button class="g-btn g-blue" d-name-${index}="${name}">${T.getLang('Download?')}</button>`:T.I.objArr(data)?`<button class="g-btn g-blue" d-name-${index}="${name}" d-key-${index}="obj">${T.getLang('View?')}</button>`:
                            `:&nbsp;${data}`
                        )
                        +`</li>`;
                });
                ul.classList.add('p-1');
                ul.innerHTML = html;
                Nttr(ul).click(e=>{
                    let lelm = e.target;
                    if(lelm instanceof Element){
                        let name = T.attr(lelm,'d-name-'+index);
                        let key = T.attr(lelm,'d-key-'+index);
                        if(name){
                            if(key)return this.runaction('ViewData',[lelm.parentNode,result[name],index]);
                            T.down(filename||name,result[name]);
                        }
                    }
                });
                elm.appendChild(ul);
            }else{
                alert(T.getLang('UnkowObject?'));
            }
            elm.isview = true;
        },
        async ResultShowFSdata(relm,dbname){
            let T=this.T,I=T.I,Store = T.getStore(dbname),rangeKey = '/userdata/';
            if(dbname=='retroarch') rangeKey = '/home/web_user/retroarch/userdata/';
            this.runaction('ShowFsPath',[relm,Store,rangeKey]);
        },
        async ShowFsPath(ul,Store,rangeKey){
            let T=this.T,I=T.I;
            let html="";
            I.toArr(await Store.all(),entry => {
                let [filename,info] = entry;
                if(!info||!info.contents) return;
                html += '<li>'
                    +`<h3>${filename}</h3>`
                    +`<button class="g-btn g-blue" f-action="ResultDownloadItem" d-name="${filename}">${T.getLang('DownloadItem')}</button>`
                    +`&nbsp;|&nbsp;<button class="g-btn g-blue" f-action="ResultEditItem" d-name="${filename}">${T.getLang('EditItem?')}</button>`
                    +`<button class="g-btn g-red g-right" f-action="ResultDeleteItem" d-name="${filename}">${T.getLang('deleteItem')}</button>`
                    +'</li>';
            });
            ul.html(html);
        },
        async ResultEditItem(elm){
            let T = this.T, pelm = elm.parentNode.parentNode, dbname = T.attr(pelm, 'd-db'), Itemname = T.attr(elm, 'd-name'), Store = T.getStore(dbname),name=T.F.getname(Itemname);
            let data = await Store.data(Itemname);
            if(data){
                let text = new TextDecoder().decode(data),editor = Nttr('.g-file-editor');
                editor.hidden = false;
                editor.datatext = text;
                editor.dbname = dbname;
                editor.Itemname = Itemname;
                editor.$('input').value = Itemname;
                editor.$('textarea').value = text;
            }
        },
        async SavePath(){
            let editor = Nttr('.g-file-editor'),newpath = editor.$('input').value,newtext = editor.$('textarea').value;
            if(newtext!=editor.datatext){
                alert(55);
            }else if(newpath!=editor.Itemname){
                alert(77);
            }
            return this.runaction('CloseEdit',[null,editor]);
        },
        async CloseEdit(elm,_editor){
            let editor = _editor||Nttr('.g-file-editor');
            editor.hidden = true;
            delete editor.datatext;
            delete editor.Itemname;
            delete editor.dbname;
            editor.$('input').value = '';
            editor.$('textarea').value = '';
        },
        async WriteRooms(elm){
            let T=this.T,I=T.I,sys = elm instanceof Element?T.attr(elm,'f-sys'):elm;
            this.upload(async files=>{
                let udiv = Nttr('.g-file-upload');
                udiv.html('');
                await Promise.all(Array.from(files).map(async file=>this.createData(file,udiv,sys)));
                Nttr('.FileUI').hidden = true;
            });
        },
        async WriteRunFile(elm){
            let T=this.T,I=T.I,dbname = elm instanceof Element?T.attr(elm,'f-dbname'):elm,keyname=T.$('.upload-runfile').val;
            this.upload(async files=>{
                let udiv = Nttr('.g-file-upload');
                udiv.html('');
                await Promise.all(Array.from(files).map(async file=>this.createBiosData(file,udiv,dbname,keyname)));
                Nttr('.FileUI').hidden = true;
            },1);

        }
    };
    async createData(file,udiv,sys,filename){{
        let T=this.T,I=T.I,contents = {'file':[],'timestamp': T.date,'version': T.version,'system': sys,type:'Uint8Array'};
        filename = filename||file.name;
        udiv&&udiv.addChild(this.createItem('div',T.getLang('ReadFile')+':'+filename));
        let u8 = new Uint8Array(file instanceof Blob ? (await file.arrayBuffer()):file),filetype=T.F.checkBuffer(u8);
        console.log(filetype);
        contents.filetype = filetype;
        contents.filesize = file.size;
        if(['zip', 'rar', '7z'].includes(filetype)){
            contents.filetype = filetype;
            contents.fullsize = 0;
            contents.unpack = true;
            let pdiv = this.createItem('div',filename+':'+T.getLang('UnPack'));
            udiv&&udiv.addChild(pdiv);
            let unlist = await T.unFile(u8,state=>pdiv.innerHTML=filename+':'+state,{'packtext':T.getLang('UnPack')});
            if(unlist instanceof Uint8Array){
                udiv&&udiv.addChild(this.createItem('div',T.getLang('UnUnPackErrorPackFile')+':'+filename));
                delete contents.unpack;
                contents.file.push(filename);
            }else{
                if(unlist.password){
                    contents.password = unlist.password;
                    delete unlist.password;
                }
                I.toArr(unlist,entry=>{
                    let [ufile,udata] = entry;
                    contents.file.push(ufile);
                    contents.fullsize += udata.byteLength;
                    udiv&&udiv.addChild(this.createItem('div',T.getLang('UnPackFile')+':'+ufile));
                    if(this.Module.FS)this.addRunItem(ufile,udata);
                });
            }
        }else{
            contents.file.push(filename);
            if(this.Module.FS)this.addRunItem(filename,u8);
        }
        let key = sys+'-'+filename;
        contents.contents = u8;
        await T.getStore('data-rooms').put(key,contents);
        udiv&&udiv.addChild(this.createItem('div',T.getLang('FileWriteToRooms')+':'+filename));
        delete contents.contents;
        await T.getStore('data-info').put(key,contents);
        udiv&&udiv.addChild(this.createItem('div',T.getLang('FileWriteToInfo')+':'+filename));
       }
    }
    async createBiosData(file,udiv,dbname,keyname){
        let T=this.T,I=T.I,
            contents = {'file':[],'timestamp': T.date,'version': T.version,'system': sys,type:'datalist'},
            u8 = new Uint8Array(file instanceof Blob ? (await file.arrayBuffer()):file),
            filetype=T.F.checkBuffer(u8);
            if(['zip', 'rar', '7z'].includes(filetype)){
                contents.unpack = true;
                let pdiv = this.createItem('div',filename+':'+T.getLang('UnPack'));
                udiv&&udiv.addChild(pdiv);
                let unlist = await T.unFile(u8,state=>pdiv.innerHTML=filename+':'+state,{'packtext':T.getLang('UnPack')});
                if(unlist instanceof Uint8Array){
                    udiv&&udiv.addChild(this.createItem('div',T.getLang('UnUnPackErrorPackFile')+':'+filename));
                    delete contents.unpack;
                    contents.file.push(filename);
                }else{
                    if(unlist.password){
                        contents.password = unlist.password;
                        delete unlist.password;
                    }
                    I.toArr(unlist,entry=>{
                        let [ufile,udata] = entry;
                        contents.file.push(ufile);
                        contents.fullsize += udata.byteLength;
                        udiv&&udiv.addChild(this.createItem('div',T.getLang('UnPackFile')+':'+ufile));
                        if(this.Module.FS)this.addBiosItem(ufile,udata);
                    });
                }
            }

    }
    createItem(type,html){
        let elm =  this.T.$ce(type||'li');
        if(html)elm.innerHTML = html;
        return elm;
    }
    addRunItem(ufile,udata){
        let T=this.T,result = T.$('.g-game-welcome-result'),path = T.Module.fsDisk.WriteRooms(ufile,udata);
        if(result){
            let li = T.$ce('div');
            li.innerHTML = `<h3>${path}</h3><button class="g-btn" data-name="${path}" data-type="down">${T.getLang('Download?')}</button><button class="g-btn" data-name="${path}" data-type="run">${T.getLang('Run?')}</button>`;
            result.appendChild(li);

        }
    }
    CoreName = {
        'gb':'GB/GBC',
        'gba':'GBA',
        'n64':'N64',
        'nes':'NES',
        'snes':'SNES',
        'nds': 'NDS',
        'psx':'PS1',
        'arcade':'Arcade',
        'sega': 'Sega',
        'segacd': 'SegaCD',
        //'mesen': ['fds', 'nes', 'unif', 'unf'],
        'vb': 'Virtual Boy',
        '3do': '3DO',
        'lynx': 'lynx',
        'jaguar':'jaguar',
        'a7800': 'a7800',
        'a2600': 'a2600',
        'ngp': 'NGP',
        'pce': 'PCE',
        //'pcfx': ['ccd', 'toc', 'chd', 'cue'],
        //'32x': ['32x', 'bin', 'gen', 'smd', 'md', 'cue', 'iso', 'sms'],
        //'saturn': ['bin', 'cue', 'iso'],
        //'msx': ['rom', 'mx1', 'mx2', 'dsk', 'cas'],
        //'bluemsx': ['rom', 'ri', 'mx1', 'mx2', 'col', 'dsk', 'cas', 'sg', 'sc', 'm3u'],
        //'ws': ['ws', 'wsc'],
        //'fba0.2.97.29': ['zip'],
        //'mame2003': ['zip'],
        //'mame': ['zip']

    };
    uploadHtml(dbname){
        let T=this.T,I=T.I,html = ``;
        if(dbname=='data-info'){
            html += `<h3>${T.getLang('CoreSystemName')}</h3><ul>`;
            I.toArr(this.CoreName,entry=>{
                html+=`<li><button class="g-btn g-blue" f-action="WriteRooms" f-sys="${entry[0]}">${entry[1]}</button></li>`;
            });
            html+='</ul>';
        }else if(dbname == "data-system" || dbname == "data-bios"){
            html += `<h3>${T.getLang('What\'s your do?')}</h3><lable><span>${T.getLang('UploadName')}</span><input type="text" class="upload-runfile"></lable><p><button class="g-btn g-blue" f-action="WriteRunFile" f-db="${dbname}">${T.getLang('WriteTable')}</button></p>`;
        }
        return html;
        /**
         *  = {
        'data-info':``,
        'user':``,
        'data-info':``,
        'data-info':``,
    }
         */
    }
    upload(func,bool){
        let input = this.T.$ce('input');
        input.type = 'file';
        if(!bool)input.multiple = true;
        input.onchange = e => {
            let files = e.target.files;
            if (files && files.length > 0) {
                return func(files);
            }
            input.remove();
        };
        input.click();
    }
    async WriteRoomsFile(fileBlob,system,bool){
        let T=this.T,contents = new Uint8Array(await fileBlob.arrayBuffer()),file=[fileBlob.name],filename=fileBlob.name,type='Uint8Array',filetype=fileBlob.type,filesize=contents.byteLength;
        if(bool){
            T.Module.fsDisk.MKFILE('/rooms/'+filename,contents,1);
        }
        let data = {
            contents,
            file,
            filesize,
            filetype,
            type,
            system,
            timestamp:T.date,
            version:T.version
        };
        await T.setItem('data-rooms',filename,data);
        delete data.contents;
        await T.setItem('data-info',filename,data);
    }
    async BIOS_download(url,system,elm,func){
        let T = this.T;
        return func(await T.FetchItem({url,key:system+'-'+T.F.getname(url),unpack:true,process:e=>elm&&(elm.innerHTML=e),dataOption:{system},store:'data-bios'}));
    }
    async BIOS_unpack(system,func){
        let T = this.T;
        this.upload(files=>{
            Array.from(files).forEach(async file=>{
                let elm = func(file.name);
                let contents = await T.unFile(file,status=>elm&&(elm.innerHTML=status));
                await T.setItem('data-bios',system+'-'+file.name,{
                    contents,
                    system,
                    type:contents instanceof Uint8Array ? 'Uint8Array':'datalist',
                    timestamp:T.date
                });
                func(file.name,contents);
            });
        },1);
    }
    async BIOS_upload(system,func){
        let T = this.T;
        this.upload(files=>{
            Array.from(files).forEach(async file=>{
                let elm = func(file.name);
                let contents = new Uint8Array(await file.arrayBuffer());
                await T.setItem('data-bios',system+'-'+file.name,{
                    contents,
                    system,
                    type:'Uint8Array',
                    timestamp:T.date
                });
                func(file.name,contents);
            });
        },1);
    }
    async Rooms_upload(system,func){
        let T = this.T;
        this.upload(files=>{
            Array.from(files).forEach(async fileItem=>{
                let elm = func&&func(fileItem.name);
                let contents = new Uint8Array(await fileItem.arrayBuffer()),file=[fileItem.name],filename=fileItem.name,type='Uint8Array',filetype=fileItem.type||T.F.gettype(''),filesize=fileItem.size,key=system+'-'+filename;
                let data = {
                    contents,
                    file,
                    filesize,
                    filetype,
                    type,
                    system,
                    timestamp:T.date,
                    version:T.version
                };
                await T.setItem('data-rooms',key,data);
                func&&func(fileItem.name,contents);
                delete data.contents;
                await T.setItem('data-info',key,data);
                data = null;
            });
        });
    }
    async Rooms_unpack(system,func){
        let T = this.T;
        this.upload(files=>{
            Array.from(files).forEach(async fileItem=>{
                let elm = func&&func(fileItem.name);
                let contents = new Uint8Array(await fileItem.arrayBuffer()),file=[fileItem.name],filename=fileItem.name,type='Uint8Array',filetype=fileItem.type||T.F.gettype(''),filesize=fileItem.size,key=system+'-'+filename;
                let data = {
                    contents,
                    file,
                    filesize,
                    filetype,
                    type,
                    system,
                    timestamp:T.date,
                    version:T.version
                };
                let unpack = await T.unFile(contents,status=>elm&&(elm.innerHTML=status),{filename:fileItem.name});
                if(!T.I.u8obj(unpack)){
                    data.type='unpack';
                    if(unpack.password){
                        data.password = unpack.password;
                        delete unpack.password;
                    }
                    data.file = [];
                    T.I.toArr(unpack,entry=>{
                        data.file.push(entry[0]);
                        func&&func(entry[0],entry[1]);
                    });
                    unpack = null;
                }else{
                    func&&func(fileItem.name,contents);
                }
                await T.setItem('data-rooms',key,data);
                delete data.contents;
                await T.setItem('data-info',key,data);
                elm&&(elm.innerHTML= '<b>'+T.getLang('indexDB Cache')+':</b>'+key+'&nbsp;'+T.getLang('is write!'));
                data = null;
            });
        });
    }

}