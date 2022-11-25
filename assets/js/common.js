const Nenge = new class NengeCores{
    version = 1;
    DB_NAME = 'XINNO_BBS';
    DB_STORE_MAP = {
        'data-js': { 'timestamp': false },
        'data-file': {},
        'avatar': { 'timestamp': false },
        'forumsicon': { 'timestamp': false },
        'document': { 'timestamp': false },
    };
    LibPack = 'common_libjs.zip';
    Libzip = 'zip.min.js';
    LibStore = 'data-js';
    Encoding = 'GBK';
    maxsize = 0x6400000;
    part = '-part-';
    lang = {};
    action = {};
    StoreData = {};
    JSpath = document.currentScript && document.currentScript.src.split('/').slice(0, -1).join('/') + '/';
    fps = 60;
    language = navigator.language;
    constructor() {

    }
    get date() {
        return new Date();
    }
    get time() {
        return this.date.getTime();
    }
    get rand() {
        return Math.random()
    }
    get randNum() {
        return Number(this.rand.toString().slice(2))
    }
    get F() {
        return this.UTIL;
    }
    get I() {
        return this.is;
    }
    get speed() {
        return 1000 / this.fps;
    }
    set speed(fps) {
        this.fps = fps;
    }
    async getItem(store, name, version, ARG = {}) {
        if (!name) return await this.getAllData(store,1, ARG);
        let T = this, 
            F = T.F, maxsize = T.maxsize, 
            part = T.part, result = await F.dbGetItem(Object.assign({ store, name }, ARG)), 
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
                        let subResult = await F.dbGetItem(Object.assign(ARG, { store, 'name': newkey }));
                        if (subResult) returnBuf.set(subResult.contents, k * maxsize);
                        else T.Err('lost file');
                    }
                }));
                result.contents = returnBuf;
            }
            if (result && result.contents&&T.I.u8obj(result.contents)) {
                if (result.type == 'unpack') {
                    if(result.password)ARG.password = result.password;
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
        let T = this, F = T.F, maxsize = T.maxsize, part = T.part;
        data = await F.contentsSize(data, maxsize);
        if (data.contents && data.contents.byteLength > maxsize) {
            let filesize = data.contents.byteLength;
            let basecontent = {};
            F.I.toArr(data, entry => {
                if (entry[0] != 'contents') basecontent[entry[0]] = entry[1];
            });
            return await Promise.all(Array(Math.ceil(filesize / maxsize)).fill(name).map(async (v, k) => {
                let key = v, start = k * maxsize;
                if (k > 0) key += part + k;
                return await F.dbPutItem({
                    store, 'data': Object.assign({
                        'contents': new Uint8Array(data.contents.subarray(start, filesize - start >= maxsize ? start + maxsize : filesize)),
                    }, basecontent), 'name': key, dbName
                });
            }));
        }
        return await F.dbPutItem({ store, data, name, dbName });
    }
    async removeItem(store, name, ARG) {
        let { clear, dbName } = ARG || {}, T = this, F = T.F;
        if (clear) {
            let contents = await F.dbGetItem(Object.assign({ store, name }, ARG));
            if (contents && contents.filesize) {
                return await Promise.all(Array(Math.ceil(contents.filesize / T.maxsize)).fill(name.split(T.part)[0]).map(async (v, k) => {
                    let key = v;
                    if (k > 0) key += T.part + k;
                    return await F.dbRemoveItem({ store, 'name': key }) + '\n';
                }));

            }
        }
        return await F.dbRemoveItem({ store, name, dbName });
    }
    async getAllData(store, only, ARG) {
        if (!store) return {};
        return await this.F.dbGetAll(Object.assign({ store, only }, ARG));
    }
    async getContent(store, name, version, ARG) {
        let result = await this.getItem(store, name, version, ARG);
        return result && result.contents || result;
    }
    async setContent(store, name, contents, version, dbName) {
        return await this.setItem(store, name, { contents, 'timestamp': this.date, 'version': version || this.version }, dbName);
    }
    async getAllKeys(store, dbName) {
        return await this.F.dbGetKeys({ store, dbName });
    }
    async getAllCursor(store, index, only, ARG) {
        return await this.F.dbGetCursor(Object.assign({ store,index, only }, ARG));
    }
    async clearDB(tables, dbName) {
        let F = this.F;
        if (!tables) return;
        if (F.I.str(tables)) tables = [tables];
        return await F.dbRemoveTable(tables, dbName);
    }
    async deleteDB(tables, dbName) {
        let F = this.F;
        if (F.I.str(tables)) tables = [tables];
        return await F.deleteDatabase(tables, dbName);
    }
    getStore(table, dbName) {
        if (!table) return undefined;
        let T = this;
        dbName = dbName || T.DB_NAME;
        if (!T.StoreData[dbName]) T.StoreData[dbName] = {};
        let F = T.F, store = T.StoreData[dbName];
        if (!store[table]) {
            store[table] = new F.StoreDatabase(T, table, dbName);
        };
        return store[table];
    }
    async FetchItem(ARG) {
        let T = this, F = T.F, I = T.I;
        if (!ARG || I.str(ARG)) ARG = {
            'url': ARG || '/'
        };
        let urlname = F.getname(ARG.url), 
            key = ARG.key || urlname || 'index.php', 
            keyname = ARG.key == F.LibKey ? key + urlname : key, 
            result, version = ARG.version, headers = {},
            Store = ARG.store&&T.getStore(ARG.store),
            response, 
            unFile = (buf, password) => F.unFile(buf, Object.assign(ARG, {password})),
            callback = async result => {
            if (result && result.contents) {
                if (result.type == 'unpack') {
                    result = await unFile(result.contents, result.password);
                    if(result.password)delete result.password;
                }
                else result = result.contents;
            }
            ARG.success && ARG.success(result, headers);
            return result;
        };
        if (Store && !ARG.unset) {
            result = await Store.get(keyname, version, ARG);
            //console.log(result);
            if (result) {
                if (!ARG.checksize) {
                    return callback(result);
                }
            }
        }
        response = await F.FetchStart(ARG);
        headers = F.FetchHeader(response, ARG);
        let password = headers['password'] || ARG.password || undefined;
        if (response.status == 404) {
            ARG.error && ARG.error(response.statusText);
            return callback(result);
        } else if (result && result.filesize && headers["byteLength"] > 0) {
            if (result.filesize == headers["byteLength"]) {
                response.body.cancel();
                return callback(result);
            }
            result = null;
        }
        response = ARG.process ? F.StreamResponse(response, ARG) : response;
        let contents = await response[ARG.type || 'arrayBuffer'](), type = headers.type;let filesize = headers["byteLength"]||contents&&contents.length || 0,filetype = headers['content-type'];
        if (contents&&contents instanceof ArrayBuffer) {
            contents = new Uint8Array(contents.buffer || contents);
            type = 'Uint8Array';
            filesize = contents.byteLength;
        }
           
        ARG.dataOption = ARG.dataOption||{};
        if (Store && ARG.unpack && key === keyname && filesize > T.maxsize) {
            type = 'unpack';
            await Store.put(keyname, Object.assign({ contents, timestamp: new Date, filesize,filetype, version, type, password },ARG.dataOption));
            delete ARG.store;
        }
        if (ARG.unpack && I.u8obj(contents)) {
            if(ARG.Filter)contents =  ARG.Filter(contents);
            contents = await unFile(contents, password);
            if (!contents.byteLength){
                if(contents.password){
                    password = contents.password;
                    delete contents.password;
                }
                type = 'datalist';
            }
        }
        if (Store && key !== keyname) {
            if (I.u8obj(contents)) {
                contents = new File([contents], urlname, {
                    'type': ARG.mime || headers['type']
                });
                type = 'File';
            } else {
                let contents2;
                await Promise.all(I.toArr(contents).map(async entry => {
                    let [name, data] = entry, filename = name.split('/').pop(), filetype = F.gettype(filename), filedata = new File([data], filename, {
                        'type': filetype
                    });
                    F.Libjs[filename] = filedata;
                    Store.put(ARG.key + filename, Object.assign({
                        'contents': filedata, 'timestamp': T.date, 'filesize': data.byteLength, 'version': T.version, 'type': 'File'
                    },ARG.dataOption)
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
            await Store.put(keyname, Object.assign({contents, filesize,filetype, version, type ,password, timestamp: T.date},ARG.dataOption));
        }
        ARG.success && ARG.success(contents, headers);
        return contents;
    }
    ajax(ARG) {
        let T = this, I = T.I, F = T.F;
        if (I.str(ARG)) ARG = { url: ARG };
        return T.THEN((resolve, reject) => {
            const request = new XMLHttpRequest(ARG.paramsDictionary);
            request.responseType = ARG.type || "text";
            if (!ARG.error) ARG.error = reject;
            if (ARG.mime) request.overrideMimeType(ARG.mime);
            let evt = [
                'abort', 'error', 'load', 'loadend', 'loadstart', 'progress', 'readystatechange', 'timeout'
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
            let formData, url;
            ARG.get = ARG.get || {};
            ARG.get['inajax'] = T.time;
            url = I.get(ARG.url, ARG.get);
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
            if (!data) return T.action[action].call(T);
            if (T.I.array(data)) return T.action[action].apply(T, data);
            return T.action[action].call(T, data);
        } else {
            console.log('lost action:' + action);
        }
    }
    addJS(buf, cb, iscss) {
        let re = false, script = document.createElement(!iscss ? 'script' : 'link'), func = success => {
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
        if (!cb) return this.THEN((resolve, reject) => func(resolve, reject));
        else func(cb), script;

    };
    async loadScript(js) {
        let T = this, F = T.F, url = /^(\/|https?:\/\/|static\/js\/|data\/)/.test(js) ? js : this.JSpath + js, data = await T.FetchItem({ url, store: T.LibStore, key: F.LibKey, mime: F.gettype('js'), version: T.version });
        await T.addJS(data);
        return data;
    }
    async loadLibjs(name) {
        return await this.addJS(await this.F.getLibjs(name));
    }
    unFile(u8, process, ARG) {
        return this.F.unFile(u8, Object.assign({ process }, ARG));
    }
    is = new class NengeType{
        formdata = (obj) => new FormData(obj || undefined);
        formget = obj => new URLSearchParams(obj);
        get mobile() {
            return 'ontouchend' in document
        }
        /**
         * 初始化表单数据
         * @param {*} obj 表单元素/表单元素查询字符/json
         * @returns {FormData} 表单对象
         */
        post(obj) {
            let I = this, T = I.T;
            let post = I.postobj(obj) ? obj : I.formdata(I.formelm(obj) ? obj : I.str(obj) ? T.$(obj) : undefined);
            if (I.objArr(obj)) I.toArr(obj, v => post.append(v[0], v[1]));
            return post;
        }
        /**
         * 初始化URL参数
         * @param {String} url 地址
         * @param {String|JSON} get 字符/json
         * @returns {String} 地址
         */
        get(url, get) {
            let I = this, str1 = '', str2 = '', urls = url.split('?');
            if (urls[1]) str1 = I.formget(urls[1]);
            if (get) str2 = I.formget(get);
            let data = I.formget(str1 + '&' + str2).toString().replace(/^(.+?)=&/, '$1&');
            return urls[0] + (data ? '?' + data : '');
        }
        /**
         * entries数组转JSON
         * @param {*} obj 
         * @returns {JSON} JSON
         */
        toObj(obj) {
            let I = this, arr = [];
            if (I.nodemap(obj)) arr = Array.from(obj || []).map(attr => [attr.name, attr.value]);
            else if (I.postobj(obj) || I.getobj(obj)) obj.forEach((v, k) => arr.push([k, v]));
            else if (I.objArr(obj)) return obj;
            else if (I.array(obj)) arr = obj;
            else if (obj.length && obj.item) arr = Array.from(obj || []).map(val => [val, obj[val]]);
            return Object.fromEntries(arr);
        }
        arr2obj(obj) {
            let newobj = {};
            for (let i = 0; i++; i < obj.length)newobj[obj.item(i)] = newobj[obj.item(i)];
        }
        /**
         * JSON转entries
         * @param {JSON} obj 
         * @param {*} func forEach处理函数
         * @returns {Array} entries
         */
        toArr(obj, func) {
            if(!obj) return [];
            let arr = obj.length&&obj[0]?Array.from(obj):Object.entries(obj);
            if (func instanceof Function) return arr.forEach(func);
            return arr;
        }
        define(o, p, attr, bool) {
            Object.defineProperty(o, p, !bool ? attr : { get() { return attr } });
        }
        defines(o, attr, bool) {
            if (bool) return this.toArr(attr, entry => this.define(o, entry[0], entry[1], 1));
            Object.defineProperties(o, attr);
        }
        isf(o, val) {
            return o instanceof val;
        }
        tp(o, val) {
            return typeof o === val;
        }
        constructor(T) {
            let I = this;
            I.toArr({
                'blob': Blob, 'file': File, 'await': Promise, 'array': Array, 'postobj': FormData, 'getobj': URLSearchParams, 'elment': Element, 'func': Function, 'nodemap': NamedNodeMap, 'u8obj': Uint8Array, 'formelm': HTMLFormElement, 'obj': Object, 'styleobj': CSSStyleDeclaration,
            }, entry => {
                I.define(I, entry[0], {
                    value: obj => I.isf(obj, entry[1]),
                })
            });
            I.toArr({
                'objArr': 'Object', 'str': 'String',
            }, entry => {
                I.define(I, entry[0], {
                    value: obj => obj&& obj.constructor && obj.constructor.name === entry[1],
                })
            });
            I.toArr({
                'undefined': 'undefined',
            }, entry => {
                I.define(I, entry[0], {
                    value: obj => I.tp(obj, entry[1]),
                })
            });
            I.define(I, 'T', {
                get: () => T,
            })
        }
    }(this);
    UTIL = new class NengeUtil{
        Libjs = {};
        LibKey = 'script-';
        LibUrl = {};
        StreamResponse(response, ARG) {
            let num = s => Number(s), downsize = num(response.headers.get('content-length') || 0), downtext = ARG && ARG.downtext ? ARG.downtext : '进度:', havesize = 0, status = {
                done: !1, value: !1
            }, getStatus = async () => {
                status = await reader.read()
            }, reader = response.body.getReader();
            return new Response(new ReadableStream({
                async start(ctrler) {
                    while (!status.done) {
                        let speedsize = 0, statustext = '';
                        if (status.value) {
                            speedsize = num(status.value.length);
                            havesize += speedsize;
                            ctrler.enqueue(status.value);
                        }
                        if (downsize) statustext = downtext + Math.floor(havesize / downsize * 100) + '%';
                        else statustext = downtext + Math.floor(havesize * 10 / 1024) / 10 + 'KB';
                        //下载进度
                        ARG && ARG.process && ARG.process(statustext, downsize, havesize, speedsize);
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
                'byteLength': Number(headers['content-length']) || 0, 'password': headers['password'] || headers['content-password'], 'type': headers['type'] || headers['content-type'].split('/')[0],
            });
        }
        FetchStart(ARG) {
            let F = this, I = F.I, { url, get, post } = ARG || {}, data = {};
            url = I.get(ARG.url, get);
            ['headers', 'context', 'referrer', 'referrerPolicy', 'mode', 'credentials', 'redirect', 'integrity', 'cache'].forEach(val => {
                if (ARG[val] != undefined) data[val] = ARG[val];
            });
            if (post) {
                data.method = 'POST';
                data.body = I.post(post);
            }else if(ARG.json){
                
                data.method = 'POST';
                data.body = typeof ARG.json =='string'?ARG.json:JSON.stringify(ARG.json);
            }
            return fetch(url, data);
        }
        THEN = f => new Promise(f);
        async unRAR(u8, ARG) {
            let F = this, I = F.I, { process, password, src,filename} = ARG;
            if (I.blob(u8)) {
                if(u8.name)filename = u8.name;
                u8 = new Uint8Array(await u8.arrayBuffer());
            }
            src = src || 'rar.js';
            if (!F.LibUrl[src]) F.LibUrl[src] = F.URL(await F.getLibjs(src));
            let url = F.LibUrl[src], worker = new Worker(url);
            return F.THEN(complete => {
                let contents = {};
                worker.onmessage = result => {
                    let data = result.data,t = data.t;
                    if (1 === t) {
                        complete(contents);
                        result.target['terminate']();
                    } else if (2 === t) {
                        contents[data.file] = data.data;
                    } else if (4 === t && data.total > 0 && data.total >= data.current) {
                        process && process(ARG.packtext + ' ' + (data.file?F.getname(data.file):filename||'') + ' ' + Math.floor(Number(data.current) / Number(data.total) * 100) + '%', data.total, data.current);
                    }else if(-1==t){
                        console.log(result);
                        let password = prompt(F.T.getLang(data.message),ARG.password||'');
                        contents.password = password;
                        ARG.password = password;
                        worker.postMessage({password});
                    }
                }, 
                worker.onerror = error => {
                    alert('RAR/7Z解压失败!');
                    worker.close();
                    console.log(error);
                    complete(u8);
                };
                worker.postMessage(src == 'rar.js' ? {'data': u8, password} : u8);
            });

        }
        async un7z(u8, ARG) {
            ARG.src = '7z.js';
            return this.unRAR(u8, ARG);
        }
        async unZip(u8, ARG = {}) {
            let { process, password, packtext } = ARG, F = this, T = F.T;
            await F.ZipInitJS();
            let zipReader = new zip.ZipReader(F.I.blob(u8) ? new zip.BlobReader(u8) : new zip.Uint8ArrayReader(u8));
            let entries = await zipReader.getEntries({
                filenameEncoding: T.Encoding,
            }),passok=false;
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
                                opt.password = password;
                                if(!passok){
                                    while(passok){
                                        if(!opt.password){
                                            opt.password = window.prompt('need a password', opt.password || '');
                                        }
                                        try {
                                            contents[entry.filename] = await entry.getData(new zip.Uint8ArrayWriter(), opt);
                                            contents.password = opt.password;
                                            passok=true;
                                        }catch (e) {
                                            opt.password = '';
                                        }
                                    }
                                }else{
                                    contents[entry.filename] = await entry.getData(new zip.Uint8ArrayWriter(),opt);
                                }
                            }
                            return true;
                        }
                    )
                );
                zipReader.close();
                delete F.ZipPassword;
                return contents;
            } else {
                return F.I.blob(u8)?new Uint8Array(u8.arrayBuffer()):u8;
            }
        }
        async ZipCreate(password) {
            await this.ZipInitJS();
            return new zip.ZipWriter(new zip.Uint8ArrayWriter(), { password });
        }
        async ZipInitJS() {
            let F = this, T = F.T;
            if (!window.zip) await T.loadLibjs(T.Libzip);
            return true;
        }
        async ZipAddFile(files, password, ZipWriter, options, comment) {
            let F = this;
            if (!ZipWriter) ZipWriter = await F.ZipCreate(password);
            if (F.I.file(files)) await ZipWriter.add(files.name, new zip.BlobReader(files), options);
            else await Promise.all(Array.from(files).map(async file => await ZipWriter.add(file.name, new zip.BlobReader(file), options)));
            return await ZipWriter.close(comment);
        }
        async unFile(u8, ARG = {}) {
            let F = this, I = F.I;
            if (I.str(ARG)) ARG.unMode = {
                'unMode': ARG
            };
            ARG.packtext = ARG.packtext || '解压:';
            if (ARG.unMode && F[ARG.unMode]) return await F[ARG.unMode](u8, ARG);
            let action = null, u8Mime;
            if (I.blob(u8)) {
                if (u8.name) {
                    let type = u8.name.split('?')[0].split('.').pop().toLowerCase();
                    ARG.filename = u8.name;
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
            } else if (u8.buffer) {
                u8 = new Uint8Array(u8.buffer);
                u8Mime = F.checkBuffer(u8);
            } else if (IDBTransaction.array(u8)) {
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
            let F = this;
            type = F.getname(type).split('.').pop().toLowerCase();
            if (type&&!F.mime_list) {
                F.mime_list = {};
                F.I.toArr(
                    F.mime_map, entry => entry[1].forEach(m => F.mime_list[m] = entry[0] + (entry[0].includes('/') ? '' : '/' + m))
                );
            }
            return F.mime_list[type] || 'application/octet-stream';
        }
        mime_preg = {
            "7z": /^377ABCAF271C/, "rar": /^52617221/, "zip": /^504B0304/, "png": /^89504E470D0A1A0A/, "gif": /^47494638/, "jpg": /^FFD8FF/, "webp": /^52494646/, "pdf": /^255044462D312E/,
        };
        mime_map = {
            'text/javascript': ['js'], 'text/css': ['css', 'style'], 'text/html': ['html', 'htm', 'php'], 'text/plain': ['txt'], 'text/xml': ['xml', 'vml', 'svg'], 'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'], 'application': ['pdf'], 'application/x-zip-compressed': ['zip'], 'application/x-rar-compressed': ['rar'], 'application/x-7z-compressed': ['7z']
        };
        checkBuffer(u8, defalut) {
            let head = Array.from(u8.slice(0, 8)).map(v => v.toString(16).padStart(2, 0).toLocaleUpperCase()).join('');
            if (head) {
                let result = this.I.toArr(this.mime_preg).filter(entry => entry[1].test(head))[0];
                if (result) return result[0];
            }
            return defalut || 'unkonw';
        }
        URL(u8, type) {
            let F = this, I = F.I;
            if (I.u8obj(u8)) {
                if (!type) type = F.gettype(F.checkBuffer(u8));
            } else if (I.str(u8)) {
                if (/^(blob|http)/.test(u8) || /^\/?[\w\-_\u4e00-\u9FA5:\/\.\?\^\+ =%&@#~]+$/.test(u8)) return u8;
                if (!type) type = F.gettype('js');
            }
            return window.URL.createObjectURL(I.blob(u8) ? u8 : new Blob([u8], { 'type': type }));
        }
        removeURL(url) {
            return window.URL.revokeObjectURL(url);
        }
        download(name, buf, type) {
            let I = this.I, href;
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
        StoreList = {};
        get idb() {
            return window.indexedDB || window.webkitindexedDB;
        }
        dbSetMap(ARG) {
            let F = this, I = F.I, T = F.T, info = F.dbMap || {};
            if (info && !info[F.dbname]) {
                info[F.dbname] = T.DB_STORE_MAP;
            }
            let store = ARG.store;
            if (store) {
                let dbName = ARG.dbName || F.dbname;
                if (dbName && !info[dbName]) info[dbName] = {};
                if (store && !info[dbName][store]) {
                    info[dbName][store] = {};
                    let dbIndex = ARG.dbIndex;
                    if (dbIndex) {
                        if (I.str(dbIndex)) info[dbName][store][dbIndex] = false;
                        else Object.assign(info[dbName][store], dbIndex);
                    }
                }
            }
            if (!F.dbMap) F.dbMap = info;
            return info;

        }
        async dbLoad(ARG) {
            ARG = ARG||{};
            let F = this, dbName = ARG.dbName || F.dbname, store = ARG.store, db = F.StoreList[dbName];
            if (store && F.dbCheckTable(ARG.store, db)) {
                return db;
            } else if (!store && db) return db;
            ARG.dbName = dbName;
            await F.dbInstall(F.dbSetMap(ARG));
            return F.StoreList[dbName];
        }
        async dbInstall(info) {
            let F = this, I = F.I;
            console.log('install indexDB', info);
            return await Promise.all(I.toArr(info).map(async infoItem => {
                let [dbName, dbStore] = infoItem, db = F.StoreList[dbName], version;
                if (db) {
                    let notTable = I.toArr(dbStore).filter(v => !F.dbCheckTable(v[0], db));
                    if (!notTable.length) return 'ok';
                    version = db.version + 1;
                    db.close();
                    delete F.StoreList[dbName];
                }
                let dblist = Object.keys(dbStore);
                F.StoreList[dbName] = await F.dbOpen(
                    dbName, dbStore, version, {
                    async success(db, resolve) {
                        if (F.dbCheckTable(dblist, db) != dblist.length) {
                            version = F.dbClose(db);
                            return resolve(await F.dbOpen(dbName, dbStore, version));
                        }
                        return resolve(db);
                    }
                }
                );
                return dbName;
            }));
        }
        async dbOpen(dbName, dbStore, version, opt) {
            let F = this;
            return F.THEN((resolve, reject) => {
                let req = F.idb.open(dbName, version);
                req.addEventListener('error', async err => {
                    console.log(err, req.error);
                    reject(err);
                });
                req.addEventListener('upgradeneeded', async e => {
                    let db = req.result;
                    if (opt && opt.upgradeneeded) {
                        await opt.upgradeneeded.apply(req, [db]);
                    } else if (dbStore) {
                        await F.dbCreateObject(dbStore, db);
                    }
                });
                req.addEventListener('success', async e => {
                    let db = req.result;
                    if (opt && opt.success) {
                        return await opt.success(db, resolve)
                    }
                    resolve(db);
                });
            });
        }
        async dbCreateObject(dbStore, db) {
            if (!dbStore || !db) return;
            let F = this, I = F.I;
            await Promise.all(
                I.toArr(dbStore).map(
                    async tableStore => {
                        let [storeName, storeData] = tableStore;
                        if (!F.dbCheckTable(storeName, db)) {
                            let storeObj = await db.createObjectStore(storeName);
                            if (storeData) {
                                I.toArr(storeData, entry => storeObj.createIndex(
                                    entry[0], entry[1] && entry[1].key || entry[0], entry[1] && entry[1].options || entry[1] || { 'unique': false }
                                )
                                )
                            }
                        }
                    }
                )
            );
        }
        dbCheckTable(list, db, len) {
            if (!db) return 0;
            if (this.I.str(list)) list = [list];
            list = list ? list.filter(v => db.objectStoreNames.contains(v)) : [];
            if (len) return list;
            return list.length;
        }
        async contentsSize(data, maxsize) {
            let I = this.I;
            if (I.await(data)) data = await data;
            let contents = data.contents || data, result = {};
            if (I.str(contents) && contents.length > maxsize) {
                contents = new TextEncoder().encode(contents);
                Object.assign(result, { contents, filesize: contents.byteLength, 'type': 'String', });
            } else if (I.blob(contents) && contents.size > maxsize) {
                Object.assign(result, {
                    'contents': new Uint8Array(await contents.arrayBuffer()), 'filetype': contents.type, 'filesize': contents.size, 'filename': contents.name, 'type': 'File'
                });
            } else if (contents.byteLength && contents.byteLength > maxsize) {
                if (contents.__proto__.constructor != Uint8Array) contents = new Uint8Array(contents.buffer || contents);
                Object.assign(result, {
                    contents, 'filesize': contents.byteLength, 'type': 'Uint8Array'
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
            if (data.contents) ['version', 'password'].forEach(val => !data[val] && (delete data[val]));
            return data;
        }
        async dbSelect(ARG, ReadMode) {
            let F = this, T = F.T;
            if (F.I.str(ARG)) ARG = { 'store': ARG };
            let store = ARG.store, db = await F.dbLoad(ARG);
            ReadMode = ReadMode ? "readonly" : "readwrite";
            if (!store) store = db.objectStoreNames[0];
            let tdb = db.transaction([store], ReadMode);
            tdb.onerror = e => {
                e.preventDefault();
                throw tdb.error;
            };
            return tdb.objectStore(store);
        }
        async dbGetItem(ARG) {
            if (this.I.str(ARG)) ARG = {
                'name': ARG
            };
            let name = ARG.name, DB = await this.dbSelect(ARG, !0);
            if (name) return this.THEN(resolve => {
                DB.get(name).onsuccess = e => resolve(e.target.result);
            });
        }
        async dbPutItem(ARG) {
            let { data, name } = ARG || {}, DB = await this.dbSelect(ARG);
            return this.THEN(resolve => {
                DB.put(data, name).onsuccess = e => resolve(e.target.result);
            });
        }
        async dbRemoveItem(ARG) {
            if (this.I.str(ARG)) ARG = {
                'name': ARG
            };
            let name = ARG.name, DB = await this.dbSelect(ARG);
            if (name) return this.THEN((resolve, reject) => {
                DB.delete(name).onsuccess = e => resolve(`delete:${name}`);
            });
        }
        async dbGetAll(ARG) {
            let F = this, T = F.T, DB = await F.dbSelect(ARG, !0);
            return F.THEN(callback => {
                let entries = {};
                if(ARG.index)DB = DB.index(ARG.index);
                DB.openCursor(ARG.Range).onsuccess = evt => {
                    let cursor = evt.target.result;
                    if (cursor) {
                        if (ARG.only === true && T.part && T.maxsize && F.I.u8obj(cursor.value.contents) && cursor.value.filesize > T.maxsize) {
                            let skey = cursor.primaryKey.split(T.part), newkey = skey[0], index = skey[1] || 0;
                            if (!entries[newkey]) {
                                let contents = new Uint8Array(cursor.value.filesize);
                                contents.set(cursor.value.contents, index * T.maxsize);
                                delete cursor.value.contents;
                                entries[newkey] = Object.assign(cursor.value, { contents })
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
        async dbGetKeys(ARG) {
            if (this.I.str(ARG)) ARG = { 'dbName': ARG };
            let DB = await this.dbSelect(ARG, !0);
            return this.THEN(resolve => {
                DB.getAllKeys().onsuccess = e => {
                    resolve(e.target.result)
                };
            });

        }
        async dbGetCursor(ARG) {
            if (this.I.str(ARG)) ARG = { 'index': ARG };
            let index = ARG.index, F = this, T = F.T, DB = await F.dbSelect(ARG, !0), len = DB.indexNames.length;
            if (len && !index) {
                index = DB.indexNames[0];
            } else if (!len) {
                return F.dbGetKeys(ARG);
            }
            return F.THEN(resolve => {
                let entries = {};
                DB.index(index).openKeyCursor(ARG.Range).onsuccess = evt => {
                    let cursor = evt.target.result;
                    if (cursor) {
                        //console.log(cursor);
                        if (ARG.only !== true || T.part && !cursor.primaryKey.includes(T.part)) {
                            entries[cursor.primaryKey] = Object.fromEntries([[index, cursor.key]]);
                        }
                        cursor.continue()
                    } else {
                        resolve(entries)
                    }
                }
            })

        }
        async dbRemoveTable(tables, dbName) {
            if (this.I.str(tables)) tables = [tables];
            return await Promise.all(tables.map(async store => {
                let DB = await this.dbSelect({ store, dbName });
                DB.clear();
            }));
        }
        dbClose(dbName) {
            let isStr = this.I.str(dbName), db = isStr ? F.StoreList[dbName] : dbName;
            if (db) {
                let version = db.version + 1;
                db.close();
                if (isStr) delete F.StoreList[dbName]
                return version;
            }
            return undefined;
        }
        async deleteDatabase(tables, dbName) {
            let F = this;
            dbName = dbName || F.dbname;
            if (!tables) return F.idb.deleteDatabase(dbName || F.dbname);
            let db = F.StoreList[dbName] || await F.dbOpen(dbName);
            if (db && !F.dbCheckTable(tables, db)) return 'ok';
            let version = F.dbClose(db);
            delete F.StoreList[dbName];
            return await F.dbOpen(dbName, null, version, {
                upgradeneeded(db) {
                    db.deleteObjectStore(tables);
                }, success(db, resolve) {
                    F.close(db);
                    resolve('ok');
                }
            });
        }
        StoreDatabase = class {
            constructor(T, table, dbName) {
                let I = T.I;
                I.defines(this, { T, table, dbName }, 1);
                ['getItem', 'setItem', 'removeItem', 'getAllData', 'getContent', 'setContent', 'getAllKeys', 'getAllCursor', 'clearDB', 'deleteDB'].forEach(val => {
                    I.define(this, val, {
                        value: function () {
                            let arr = [this.table].concat(Array.from(arguments));
                            return this.T[val].apply(this.T, arr);
                        }
                    })
                });
            }
            setName(ARG) {
                let D = this, dbName = D.dbName;
                if (!ARG || D.T.I.str(ARG)) ARG = { dbName };
                else ARG.dbName = dbName;
                return ARG;
            }
            get(name, version, ARG) {
                ARG = this.setName(ARG);
                return this.getItem(name, version, ARG);
            }
            put(name, data) {
                return this.setItem(name, data, this.dbName);
            }
            remove(name, ARG) {
                ARG = this.setName(ARG);
                return this.removeItem(name, ARG);
            }
            data(name, version, ARG) {
                return this.load(name, version, ARG);
            }
            load(name, version, ARG) {
                ARG = this.setName(ARG);
                return this.getContent(name, version, ARG);
            }
            save(name, data, version) {
                return this.setContent(name, data, version, this.dbName);
            }
            keys() {
                return this.getAllKeys(this.dbName);
            }
            cursor(key, only, ARG) {
                ARG = this.setName(ARG);
                return this.getAllCursor(key, only, ARG);
            }
            all(only, ARG) {
                ARG = this.setName(ARG);
                return this.getAllData(only, ARG);
            }
            clear() {
                return this.clearDB(this.dbName);
            }
            delete() {
                return this.deleteDB(this.dbName);
            }
        };
        async getLibjs(file) {
            let F = this, T = F.T;
            if (F.Libjs[file]) return F.Libjs[file];
            let contents = await T.getStore(T.LibStore).data(F.LibKey + file, T.version);
            if (!contents) {
                if (!window.zip) contents = await T.loadScript(T.Libzip);
                if (file != T.Libzip) {
                    contents = await T.FetchItem({
                        url: T.JSpath + T.LibPack, 'store': T.LibStore, 'key': F.LibKey, 'unpack': true, 'filename': file
                    });
                }
            }
            if (file == 'rar.js') {
                let memurl = F.URL(await F.getLibjs('rar.mem'));
                let rarurl = F.URL(contents);
                contents = `var dataToPass=[],password,Readyfunc,isReady = new Promise(res=>Readyfunc=res);;self.Module={locateFile:()=>'` + memurl + `',monitorRunDependencies:function(t){0 == t && setTimeout(()=>Readyfunc(),100);},onRuntimeInitialized:function(){}};
                importScripts('` + rarurl + `');let unrar=function(t,e){let n=readRARContent(t.map((function(t){return{name:t.name,content:new Uint8Array(t.content)}})),e,(function(t,e,n){postMessage({t:4,current:n,total:e,name:t})})),o=function(t){if("file"===t.type)postMessage({t:2,file:t.fullFileName,size:t.fileSize,data:t.fileContent});else{if("dir"!==t.type)throw"Unknown type";Object.keys(t.ls).forEach((function(e){o(t.ls[e])}))}};return o(n),postMessage({t:1}),n};onmessage=async (message)=>{if(message.data.data)dataToPass.push({name:"test.rar",content:message.data.data});if(message.data.password)password=message.data.password;isReady.then(e=>unrar(dataToPass,password||undefined)).catch(message=>{if(['Uncaught Missing password','Missing password'].includes(message))return postMessage({t:-1,message})});};`;
                F.Libjs[file] = new File([contents], file, {
                    'type': F.gettype('js'), 'x-content-type-options': 'nosniff'
                });
            } else if (contents) {
                F.Libjs[file] = contents;
            }
            return F.Libjs[file];
        }
        get dbname(){
            return this.T.DB_NAME;
        }
        constructor(T) {
            let F = this, I = T.I;
            I.defines(F, { I, T},1);
        }
    }(this);
    on(elm, evt, fun, opt, cap) {
        elm = this.$(elm); if (!elm) return;
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
            passive: false, once: true
        }, cap);
    }
    docload(f) {
        let d = document;
        return this.THEN(complete => {
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
    $(e, f) {
        let T = this, I = T.I, d = f || document;
        return e ? I.str(e) ? d.querySelector(e) : I.func(e) ? T.docload(e) : e : undefined;
    }
    $$(e, f) {
        return (f || document).querySelectorAll(e);
    }
    $ce(e) {
        return document.createElement(e);
    }
    $ct(e,txt){
        let elm = this.$ce(e);
        elm.innerHTML = txt;
        return elm;
    }
    $add(e, c) {
        return e.classList.add(c), e;
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
                T.runaction('TAG-' + this.tagName, [this, 'attribute', { name, oldValue, newValue }]);
            }
            disconnectedCallback() {
                /*custom element 文档 DOM 节点上移除时被调用*/
                T.runaction('TAG-' + this.tagName, [this, 'disconnect']);
            }
        });
    }
    attr(e, s) {
        return this.$(e).getAttribute(s);
    }
    docElm(str, mime) {
        return new DOMParser().parseFromString(str, mime || 'text/html');
    }
    fragment() {
        return new DocumentFragment();
    }
    Err(msg) {
        throw new Error(msg);
    }
    triger(target, type, evtdata) {
        if (!evtdata) evtdata = { target };
        else if (!evtdata.target) evtdata.target = target;
        return this.dispatch(target, new Event(type, evtdata));

    }
    dispatch(obj, evt) {
        if (!obj) return evt;
        return this.$(obj).dispatchEvent(evt);
    }
    down(name, buf, type) {
        return this.F.download(name, buf, type);
    }
    stopEvent = e => {
        e.preventDefault();
    }
    stopProp = e => {
        e.preventDefault();
        e.stopPropagation();
    }
    stopGesture(elm) {
        let T = this;
        //禁止手势放大
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(v => T.on(elm, v, e => T.stopEvent(e)));
    }
    async battery(ARG) {
        const battery = await navigator.getBattery();
        ['chargingchange', 'levelchange', 'chargingtimechange', 'dischargingtimechange'].forEach(
            //充电更改事件
            //更新电池电量
            //更新电池充电时间
            //更新电池放电时间
            val => ARG.val && this.on(battery, val, e => this.runaction(ARG.val, [e, battery]))
        );
    }
    getLang(name){
        if(this.lang&&this.lang[name])return this.lang[name];
        return name;
    }
    THEN(f) {
        return new Promise(f);
    }
    /*
    mouse(type,opt,obj){
        return this.dispatch(obj,new MouseEvent(type,opt));
    }
    touch(type,opt,obj){
        return this.dispatch(obj,new TouchEvent(type,opt));
    }
    keyboard(type,opt,obj){
        return this.dispatch(obj,new KeyboardEvent(type,opt));
    }
    force(type,opt,elm){
        this.mouse('webkitmouseforce'+type,opt,elm);
    }
    capture(track){
        //await  imageCapture.takePhoto()
        return new ImageCapture(track);
    }
    vibrate(duration){
        navigator.vibrate(duration||200);
    }
    */
};
const Nttr = (obj) =>{
 let T = Nenge,elm = T.$(obj);
 return elm?!elm.Nttr ? new class {
    constructor(obj,T) {
        let Nttr = this,I = T.I;
        I.defines(Nttr, { T, I,obj}, 1);
        I.defines(obj, { Nttr }, 1);
    }
    eventList = {};
    get cList() {
        return this.obj.classList;
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
    get hidden() {
        return this.obj.hidden;
    }
    set hidden(bool) {
        this.obj.hidden = bool;
        return this;
    }
    get attrs() {
        return this.getAttrs();
    }
    set attrs(obj) {
        this.setAttrs(obj);
        return this;
    }
    get css() {
        return this.obj.style.cssText;
    }
    set css(text) {
        return this.obj.style.cssText = text;
    }
    get style() {
        return this.I.toObj(this.obj.style);
    }
    set style(data) {
        if (this.I.str(data)) return this.css = data;
        Object.assign(this.obj.style, data);
    }
    html(str){
        if(str!=undefined)this.obj.innerHTML = str;
        return this.obj.innerHTML;
    }
    $(str) {
        return this.obj.querySelector(str);
    }
    $$(str) {
        return this.obj.querySelectorAll(str);
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
    addClass(str){
        this.cList.add(str);
        return this;
    }
    addChild(obj){
        this.obj.appendChild(obj);
        return this;
    }
    on(evt, func, opt) {
        let N = this;
        if (!N.eventList[evt]) N.eventList[evt] = [];
        N.eventList[evt].push({ func, opt });
        return N.T.on(N.obj, evt, func, opt), N;
    }
    un(evtname, evtfunc) {
        let N = this;
        if (N.eventList[evtname]) {
            let newlist = [];
            N.eventList[evtname].forEach(val => {
                let { func, opt } = val;
                if (evtfunc && evtfunc != func) {
                    newlist.push(val);
                    return
                }
                N.removeEvent(evtname, func, opt);
            });
            N.eventList[evtname] = [];
            if (newlist.length > 0) N.eventList[evtname] = newlist;
        } else {
            N.I.toArr(N.eventList, entry => {
                entry[1].forEach(val => {
                    let { func, opt } = val;
                    N.removeEvent(entry[0], func, opt);
                });
                delete N.eventList[entry[0]];
            });
        }
        return N;
    }
    once(evt, func, cap) {
        return this.T.once(this.obj, evt, func, cap), N;
    }
    removeEvent(evt, func, opt) {
        return this.T.un(this.obj, evt, func, opt);
    }
    triger(type) {
        let N = this;
        if (N.eventList[type]) N.eventList[type].forEach(val => val.func.call(N.obj, { target: N.obj }));
        else N.T.triger(N.obj, type);
    }
    dispatch(evt) {
        this.obj.dispatchEvent(evt);
    }
    bind(opt, evt) {
        let N = this, T = N.T, I = N.I, type = evt || 'pointerup';
        I.toArr(opt, entry => T.on(N.$(entry[0], this.obj), type, entry[1]));
    }
    click(func, evt) {
        let N = this, type = evt || 'pointerup';
        if (func) N.un(type), N.on(type, func);
        else N.triger(type);
        return N;
    }
    getBoundingClientRect(){
        return this.obj.getBoundingClientRect();
    }
    remove(){
        this.un();
        this.obj.remove();
    }
}(elm,T) : elm.Nttr:undefined;
}
const N = new class {
    constructor(T) {
        let I = T.I;
        I.defines(this, { I, T }, 1);
    }
    name(name, bool) {
        return (!bool ? '.' : '') + 'Nenge-ui-' + name;
    }
    mask(obj) {
        let N = this, T = this.T, mask = T.$(N.name('mask')), maskobj;
        if (!mask || !mask.Nttr) {
            if (!mask) {
                mask = T.$add(T.$ce('div'), N.name('mask', 1));
                document.body.appendChild(mask);
            }
            maskobj = Nttr(mask);
            maskobj.click(e => {
                if(e.target!=mask) return;
                maskobj.hidden = true;
                if (maskobj.evtobj instanceof Element) {
                    Nttr(maskobj.evtobj).hidden = true;
                    delete maskobj.evtobj;

                }
            }).hidden = true;
        }
        if(obj){
            Nttr(mask).hidden = false;
            Nttr(mask).evtobj = obj;
        }
        return mask;
    }
    alert(message) {
        let N = this, T = this.T, alertobj = T.$(N.name('alert'));
        if(!alertobj){
            let Alert = new nWindow();
            Alert.addClass(N.name('alert',1));
            alertobj = T.$(N.name('alert'));
            alertobj.Alert = Alert;
        }
        alertobj.Alert.setBody(message);
    }

}(Nenge);
class nWindow {
    constructor(opt){
        let T = Nenge,I=T.I;
        T.I.defines(this,{T,I},1);
        this.Nttr = Nttr(T.$add(T.$ce('div'),N.name('window',1)));
        this.Nttr.hidden=true;
        T.I.defines(this,{obj:this.Nttr.obj},1);
        N.mask().appendChild(this.obj);
        Object.assign(this,opt||{});
        this.init();
    }
    get hidden(){
        return this.Nttr.hidden;
    }
    set hidden(bool){
        this.Nttr.hidden = bool;
    }
    show(){
        this.hidden = false;
        return N.mask(this.obj);
    }
    addClass(str){
        this.Nttr.addClass(str);
    }
    setBody(message){
        this.Nttr.$('.card-body').innerHTML = message;
        return this.show();
    }
    init(){
        this.Nttr.html('<div class="card-header"></div><div class="card-body"></div><div class="card-footer"></div>');
        ['header','body','footer'].forEach(val=>this[val]&&(this.T.$('.card-'+val,this.obj).innerHTML = this[val]));


    }
}