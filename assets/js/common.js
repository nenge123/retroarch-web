const Nenge = new class {
    DB_NAME = 'RetroArch_WEB';
    DB_STORE_MAP = {
        'data-libjs': null,
        'data-rooms': null,
        'data-info': null,
        '/userdata': 'userdata',
        '/home/web_user/retroarch/userdata': 'retroarch',
    };
    Encoding = 'GBK';
    LibPack = 'common_libjs.js';
    Libzip = 'zip.min.js';
    LibStore = 'data-libjs';
    version = 4;
    maxsize = 0x6400000;
    part = '-part-';
    lang = {};
    action = {};
    JSpath = document.currentScript && document.currentScript.src.split('/').slice(0, -1).join('/') + '/';
    fps=60;
    constructor() {
        
    }
    get date(){
        return new Date();
    }
    get time(){
        return this.date.getTime();
    }
    get rand() {
        return Math.random()
    }
    get randNum(){
        return Number(this.rand.toString().slice(2))
    }
    get F(){
        return this.UTIL;
    }
    get speed(){
        return 1000/this.fps;
    }
    set speed(fps){
        this.fps = fps;
    }
    async getItem(store, name, version, ARG = {}) {
        if (!name) return await this.getAllData(store, ARG);
        let T = this,
            F = T.F,
            maxsize = T.maxsize,
            part = T.part,
            result = await F.DB_GET(Object.assign({
                store,
                name
            }, ARG)),
            keyName = name.split(part)[0];
        if (result) {
            if (version && result.version && result.version != version) {
                result = undefined;
            } else if (result.contents && result.filesize && result.filesize > maxsize) {
                let returnBuf = new Uint8Array(result.filesize);
                await Promise.all(Array(Math.ceil(result.filesize / maxsize)).fill(keyName).map(async (v, k) => {
                    let newkey = v;
                    if (k > 0) newkey += part + k;
                    if (newkey == name) returnBuf.set(result.contents, k * maxsize);
                    else {
                        let subResult = await F.DB_GET(Object.assign(ARG, {
                            store,
                            'name': newkey
                        }));
                        if (subResult) returnBuf.set(subResult.contents, k * maxsize);
                        else T.Err('lost file');
                    }
                }));
                result.contents = returnBuf;
            }
            if (result && result.contents) {
                if (result.type == 'unpack') {
                    result.contents = await F.unFile(result.contents, ARG);
                } else if (result.type == 'File') {
                    result.contents = new File([result.contents], result.filename || keyName, {
                        type: result.filetype || F.gettype(result.filename || keyName)
                    });
                } else if (result.type == 'String') {
                    result.contents = new TextDecoder().decode(result.contents);
                }
            }

        }
        return result;
    }
    async setItem(store, name, data, dbName) {
        let T = this,
            F = T.F,
            maxsize = T.maxsize,
            part = T.part;
        data = await F.DB_DATA_CHECK(data, maxsize);
        if (data.contents && data.contents.byteLength > maxsize) {
            let filesize = data.contents.byteLength;
            let basecontent = {};
            F.is.toArr(data,entry => {
                if (entry[0] != 'contents') basecontent[entry[0]] = entry[1];
            });
            return await Promise.all(Array(Math.ceil(filesize / maxsize)).fill(name).map(async (v, k) => {
                let key = v,
                    start = k * maxsize;
                if (k > 0) key += part + k;
                return await F.DB_PUT({
                    store,
                    'data': Object.assign({
                        'contents': new Uint8Array(data.contents.subarray(start, filesize - start >= maxsize ? start + maxsize : filesize)),
                    }, basecontent, ),
                    'name': key,
                    dbName
                });
            }));
        }
        return await F.DB_PUT({
            store,
            data,
            name,
            dbName
        });
    }
    async removeItem(store, name, ARG) {
        let {
            clear,
            dbName
        } = ARG || {};
        let T = this,
            F = T.F;
        if (clear) {
            let contents = await F.DB_GET(Object.assign({
                store,
                name
            }, ARG));
            if (contents && contents.filesize) {
                return await Promise.all(Array(Math.ceil(contents.filesize / T.maxsize)).fill(name.split(part)[0]).map(async (v, k) => {
                    let key = v;
                    if (k > 0) key += T.part + k;
                    return await F.DB_UNSET({
                        store,
                        'name': key
                    }) + '\n';
                }));

            }
        }
        return await F.DB_UNSET({
            store,
            name,
            dbName
        });
    }
    async getAllData(store, only, ARG) {
        if(!store) return {};
        return await this.F.DB_ALL(Object.assign({
            store,
            only
        }, ARG));
    }
    async getContent(store, name, version, ARG) {
        let result = await this.getItem(store, name, version, ARG);
        return result && result.contents || result;
    }
    async getAllKeys(store, dbName) {
        return await this.F.DB_KEYS({
            store,
            dbName
        });
    }
    async getAllCursor(store, key, only, ARG) {
        return await this.F.DB_CURSOR(Object.assign({
            store,
            key,
            only
        }, ARG));
    }
    async clearDB(tables, dbName) {
        let F = this.F;
        if (!tables) return;
        if (F.is.str(tables)) tables = [tables];
        return await F.DB_TABLE_CLEAR(tables, dbName);
    }
    async deleteDB(tables, dbName) {
        let F = this.F;
        if (F.is.str(tables)) tables = [tables];
        return await F.DB_TABLE_DEL(tables, dbName);
    }
    getStore(table,dbName){
        if(!table) return undefined;
        let T = this,F=T.F;
        return new F.StoreDatabase(T,table,dbName||T.DB_NAME);
    }
    async FetchItem(ARG) {
        let T = this,F = T.F,I=T.is;
        if (!ARG || I.str(ARG)) ARG = {
            'url': ARG || '/'
        };
            let urlname = F.getname(ARG.url),
            key = ARG.key || urlname || 'index.php',
            keyname = ARG.key==F.LibKey?key+urlname:key,
            result,
            version = ARG.version,
            headers = {},
            response,
            unFile = (buf, password) => F.unFile(buf, Object.assign(ARG, {
                password
            })),
            callback = async result => {
                if (result && result.contents) {
                    if (result.type == 'unpack') result = await unFile(result.contents, result.password);
                    else result = result.contents;
                }
                ARG.success && ARG.success(result, headers);
                return result;
            };
        if (ARG.store && !ARG.unset) {
            result = await T.getItem(ARG.store,keyname, version, ARG);
            //console.log(result);
            if (result) {
                if (!ARG.checksize) {
                    return callback(result);
                }
            }
        }
        response = await F.FetchStart(ARG).catch(e=>T.runaction('fecth-error',[e]));
        if(!response) return undefined;
        headers = F.FetchHeader(response, ARG);
        let password = headers['password']||ARG.password||undefined;
        if (response.status == 404) {
            ARG.error && ARG.error(response.statusText);
            return callback(result);
        } else if (result && result.filesize && headers["byteLength"] > 0) {
            if (result.filesize == headers["byteLength"]){
                response.body.cancel();
                return callback(result);}
            result = null;
        }
        response = ARG.process?F.StreamResponse(response,ARG):response;
        let contents = await  response[ARG.type||'arrayBuffer'](),
            type = headers.type;
        if (contents.byteLength) {
            contents = new Uint8Array(contents.buffer || contents);
            type = 'Uint8Array';
        }
        let filesize = contents.byteLength || headers["byteLength"] || contents.length || 0;
        if (ARG.store && ARG.unpack && key === keyname && filesize > T.maxsize) {
            type = 'unpack';
            await T.setItem(ARG.store, keyname, {
                contents,
                timestamp: new Date,
                filesize,
                version,
                type,
                password
            });
            delete ARG.store;
        }
        if (ARG.unpack && I.u8obj(contents)) {
            contents = await unFile(contents,password);
            if (!contents.byteLength) type = 'datalist';
        }
        if (ARG.store && key !== keyname) {
            if (I.u8obj(contents)) {
                contents = new File([contents], urlname, {
                    'type': ARG.mime||headers['type']
                });
                type = 'File';
            } else {
                let contents2;
                await Promise.all(I.toArr(contents).map(async entry => {
                    let [name, data] = entry,
                    filename = name.split('/').pop(),
                        filetype = F.gettype(filename),
                        filedata = new File([data], filename, {
                            'type': filetype
                        });
                    F.Libjs[filename] = filedata;
                    await T.setItem(
                        ARG.store,
                        F.LibKey + filename, {
                            'contents': filedata,
                            'timestamp': T.date,
                            'filesize': data.byteLength,
                            'version': T.version,
                            'type': 'File'
                        }
                    );
                    if (ARG.filename == filename) {
                        contents2 = filedata;
                    }
                    return true;
                }));
                if (contents2) contents = contents2;
                contents2 = null;
                delete ARG.store;
            }
        }
        if (ARG.store) {
            await T.setItem(ARG.store, keyname, {
                contents,
                timestamp:T.date,
                filesize,
                version,
                type
            });
        }
        ARG.success && ARG.success(contents, headers);
        return contents;
    }
    ajax(ARG) {
        let T = this,I=T.is,F=T.F;
        if(I.str(ARG))ARG={url:ARG};
        return T.than((resolve, reject) => {
            const request = new XMLHttpRequest(ARG.paramsDictionary);
            request.responseType = ARG.type || "text";
            if (!ARG.error) ARG.error = reject;
            if (ARG.mime) request.overrideMimeType(ARG.mime);
            let evt = [
                'abort',
                'error',
                'load',
                'loadend',
                'loadstart',
                'progress',
                'readystatechange',
                'timeout'
            ];
            evt.forEach(val => ARG[val] && T.on(request, val, e => ARG[val](e, request)));
            if (!ARG.readystatechange) {
                T.on(request, 'readystatechange', event => {
                    switch (request.readyState) {
                        case 0:
                            break;
                        case 1:
                            break;
                        case 2:
                            break;
                        case 3:
                            break;
                        case 4:
                            if (request.status == 500) {
                                request.dispatchEvent(new ErrorEvent('error', {
                                    message: request.response
                                }));
                                throw request.response;
                            }
                            ARG.success && ARG.success(request.response, request.status, request, event);
                            resolve(request.response);
                            break;
                    }
                });
            }
            if (request.upload && ARG.upload) {
                evt.forEach(val => ARG.upload[val] && T.on(request.upload, val, e => ARG.upload[val](e, request)));
            }
            let formData,url;
            ARG.get = ARG.get || {};
            ARG.get['inajax'] =  T.time;
            url = I.get(ARG.url,ARG.get);
            if (ARG.post) {
                formData = I.post(ARG.post);
            }
            request.open(!formData ? "GET" : "POST", url);
            request.send(formData);
        });
    }
    runaction(action, data) {
        let T = this;
        if (T.action[action]) {
            if (!data) return T.action[action]();
            if (T.is.array(data)) return T.action[action].apply(T, data);
            return T.action[action].call(T, data);
        } else {
            console.log('lost action:' + action);
        }
    }
    addJS(buf, cb, iscss) {
        let re = false,
            script = document.createElement(!iscss ? 'script' : 'link'),
            func = success => {
                if (!/^(blob:)?https?:\/\//.test(buf) && !/(\.js$|\.css$)/.test(buf)) {
                    re = true;
                    buf = this.F.URL(buf, !iscss ? 'js' : 'css');
                }
                if (iscss) {
                    script.type = this.F.gettype('css');
                    script.href = buf;
                    script.rel = "stylesheet";
                } else {
                    script.type = this.F.gettype('js');
                    script.src = buf;
                }
                script.onload = e => {
                    success && success(e);
                    if (re) window.URL.revokeObjectURL(buf);
                    buf = null;
                };
                this.$(!iscss ? 'body' : 'head').appendChild(script);
            };
        if (!cb) return this.than((resolve, reject) => func(resolve, reject));
        else func(cb), script;

    };
    async loadScript(js) {
        let T=this,F=T.F,url = /^(\/|https?:\/\/|static\/js\/|data\/)/.test(js) ? js : this.JSpath + js,
            data = await T.FetchItem({
            url,
            store:T.LibStore,
            key:F.LibKey,
            mime:F.gettype('js'),
            version: T.version
        });
        await T.addJS(data);
        return data;
    }
    async loadLibjs(name) {
        return await this.addJS(await this.F.getLibjs(name));
    }
    unFile(u8, process, ARG) {
        return this.F.unFile(u8, Object.assign({process}, ARG));
    }    
    is = new class{
        get mobile(){
            return 'ontouchend' in document
        }
        formdata = (obj)=>new FormData(obj||undefined);
        formget = obj=>new URLSearchParams(obj);
        /**
         * 初始化表单数据
         * @param {*} obj 表单元素/表单元素查询字符/json
         * @returns {FormData} 表单对象
         */
        post(obj){
            let I = this,T = I.T;
            let post =I.postobj(obj) ? obj:I.formdata(I.formelm(obj)?obj:I.str(obj)?T.$(obj):undefined);
            if(I.objArr(obj))I.toArr(obj,v=>post.append(v[0],v[1]));
            return post;
        }
        /**
         * 初始化URL参数
         * @param {String} url 地址
         * @param {String|JSON} get 字符/json
         * @returns {String} 地址
         */
        get(url,get){
            let I=this,str1='',str2='',urls = url.split('?');
            if(urls[1]) str1 = I.formget(urls[1]);
            if(get) str2 = I.formget(get);
            let data = I.formget(str1+'&'+str2).toString().replace(/^(.+?)=&/,'$1&');
            return urls[0]+(data?'?'+data:'');
        }
        /**
         * entries数组转JSON
         * @param {*} obj 
         * @returns {JSON} JSON
         */
        toObj(obj){
            let I=this,arr = [];
            if(I.nodemap(obj))arr = Array.from(obj||[]).map(attr => [attr.name, attr.value]);
            else if(I.postobj(obj) ||I.getobj(obj))obj.forEach((v,k)=>arr.push([k,v]));
            else if(I.objArr(obj)) return obj;
            else if(I.array(obj)) arr = obj;
            return Object.fromEntries(arr);
        }
        /**
         * JSON转entries
         * @param {JSON} obj 
         * @param {*} func forEach处理函数
         * @returns {Array} entries
         */
        toArr(obj,func){
            let arr = Object.entries(obj);
            if(func instanceof Function)return arr.forEach(func);
            return arr;
        }
        define(o,p,attr,bool){
            Object.defineProperty(o,p,!bool?attr:{get(){return attr}});
        }
        defines(o,attr,bool){
            if(bool)return this.toArr(attr,entry=>this.define(o,entry[0],entry[1],1));
            Object.defineProperties(o,attr);
        }
        isf(o,val){
            return o instanceof val;
        }
        tp(o,val){
            return typeof o  === val;
        }
        constructor(T){
            let I = this;
            I.toArr({
                'blob':Blob,
                'file':File,
                'await':Promise,
                'array':Array,
                'postobj':FormData,
                'getobj':URLSearchParams,
                'elment':Element,
                'func':Function,
                'nodemap':NamedNodeMap,
                'u8obj':Uint8Array,
                'formelm':HTMLFormElement,
                'obj':Object,
            },entry=>{
                I.define(I,entry[0],{
                    value:obj=>I.isf(obj,entry[1]),
                })
            });
            I.toArr({
                'objArr':'Object',
                'str':'String',
            },entry=>{
                I.define(I,entry[0],{
                    value:obj=>typeof obj.constructor!='undefined'&&obj.constructor.name === entry[1],
                })
            });
            I.toArr({
                'undefined':'undefined',
            },entry=>{
                I.define(I,entry[0],{
                    value:obj=>I.tp(obj,entry[1]),
                })
            });
            I.define(I,'T',{
                get:()=>T,
            })
        }
    }(this);
    UTIL = new class {
        Libjs = {};
        LibKey = 'script-';
        LibUrl = {};
        StreamResponse(response,ARG) {
        let num = s=>Number(s),
            downsize = num(response.headers.get('content-length')||0),
            downtext = ARG&&ARG.downtext ? ARG.downtext : '进度:',
            havesize = 0,
            status = {
                done: !1,
                value: !1
            },
            getStatus = async () => {
                status = await reader.read()
            },
            reader = response.body.getReader();
            return new Response(new ReadableStream({
                async start(ctrler) {
                    while (!status.done) {
                        let speedsize = 0,statustext = '';
                        if (status.value) {
                            speedsize = num(status.value.length);
                            havesize += speedsize;
                            ctrler.enqueue(status.value);
                        }
                        if (downsize) statustext = downtext + Math.floor(havesize / downsize * 100) + '%';
                        else statustext = downtext + Math.floor(havesize*10/1024)/10+'KB';
                        //下载进度
                        ARG&&ARG.process && ARG.process(statustext, downsize, havesize,speedsize);
                        await getStatus();
                    }
                    ctrler.close();
                }
            }));
        }
        FetchHeader(response, ARG) {
            let headers = {};
            response.headers.forEach((v, k) => headers[k] = v);
            (headers['content-type'] || this.gettype(ARG.url.split('/').pop() || 'html')).split(';').forEach((value, index) => {
                value = value.trim().toLowerCase();
                if (index == 0) headers['content-type'] = value;
                else if (value.search(/=/) != -1) {
                    let data = value.split('=');
                    headers[data[0].trim()] = data[1].trim();
                }
            });
            return Object.assign(headers, {
                'byteLength': Number(headers['content-length']) || 0,
                'password': headers['password'] || headers['content-password'],
                'type': headers['type'] || headers['content-type'].split('/')[0],
            });
        }
        FetchStart(ARG) {
            let F=this,I=F.is,{
                url,
                get,
                post} = ARG || {}, data = {};
            url = I.get(ARG.url,get);
            ['headers', 'context', 'referrer', 'referrerPolicy', 'mode', 'credentials', 'redirect', 'integrity', 'cache'].forEach(val => {
                if (ARG[val] != undefined) data[val] = ARG[val];
            });
            if (post) {
                data.method = 'POST';
                data.body = I.post(post);
            }
            return fetch(url, data);
        }
        than = f=>new Promise(f);
        async unRAR(u8, ARG) {
            let F=this,{
                process,
                password,
                src
            } = ARG,u8name='';
            if(F.is.blob(u8)){
                u8name = u8.name||'';
                u8 = new Uint8Array(await u8.arrayBuffer());
            }
            src = src || 'rar.js';
            if(!F.LibUrl[src])F.LibUrl[src] = F.URL(await F.getLibjs(src));
            let url = F.LibUrl[src],worker = new Worker(url);
            return F.than(complete => {
                let contents = {};
                worker.onmessage = result => {
                        let data = result.data,filename = F.getname(data.file)||u8name;
                        if (1 === data.t) {
                            complete(contents);
                            result.target['terminate']();
                        } else if (2 === data.t) {
                            contents[data.file] = data.data;
                        } else if (4 === data.t && data.total > 0 && data.total >= data.current) {
                            process && process(ARG.packtext + ' ' +filename + ' ' + Math.floor(Number(data.current) / Number(data.total) * 100) + '%', data.total, data.current);
                        }
                    },
                    worker.onerror = error=>{
                        alert('RAR/7Z解压失败!');
                        console.log(error);
                    };
                    worker.postMessage(src=='rar.js' ? {
                        data: u8,
                        password
                    } : u8);
            });

        }
        async un7z(u8, ARG) {
            ARG.src = '7z.js';
            return this.unRAR(u8, ARG);
        }
        async unZip(u8, ARG = {}) {
            let {
                process,
                password,
                packtext
            } = ARG, F = this, T = F.T;
            await F.ZipInitJS();
            let zipReader = new zip.ZipReader(F.is.blob(u8) ? new zip.BlobReader(u8) : new zip.Uint8ArrayReader(u8));
            let entries = await zipReader.getEntries({
                filenameEncoding: T.Encoding,
            });
            if (entries.length > 0) {
                let contents = {};
                await Promise.all(
                    entries.map(
                        async entry => {
                            if (entry.directory) return;
                            let opt = {
                                'onprogress': (a, b) => process && process(packtext + entry.filename + ':' + Math.ceil(a * 100 / b) + '%')
                            };
                            if (!entry.encrypted) {
                                contents[entry.filename] = await entry.getData(new zip.Uint8ArrayWriter(), opt);
                            } else {
                                contents[entry.filename] = await F.ZipData(entry, opt, password);
                            }
                            return true;
                        }
                    )
                );
                zipReader.close();
                delete F.ZipPassword;
                return contents;
            } else {
                return u8;
            }
        }
        ZipWait() {
            if (this.ZipPassword == undefined) return;
            return this.than(complete => {
                let Time = setInterval(() => {
                    if (this.ZipPassword != '') {
                        clearInterval(Time);
                        complete(true);
                    }
                }, this.speed);
            })
        }
        async ZipData(entry, opt, password) {
            let F = this;
            try {
                return await entry.getData(new zip.Uint8ArrayWriter(), Object.assign(opt, {
                    'password': F.ZipPassword || password
                }));
            } catch (e) {
                if (['File contains encrypted entry', 'Invalid password'].includes(e.message)) {
                    console.log(e.message);
                    await F.ZipWait();
                    if (!this.ZipPassword || F.ZipPassword == password) this.ZipPassword = '';
                    if (!F.ZipPassword) {
                        F.ZipPassword = window.prompt('need a read password', F.ZipPassword || '');
                    }
                    return await F.ZipData(entry, opt, F.ZipPassword || undefined);

                } else {
                    F.T.Err(e);
                }
            }
        }
        async ZipCreate(password) {
            await this.ZipInitJS();
            return new zip.ZipWriter(new zip.Uint8ArrayWriter(), {
                password
            });
        }
        async ZipInitJS() {
            let F = this,
                T = F.T;
            if (!window.zip) await T.addJS(await F.getLibjs(T.Libzip));
            return true;
        }
        async ZipAddFile(files, password, ZipWriter, options, comment) {
            let F = this;
            if (!ZipWriter) ZipWriter = await F.ZipCreate(password);
            if (F.is.file(files)) await ZipWriter.add(files.name, new zip.BlobReader(files), options);
            else await Promise.all(Array.from(files).map(async file => await ZipWriter.add(file.name, new zip.BlobReader(file), options)));
            return await ZipWriter.close(comment);
        }
        async unFile(u8, ARG = {}) {
            let F = this,I=F.is;
            if (I.str(ARG)) ARG.unMode = {
                'unMode': ARG
            };
            ARG.packtext = ARG.packtext || '解压:';
            if (ARG.unMode && F[ARG.unMode]) return await F[ARG.unMode](u8, ARG);
            let action = null,
                u8Mime;
            if (I.blob(u8)) {
                if (u8.name) {
                    let type = u8.name.split('?')[0].split('.').pop().toLowerCase();
                    if (type == 'zip') action = 'unZip';
                    else if (type == 'rar') action = 'unRAR';
                    else if (type == '7z') action = 'un7z';
                } else if (u8.type) {
                    let mime = u8.type.split('/').pop();
                    if (/zip/.test(mime)) action = 'unZip';
                    else if (/rar/.test(mime)) action = 'unRAR';
                    else if (/7z/.test(mime)) action = 'un7z';
                }
                if (!action) {
                    u8 = new Uint8Array(await u8.arrayBuffer());
                    u8Mime = F.checkBuffer(u8);
                }
            } else if (I.u8obj(u8)) {
                u8Mime = F.checkBuffer(u8);
            } else if (u8.buffer){
                u8 = new Uint8Array(u8.buffer);
                u8Mime = F.checkBuffer(u8);
            }else if(IDBTransaction.array(u8)) {
                u8 = new Uint8Array(u8);
                u8Mime = F.checkBuffer(u8);
            }
            if (u8Mime) {
                if (u8Mime == 'zip') action = 'unZip';
                else if (u8Mime == 'rar') action = 'unRAR';
                else if (u8Mime == '7z') action = 'un7z';
            }
            if (action && F[action]) return await F[action](u8, ARG);
            return u8;
        }
        getname(str) {
            return (str || '').split('/').pop().split('?')[0];
        }
        gettype(type) {
            let F =this;
            type = F.getname(type).split('.').pop().toLowerCase();
            if (!F.mime_list) {
                F.mime_list = {};
                F.is.toArr(
                    F.mime_map,
                    entry => entry[1].forEach(m => F.mime_list[m] = entry[0] + (entry[0].includes('/') ? '' : '/' + m))
                );
            }
            return F.mime_list[type] || 'application/octet-stream';
        }
        mime_preg = {
            "7z": /^377ABCAF271C/,
            "rar": /^52617221/,
            "zip": /^504B0304/,
            "png": /^89504E470D0A1A0A/,
            "gif": /^47494638/,
            "jpg": /^FFD8FF/,
            "webp": /^52494646/,
            "pdf": /^255044462D312E/,
        };
        mime_map = {
            'text/javascript': ['js'],
            'text/css': ['css', 'style'],
            'text/html': ['html', 'htm', 'php'],
            'text/plain': ['txt'],
            'text/xml': ['xml', 'vml', 'svg'],
            'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            'application': ['pdf'],
            'application/x-zip-compressed': ['zip'],
            'application/x-rar-compressed': ['rar'],
            'application/x-7z-compressed': ['7z']
        };
        checkBuffer(u8, defalut) {
            let head = Array.from(u8.slice(0, 8)).map(v => v.toString(16).padStart(2, 0).toLocaleUpperCase()).join('');
            if (head) {
                let result = this.is.toArr(this.mime_preg).filter(entry => entry[1].test(head))[0];
                if (result) return result[0];
            }
            return defalut || 'unkonw';
        }
        URL(u8, type) {
            let F = this,I=F.is;
            if (I.u8obj(u8)) {
                if (!type) type = F.gettype(F.checkBuffer(u8));
            } else if (I.str(u8)) {
                if (/^(blob|http)/.test(u8) || /^\/?[\w\-_\u4e00-\u9FA5:\/\.\?\^\+ =%&@#~]+$/.test(u8)) return u8;
                if (!type) type = F.gettype('js');
            }
            return window.URL.createObjectURL(I.blob(u8) ? u8 : new Blob([u8], {'type': type}));
        }
        removeURL(url) {
            return window.URL.revokeObjectURL(url);
        }
        download(name, buf, type) {
            let I=this.is,href;
            if (I.blob(name)) {
                href = this.URL(name);
                name = name.name || 'unknowfile';
            } else {
                href = this.URL(buf, type);
            }
            let a = document.createElement("a");
            a.href = href;
            a.download = name;
            a.click();
            a.remove();
        }
        DB_STORE = {};
        get DB() {
            return this.DB_STORE[this.dbname];
        }
        get idb() {
            return window.indexedDB || window.webkitindexedDB;
        }
        DB_SET_MAP(ARG) {
            let {
                store,
                dbName,
                dbIndex
            } = ARG || {}, F = this,I=F.is,
                T = F.T,info = F.db_info;
            if (!info) {
                info = Object.assign({}, T.DB_MAP_LIST || {});
                let name = F.dbname;
                if (name && !info[name]) {
                    info[name] = {};
                    T.DB_STORE_MAP && I.toArr(T.DB_STORE_MAP,entry => {
                        //console.log(entry);
                        let key = entry[1] == null || !I.str(entry[1])? entry[0]:entry[1];
                        info[name][key] = key == entry[1] ? {
                            'timestamp': false
                        } : entry[1] || {};
                    });
                }
            }
            if (dbName) {
                !info[dbName] && (info[dbName] = {});
                if (store) {
                    !info[dbName][store] && (info[dbName][store] = {});
                    if (dbIndex) {
                        if (I.str(dbIndex)) info[dbName][store][dbIndex] = false;
                        else Object.assign(info[dbName][store], dbIndex);
                    }
                }
            }
            if(!F.db_info)F.db_info = info;
            return info;

        }
        async DB_LOAD(ARG = {}) {
            let store = ARG.store,
                F = this,
                T = F.T,
                dbName = ARG.dbName || F.dbname,
                DB = F.DB_STORE[dbName];
            if (DB && (!store || F.DB_TABLE_CHECK(store, DB))) {
                return DB;
            }
            await F.DB_INSTALL(F.DB_SET_MAP(Object.assign(ARG || {}, {
                'dbName': dbName
            })));
            return F.DB_STORE[dbName];
        }
        async DB_INSTALL(info) {
            let F = this,I=F.is;
            console.log('install indexDB');
            await Promise.all(I.toArr(info).map(async dbmap => {
                let [mapName, dbTable] = dbmap,
                DB = F.DB_STORE[mapName],
                    dbVer;
                if (DB) {
                    let notTable = I.toArr(dbTable).filter(v => !F.DB_TABLE_CHECK(v[0], DB));
                    if (!notTable.length) return 'ok';
                    dbVer = DB.version + 1;
                    DB.close();
                }
                return await F.DB_OPEN(Object.assign({
                    'dbName': mapName,
                    'dbTable': dbTable,
                    dbVer
                }));
            }));
        }
        async DB_OPEN(ARG) {
            if (!ARG) return;
            let {
                dbName,
                dbVer,
                dbTable
            } = ARG,
            F = this,
                T = F.T,
                DB = ARG.DB || F.DB_STORE[dbName];
            if (dbVer) {
                DB && DB.close();
            } else if (DB) {
                return DB;
            }
            return this.than((resolve, reject) => {
                let req = F.idb.open(dbName, dbVer);
                req.addEventListener('error', async err => {
                    console.log(err, req.error);
                    reject(err);
                });
                req.addEventListener('upgradeneeded', async e => {
                    let DB = req.result;
                    if (ARG.dbUpgrad) {
                        await ARG.dbUpgrad.apply(req, [DB]);
                    } else {
                        await F.DB_TABLE_CREATE(Object.assign(ARG, {
                            DB
                        }));
                    }
                });
                req.addEventListener('versionchange', e => {
                    console.log(11);
                });
                req.addEventListener('success', async e => {
                    let DB = req.result;
                    if (!dbVer && dbTable) {
                        let notTable = F.is.toArr(dbTable).filter(v => !F.DB_TABLE_CHECK(v[0], DB));
                        if (notTable.length) {
                            dbVer = DB.version + 1;
                            DB = await F.DB_OPEN(Object.assign(ARG, {
                                dbVer,
                                DB
                            }));

                        }
                    }
                    F.DB_STORE[dbName] = DB;
                    resolve(DB);
                });
            });
        }
        async DB_TABLE_CREATE(ARG) {
            let {
                dbTable,
                DB
            } = ARG || {};
            if (!dbTable || !DB) return;
            let F = this,I=F.is;
            await Promise.all(
                I.toArr(dbTable).map(
                    async tableData => {
                        let options, [keyTable, keyData] = tableData;
                        if (keyData.options) {
                            options = keyData.options;
                            delete keyData.options;
                        }
                        let DBObjectStore, keylist = I.toArr(keyData);
                        if (!F.DB_TABLE_CHECK(keyTable, DB)) {
                            DBObjectStore = await DB.createObjectStore(keyTable, options);
                            F.DB_INDEX_CREATE(keylist, DBObjectStore);
                        }
                    }
                )
            );
        }
        DB_INDEX_CREATE(keylist, DBObjectStore) {
            keylist.forEach(
                key_map => {
                    let [key, opt] = key_map;
                    !DBObjectStore.indexNames.contains(key) && DBObjectStore.createIndex(key, key, opt && opt.unique ? opt : {
                        "unique": false
                    });
                }
            );
        }
        DB_TABLE_CHECK(list, DB, len) {
            if (this.is.str(list)) list = [list];
            list = list ? list.filter(v => DB.objectStoreNames.contains(v)) : [];
            if (len) return list;
            return list.length;
        }
        async DB_DATA_CHECK(data, maxsize) {
            let I = this.is;
            if (I.await(data)) data = await data;
            let contents = data.contents || data,
                result = {};
            if (I.str(contents) && contents.length > maxsize) {
                contents = new TextEncoder().encode(contents);
                Object.assign(result, {
                    contents,
                    filesize: contents.byteLength,
                    'type': 'String',

                });
            } else if (I.blob(contents) && contents.size > maxsize) {
                Object.assign(result, {
                    'contents': new Uint8Array(await contents.arrayBuffer()),
                    'filetype': contents.type,
                    'filesize': contents.size,
                    'filename': contents.name,
                    'type': 'File'
                });
            } else if (contents.byteLength && contents.byteLength > maxsize) {
                if (contents.__proto__.constructor != Uint8Array) contents = new Uint8Array(contents.buffer || contents);
                Object.assign(result, {
                    contents,
                    'filesize': contents.byteLength,
                    'type': 'Uint8Array'
                });
            }
            if (result.contents) {
                if (!data.type && !result.type) result.type = 'Uint8Array';
                if (data.contents) {
                    delete data.contents;
                    Object.assign(data, result);
                } else {
                    data = result;
                }
            }
            if (data.contents)['version', 'password'].forEach(val => !data[val] && (delete data[val]));
            return data;
        }
        async DB_SELECT(ARG, ReadMode) {
            let F = this,
                T = F.T;
            if (F.is.str(ARG)) ARG = {
                'store': ARG
            };
            ARG = Object.assign({
                'dbName': F.dbname
            }, ARG);
            let {
                store,
                dbName
            } = ARG, DB = F.DB_STORE[dbName] || F.DB;
            if (!DB || !F.DB_TABLE_CHECK(store, DB)) DB = await F.DB_LOAD(ARG);
            ReadMode = ReadMode ? "readonly" : "readwrite";
            if (!store) store = DB.objectStoreNames[0];
            else if (!F.DB_TABLE_CHECK(store, DB)) return T.Err('store is null');
            let DBTransaction = DB.transaction([store], ReadMode);
            DBTransaction.onerror = e => {
                e.preventDefault();
                throw DBTransaction.error;
            };
            return DBTransaction.objectStore(store);
        }
        async DB_GET(ARG) {
            if (this.is.str(ARG)) ARG = {
                'name': ARG
            };
            let name = ARG.name,
                DB = await this.DB_SELECT(ARG, !0);
            if (name) return this.than(resolve => {
                DB.get(name).onsuccess = e => resolve(e.target.result);
            });
        }
        async DB_PUT(ARG) {
            let {
                data,
                name
            } = ARG || {}, DB = await this.DB_SELECT(ARG);
            return this.than(resolve => {
                DB.put(data, name).onsuccess = e => resolve(e.target.result);
            });
        }
        async DB_UNSET(ARG) {
            if (this.is.str(ARG)) ARG = {
                'name': ARG
            };
            let name = ARG.name,
                DB = await this.DB_SELECT(ARG);
            if (name) return this.than((resolve, reject) => {
                DB.delete(name).onsuccess = e => resolve(`delete:${name}`);
            });
        }
        async DB_ALL(ARG) {
            let F = this,
                T = F.T,
                DB = await F.DB_SELECT(ARG, !0);
            return F.than(callback => {
                let entries = {};
                DB.openCursor().onsuccess = evt => {
                    let cursor = evt.target.result;
                    if (cursor) {
                        if (ARG.only === true && T.part && T.maxsize && F.is.u8obj(cursor.value.contents) && cursor.value.filesize > T.maxsize) {
                            let skey = cursor.primaryKey.split(T.part),
                                newkey = skey[0],
                                index = skey[1] || 0;
                            if (!entries[newkey]) {
                                let contents = new Uint8Array(cursor.value.filesize);
                                contents.set(cursor.value.contents, index * T.maxsize);
                                delete cursor.value.contents;
                                entries[newkey] = Object.assign(cursor.value, {
                                    contents
                                })
                            } else {
                                entries[newkey].contents.set(cursor.value.contents, index * T.maxsize);
                            }
                        } else {
                            entries[cursor.primaryKey] = cursor.value;
                        }
                        cursor.continue();
                    } else {
                        callback(entries);
                    }
                }
            });
        }
        async DB_KEYS(ARG) {
            if (this.is.str(ARG)) ARG = {
                'dbName': ARG
            };
            let DB = await this.DB_SELECT(ARG, !0);
            return this.than(resolve => {
                DB.getAllKeys().onsuccess = e => {
                    resolve(e.target.result)
                };
            });

        }
        async DB_CURSOR(ARG) {
            if (this.is.str(ARG)) ARG = {
                'key': ARG
            };
            let key = ARG.key,
                F = this,
                T = F.T,
                DB = await F.DB_SELECT(ARG, !0),
                len = DB.indexNames.length;
            if (len && !key) {
                key = DB.indexNames[0];
            } else if (!len) {
                return F.DB_KEYS(ARG);
            }
            return F.than(resolve => {
                let entries = {};
                DB.index(key).openKeyCursor().onsuccess = evt => {
                    let cursor = evt.target.result;
                    if (cursor) {
                        if (ARG.only !== true || T.part && !cursor.primaryKey.includes(T.part)) {
                            entries[cursor.primaryKey] = {};
                            entries[cursor.primaryKey][key] = cursor.key;
                        }
                        cursor.continue()
                    } else {
                        resolve(entries)
                    }
                }
            })

        }
        async DB_TABLE_CLEAR(tables, dbName) {
            if (this.is.str(tables)) tables = [tables];
            return await Promise.all(tables.map(async store => {
                let DB = await F.DB_SELECT({
                    store,
                    dbName
                });
                DB.clear();
            }));
        }
        async DB_TABLE_DEL(tables, dbName) {
            if (!tables) return this.idb.deleteDatabase(dbName || this.dbname);
            let F = this,
                DB = await F.DB_LOAD({
                    dbName
                }),
                dbVer = DB.version + 1,
                list = F.DB_TABLE_CHECK(tables, DB, !0);
            if (!list.length) return 'nothing delete';
            DB.close();
            return await F.DB_OPEN({
                dbName: DB.name,
                dbVer,
                dbUpgrad: DB => {
                    list.forEach(val => DB.deleteObjectStore(val));
                }
            });

        }
        
        StoreDatabase = class{
            constructor(T,table,dbName){
                let I = T.is;
                I.defines(this,{T,table,dbName},1);
                ['getItem','setItem','removeItem','getAllData','getContent','getAllKeys','getAllCursor','clearDB','deleteDB'].forEach(val=>{
                    I.define(this,val,{
                        value:function(){
                            let arr =[this.table].concat(Array.from(arguments));
                            return this.T[val].apply(this.T,arr);
                        }
                    })
                });
            }
            setName(ARG){
                let D = this,dbName = D.dbName;
                if(!ARG||D.T.is.str(ARG))ARG = {dbName};
                else ARG.dbName = dbName;
                return ARG;
            }
            get(name, version, ARG){
                ARG = this.setName(ARG);
                return this.getItem(name, version, ARG);
            }
            put(name, data){
                return this.setItem(name,data,this.dbName);
            }
            remove( name, ARG){
                ARG = this.setName(ARG);
                return this.removeItem(name, ARG);
            }
            data(name, version, ARG){
                ARG = this.setName(ARG);
                return this.getContent(name, version, ARG);
            }
            keys(){
                return this.getAllKeys(this.dbName);
            }
            cursor(key, only, ARG){
                ARG = this.setName(ARG);
                return this.getAllCursor(key, only, ARG);
            }
            all(only, ARG){
                ARG = this.setName(ARG);
                return this.getAllData(only, ARG);
            }
            clear(){
                return this.clearDB(this.dbName);
            }
            delete(){
                return this.deleteDB(this.dbName);
            }
        };
        async getLibjs(file) {
            let F = this,
                T = F.T;
            if (F.Libjs[file]) return F.Libjs[file];
            let contents = await T.getContent(T.LibStore, F.LibKey + file, T.version);
            if (!contents) {
                if(!window.zip)contents = await T.loadScript(T.Libzip);
                if (file != T.Libzip) {
                    contents = await T.FetchItem({
                        url: T.JSpath + T.LibPack,
                        'store': T.LibStore,
                        'key': F.LibKey,
                        'unpack': true,
                        'filename': file
                    });
                }
            }
            if (file == 'rar.js') {
                    let memurl = F.URL(await F.getLibjs('rar.mem'));
                    let rarurl = F.URL(contents);
                    contents = `var dataToPass=[],password;self.Module={locateFile:()=>'` + memurl + `',monitorRunDependencies:function(t){0==t&&setTimeout((function(){unrar(dataToPass,password||null)}),100)},onRuntimeInitialized:function(){}};
                importScripts('` + rarurl + `');let unrar=function(t,e){let n=readRARContent(t.map((function(t){return{name:t.name,content:new Uint8Array(t.content)}})),e,(function(t,e,n){postMessage({t:4,current:n,total:e,name:t})})),o=function(t){if("file"===t.type)postMessage({t:2,file:t.fullFileName,size:t.fileSize,data:t.fileContent});else{if("dir"!==t.type)throw"Unknown type";Object.keys(t.ls).forEach((function(e){o(t.ls[e])}))}};return o(n),postMessage({t:1}),n};onmessage=function(t){dataToPass.push({name:"test.rar",content:t.data.data});if(!password&&t.data.password)password=t.data.password;};`;
                    F.Libjs[file] = new File([contents], file, {
                        'type': F.gettype('js'),
                        'x-content-type-options': 'nosniff'
                    });
            }else if(contents){
                F.Libjs[file] = contents;
            }
            return F.Libjs[file];
        }
        constructor(t) {
            let F = this,I=t.is;
            I.defines(F, {
                'T': {
                    get: () => t
                },
                'dbname':{
                    get:()=>t.DB_NAME
                }
            });
            I.define(F,'is',{get:()=>I});
        }
    }(this);
    on(elm, evt, fun, opt, cap) {
        elm = this.$(elm);if(!elm) return;
        elm.addEventListener(evt, fun, opt === false ? {
            passive: false
        } : opt, cap);
    }
    un(elm, evt, fun, opt, cap) {
        this.$(elm).removeEventListener(evt, fun, opt === false ? {
            passive: false
        } : opt, cap);
    }
    once(elm, evt, fun, cap) {
        return this.on(elm, evt, fun, {
            passive: false,
            once: true
        }, cap);
    }
    docload(f) {
        let d = document;
        return this.than(complete => {
            if (d.readyState == 'loading') {
                return this.once(d, 'DOMContentLoaded', () => {
                    f && f.call(this);
                    complete(true);
                });
            }
            f && f.call(this);
            complete(true);
        });
    }
    $(e, f){
        let T=this,I=T.is,d = f||document;
        return e?I.str(e)?d.querySelector(e) :I.func(e)? T.docload(e):e:undefined;
    }
    $$(e, f){
        return (f || document).querySelectorAll(e);
    }
    $ce(e){
        return document.createElement(e);
    }
    attr(e,s){
        return this.$(e).getAttribute(s);
    }
    customElement(myelement) {
        let T = this;
        window.customElements.define(myelement, class extends HTMLElement {
            /* 警告 如果文档处于加载中,自定义元素实际上并不能读取子元素(innerHTML等) */
            /*因此 如果仅仅操作属性(Attribute),可以比元素出现前提前定义.否则最好文档加载完毕再定义,并不会影响事件触发 */
            constructor() {
                super();
                T.runaction('TAG-' + this.tagName, [this, 'init']);
            }
            connectedCallback() {
                /*文档document中出现时触发*/
                T.runaction('TAG-' + this.tagName, [this, 'connect']);

            }
            attributeChangedCallback(name, oldValue, newValue) {
                /*attribute增加、删除或者修改某个属性时被调用。*/
                T.runaction('TAG-' + this.tagName, [this, 'attribute',{name, oldValue, newValue}]);
            }
            disconnectedCallback() {
                /*custom element 文档 DOM 节点上移除时被调用*/
                T.runaction('TAG-' + this.tagName, [this, 'disconnect']);
            }
        });
    }
    Err(msg) {
        throw new Error(msg);
    }
    down(name,buf,type){
        return this.F.download(name,buf,type);
    }
    mouse(type,opt,obj){
        return this.dispatch(obj,new MouseEvent(type,opt));
    }
    touch(type,opt,obj){
        return this.dispatch(obj,new TouchEvent(type,opt));
    }
    keyboard(type,opt,obj){
        return this.dispatch(obj,new KeyboardEvent(type,opt));
    }
    dispatch(obj,evt){
        if(!obj) return evt;
        return this.$(obj).dispatchEvent(evt);
    }
    force(type,opt,elm){
        this.mouse('webkitmouseforce'+type,opt,elm);
    }
    stopEvent = e => {
        e.preventDefault();
    }
    stopProp = e => {
        e.preventDefault();
        e.stopPropagation();
    }
    stopGesture(elm){
        let T = this;
        //禁止手势放大
        ['gesturestart','gesturechange','gestureend'].forEach(v=>T.on(elm,v,e=>T.stopEvent(e)));
    }
    than(f){
        return new Promise(f);
    }
};
const Nttr = (obj)=>!obj.Nttr?new class {
    constructor(obj) {
        let T = Nenge,
            elm = T.$(obj);
        if (!elm) T.Err(obj);
        this.obj = elm;
        Object.defineProperties(this, {
            'T': {
                get: () => T,
            },
            '$': {
                value: (e) => T.$(e, obj)
            },
            '$$': {
                value: (e) => T.$$(e, obj)
            },
        });
        this.obj.Nttr = this;
    }
    get cList() {
        return this.obj.classList;
    }
    contains(name) {
        return this.cList.contains(name);
    }
    attr(k, v) {
        if (typeof v == 'undefined') return this.obj.getAttribute(k);
        if (v == null) return this.obj.removeAttribute(k)
        this.obj.setAttribute(k, v);
        return this;
    }
    get css(){
        return this.obj.style.cssText;
    }
    set css(text){
        return this.obj.style.cssText=text;
    }
    get active() {
        return this.contains('active')
    }
    set active(bool) {
        this.cList[bool ? 'add' : 'remove']('active')
        return this;
    }
    get show() {
        return this.contains('show')
    }
    set show(bool) {
        this.cList[bool ? 'add' : 'remove']('show')
        return this;
    }
    get hidden(){
        return this.obj.hidden;
    }
    set hidden(bool){
        this.obj.hidden=bool;
        return this;
    }
    get attrs() {
        return this.getAttrs();
    }
    set attrs(obj) {
        this.setAttrs(obj);
        return this;
    }
    getAttrs(name) {
        if (name) return this.attr(name);
        return Object.fromEntries(Array.from(this.obj.attributes || []).map(attr => [attr.name, attr.value]));
    }
    setAttrs(attr, value) {
        if (attr.constructor === Object) {
            Object.entries(attr).forEach(entry => this.attr(entry[0], entry[1]));
        } else {
            this.attr(attr, value);
        }
        return this;
    }
    on(evt, func, opt) {
        if (!this.eventList) this.eventList = [{
            evt,
            func,
            opt
        }];
        else this.eventList.push({
            evt,
            func,
            opt
        });
        return this.T.on(this, evt, func, opt);
    }
    un(evtname) {
        this.eventList && this.eventList.forEach(value => {
            let {
                evt,
                func,
                opt
            } = value;
            if (!evtname) this.T.un(evt, func, opt);
            else if (evtname == evt) this.T.un(evt, func, opt);
        })
    }
    once(evt, func, cap) {
        return this.T.once(this.obj, evt, func, cap);
    }
    bind(opt,evt){
        evt = evt||'pointerup';
        let T = this.T;
        T.is.toArr(opt,entry=>{
            T.on(T.$(entry[0],this.obj),evt,entry[1]);
        })
    }
}(obj):obj.Nttr;