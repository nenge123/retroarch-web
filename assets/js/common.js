const Nenge = new class NengeCores {
    version = 1;
    DB_NAME = 'XBBS';
    DB_STORE_MAP = {
        'data-js': { 'timestamp': false },
        'data-file': {},
        'avatar': { 'timestamp': false },
        'forumsicon': { 'timestamp': false },
        'document': { 'timestamp': false },
    };
    Libzip = 'zip.min.js';
    LibStore = 'data-js';
    Encoding = 'GBK';
    maxsize = 0x6400000;
    part = '-part-';
    lang = {};
    action = {};
    StoreData = {};
    JSpath = document.currentScript && document.currentScript.src.split('/').slice(0, -1).join('/') + '/';
    fps = 59;
    language = navigator.language;
    constructor() {
        this.on(window, 'error', e => {
            //debug
            alert(e.message);
        });
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
    get speed() {
        return 1000 / this.fps;
    }
    set speed(fps) {
        this.fps = fps;
    }
    async getItem(store, name, version, ARG = {}) {
        if (!name) return await this.getAllData(store, 1, ARG);
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
            if (result && result.contents && T.I.u8obj(result.contents)) {
                if (result.type == 'unpack') {
                    if (result.password) ARG.password = result.password;
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
    async setContent(store, name, contents, opt, dbName) {
        let data = Object.assign(opt || {}, { contents, 'timestamp': this.date });
        return await this.setItem(store, name, data, dbName);
    }
    async getAllKeys(store, dbName) {
        return await this.F.dbGetKeys({ store, dbName });
    }
    async getAllCursor(store, index, only, ARG) {
        return await this.F.dbGetCursor(Object.assign({ store, index, only }, ARG));
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
        if (table instanceof T.F.StoreDatabase) return table;
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
            Store = ARG.store && T.getStore(ARG.store),
            response,
            unFile = (buf, password) => F.unFile(buf, Object.assign(ARG, { password })),
            callback = async result => {
                if (result && result.contents) {
                    if (result.type == 'unpack') {
                        result = await unFile(result.contents, result.password);
                        if (result.password) delete result.password;
                    }
                    else result = result.contents;
                }
                ARG.success && ARG.success(result, headers);
                return result;
            };
        //delete ARG.store;
        if (Store && !ARG.unset) {
            console.log(keyname);
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
        headers.url = response.url;
        let password = headers['password'] || ARG.password || undefined;
        if (response.status == 404) {
            response.body.cancel();
            ARG.error && ARG.error(response.statusText);
            return callback(result);
        } else if (result && result.filesize && headers["byteLength"] > 0) {
            if (result.filesize == headers["byteLength"]) {
                response.body.cancel();
                return callback(result);
            }
            result = null;
        } else if (ARG.type == 'head') {
            console.log(response.url);
            response.body.cancel();
            return callback(headers);
        }
        response = ARG.process ? await F.StreamResponse(response, ARG) : response;
        if(ARG.unpack)ARG.type = 'arrayBuffer'; 
        ARG.type = ARG.type || 'arrayBuffer';
        let contents = await response[ARG.type]();
        let type = headers.type, filesize = headers["byteLength"] || 0, filetype = headers['content-type'];
        if (ARG.type == 'arrayBuffer' && contents instanceof ArrayBuffer) {
            contents = new Uint8Array(contents);
            if (ARG.Filter) contents = ARG.Filter(contents);
            type = 'Uint8Array';
            filesize = contents.byteLength;
        }
        ARG.dataOption = ARG.dataOption || {};
        if (Store && ARG.unpack && key === keyname && filesize > T.maxsize) {
            type = 'unpack';
            await Store.put(keyname, Object.assign({ contents, timestamp: new Date, filesize, filetype, version, type, password }, ARG.dataOption));
            Store = null;
        }
        if (ARG.unpack && I.u8obj(contents)) {
            contents = await unFile(contents, password);
            if (!contents.byteLength) {
                if (contents.password) {
                    password = contents.password;
                    delete contents.password;
                }
                type = 'datalist';
            }
        }
        if (Store && key !== keyname) {
            console.log(type,ARG.type);
            if (I.u8obj(contents)) {
                contents = F.getFileText(contents,ARG.decode,ARG.mime || headers['content-type'] || F.gettype(''),urlname);
                type = 'File';
            } else if (I.str(contents)) {
                type = headers['content-type'] || 'String';
            } else if(type =='datalist'){
                let contents2;
                await Promise.all(I.toArr(contents).map(async entry => {
                    let [name, data] = entry,
                        filename = name.split('/').pop(),
                        filetype = F.gettype(filename),
                        filedata = F.getFileText(data,ARG.decode,filetype,filename);
                    F.Libjs[filename] = filedata;
                    Store.put(ARG.key + filename, Object.assign({
                        'contents': filedata, 'timestamp': T.date, 'filesize': data.byteLength, 'version': T.version,filetype,'type':filedata instanceof Blob? 'File':'String'
                    }, ARG.dataOption)
                    );
                    if (ARG.filename == filename) {
                        contents2 = filedata;
                    }
                    return true;
                }));
                if (contents2) contents = contents2;
                contents2 = null;
                Store = null;
            }
        }else if(ARG.decode){
            contents = F.getFileText(contents,ARG.decode,type);
            if(I.str(contents)){
                type = 'String';
            }
        }
        if (Store) {
            await Store.put(keyname, Object.assign({ contents, filesize, filetype, version, type, password, timestamp: T.date }, ARG.dataOption));
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
            if (ARG.mime) request.overrideMimeType(ARG.mime);
            let evt = [
                'abort', 'load', 'loadend', 'loadstart', 'progress', 'readystatechange', 'timeout'
            ];
            evt.forEach(val => ARG[val] && T.on(request, val, e => ARG[val](e, request)));
            T.on(request,'error',e=>{
                ARG.error&&ARG.error(e);
                reject(e);
            });
            if (!ARG.readystatechange) {
                T.on(request, 'readystatechange', event => {
                    if(request.readyState==4){
                        if (request.status == 500) {
                            request.dispatchEvent(new ErrorEvent('error', {
                                message: request.response
                            }));
                            throw request.response;
                        }
                        ARG.success && ARG.success(request.response, request.status, request, event);
                        resolve(request.response);
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
        if (T.action[action] instanceof Function) {
            if (typeof data =='undefined' || data==null) return T.action[action].call(T);
            if (data&&T.I.array(data)) return T.action[action].apply(T, data);
            return T.action[action].call(T,data);
        } else {
            console.log('lost action:' + action,data);
        }
    }
    addJS(buf, cb, iscss,id) {
        let T = this,F=T.F;
            if(id&&T.$('#link_'+id))return;
        let re = false, script = T.$ce(!iscss ? 'script' : 'link'), func = callback => {
            if (!/^(blob:)?https?:\/\//.test(buf) && !/(\.js$|\.css$)/.test(buf)) {
                re = true;
                buf = F.URL(buf, F.gettype(!iscss ? 'js' : 'css'));
            }
            
            if (iscss) {
                script.type = F.gettype('css');
                script.href = buf;
                script.rel = "stylesheet";
            } else {
                script.type = F.gettype('js');
                script.src = buf;
            }
            if(id)script.setAttribute('id','link_'+id);
            script.onload = e => {
                callback && callback(e);
                if (re) F.removeURL(buf);
                buf = null;
                if(!iscss)script.remove();
            };
            document[!iscss ? 'body' : 'head'].appendChild(script);
        };
        if (!cb) return this.THEN((resolve, reject) => func(resolve, reject));
        else return func(cb), script;

    };
    async loadScript(js,ARG,bool) {
        ARG = ARG||{};
        let T = this, F = T.F;
        ARG.url = F.getpath(js);
        if(bool){
            ARG.type = 'text';
        }else{
            if(!ARG.store)ARG.store = T.LibStore;
            if(!ARG.key)ARG.key = F.LibKey;
            ARG.version = ARG.version || T.version;
            if(ARG.process){
                let process = ARG.process;
                ARG.process&&(e=>process(`${T.getLang('installJS')}:${js} - ${e}`))
            }
        }
        let data = await T.FetchItem(ARG);
        if(!bool){
            return await T.addJS(data); 
        }
        return data;
    }
    async getScript(js,ARG){
        return this.loadScript(js,ARG,!0);
    }
    async addScript(js,ARG){
        return await T.addJS(await T.getScript(js,ARG));
    }
    async loadLibjs(name) {
        return await this.addJS(await this.F.getLibjs(name));
    }
    unFile(u8, process, ARG) {
        return this.F.unFile(u8, Object.assign({ process }, ARG||{}));
    }
    I = new class NengeType {
        formdata = (obj) => new FormData(obj || undefined);
        formget(obj){
            return new URLSearchParams(obj);
        }
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
            if(obj instanceof HTMLFormElement) obj = I.formdata(obj);
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
            if (!obj) return [];
            let arr = obj.length && obj[0] ? Array.from(obj) : Object.entries(obj);
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
        textdecode(u8, charset) {
            return new TextDecoder(charset || 'utf8').decode(u8);
        }
        toJson(post) {
            if (this.u8obj(post)) post = this.textdecode(post);
            return JSON.stringify(typeof post == 'string' ? (new Function('return ' + post))() : post);
        }
        constructor(T) {
            let I = this,func="";
            I.define(I, 'T', {get: () => T,})
            I.toArr({
                'blob': 'Blob', 'file': 'File', 'await': 'Promise', 'array': 'Array', 'postobj': 'FormData', 'getobj': 'URLSearchParams', 'elment': 'Element', 'func': 'Function', 'nodemap': 'NamedNodeMap', 'u8obj': 'Uint8Array', 'formelm': 'HTMLFormElement', 'obj': 'Object', 'styleobj': 'CSSStyleDeclaration',
            }, entry => {
                func += `I.define(I,'${entry[0]}',{value(obj){return obj instanceof ${entry[1]};}});`;
            });
            I.toArr({
                'objArr': 'Object', 'str': 'String',
            }, entry => {
                func += `I.define(I,'${entry[0]}',{value(obj){return obj && obj.constructor && obj.constructor.name === '${entry[1]}';}});`;
            });
            I.toArr({
                'undefined': 'undefined',
            }, entry => {
                func +=`I.define(I,'${entry[0]}',{value(obj){return this.tp(obj,'${entry[1]}');}});`;
            });
            (new Function('I',func))(I);
        }
    }(this);
    UTIL = new class NengeUtil {
        Libjs = {};
        LibKey = 'script-';
        LibUrl = {};
        async StreamResponse(response, ARG) {
            let num = s => Number(s), downsize = num(response.headers.get('content-length') || 0), downtext = ARG && ARG.downtext ? ARG.downtext : '进度:', havesize = 0, status = {
                done: !1, value: !1
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
                        status = await reader.read();
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
                'type': headers['type'] || headers['content-type'].split('/')[1].split('+')[0],
            });
        }
        async FetchStart(ARG) {
            let F = this, I = F.I, { url, get, post } = ARG || {}, data = {};
            url = I.get(ARG.url, get); data.headers = {};
            ['headers', 'context', 'referrer', 'referrerPolicy', 'mode', 'credentials', 'redirect', 'integrity', 'cache'].forEach(val => {
                if (ARG[val] != undefined) data[val] = ARG[val];
            });
            /**
             * @var post 表单数据 
             */
            if (ARG.json) {
                data.body = JSON.stringify(ARG.json);
                delete ARG.json;
                data.headers['Accept'] = "application/json";
                data.method = 'POST';
            }else if (post) {
                data.method = 'POST';
                /**
                 * @var accent:mixed 发送JSON数据
                 */
                let accept = (data.headers['accept'] || data.headers['Accept'] || '').toLowerCase();
                if (/(\+|\/)json/.test(accept)) {
                    //ARG.type = 'json';
                    data.body = I.toJson(post);
                    //data.headers['Content-Type'] ="application/json;charset="+(F.T.attr('meta[charset]','charset')||'utf-8');
                } else if (ARG.accept) {
                    data.headers['Accept'] = ARG.accept;
                    data.body = post;
                } else {
                    data.body = I.post(post);
                }
            }
            //else if (ARG.type == 'json') {
            //    data.headers['Accept'] = "application/json";
            //}
            return fetch(url, data).catch(v => { console.log(v); throw v });
        }
        THEN = f => new Promise(f);
        async unRAR(u8, ARG,src) {
            let F = this, I = F.I, { process, password, filename } = ARG;
            if (I.blob(u8)) {
                if (u8.name) filename = u8.name;
                u8 = new Uint8Array(await u8.arrayBuffer());
            }
            src = src || 'extractrar.zip';
            if (!F.LibUrl[src]) F.LibUrl[src] = F.URL(await F.getLibjs(src,process));
            let url = F.LibUrl[src], worker = new Worker(url);
            return F.THEN(complete => {
                let contents = {};
                worker.onmessage = result => {
                    let data = result.data, t = data.t;
                    if (1 === t) {
                        complete(contents);
                        result.target['terminate']();
                    } else if (2 === t) {
                        contents[data.file] = data.data;
                    } else if (4 === t && data.total > 0 && data.total >= data.current) {
                        process && process(ARG.packtext + ' ' + (data.file ? F.getname(data.file) : filename || '') + ' ' + Math.floor(Number(data.current) / Number(data.total) * 100) + '%', data.total, data.current);
                    } else if (-1 == t) {
                        console.log(result);
                        let password = prompt(F.T.getLang(data.message), ARG.password || '');
                        contents.password = password;
                        ARG.password = password;
                        worker.postMessage({ password });
                    }
                },
                    worker.onerror = error => {
                        alert('RAR/7Z解压失败!');
                        worker.close();
                        console.log(error);
                        complete(u8);
                    };
                worker.postMessage({ 'contents': u8, password });
            });

        }
        async un7z(u8, ARG) {
            return this.unRAR(u8, ARG,'extract7z.zip');
        }
        async unZip(u8, ARG = {}) {
            let { process, password, packtext } = ARG, F = this, T = F.T;
            if (T.Libzip == 'extractzip.min.js')return this.unRAR(u8, ARG,T.Libzip);
            if(!window.zip)await T.loadScript(T.Libzip,{process});
            let zipReader = new zip.ZipReader(F.I.blob(u8) ? new zip.BlobReader(u8) : new zip.Uint8ArrayReader(u8));
            let entries = await zipReader.getEntries({
                filenameEncoding: T.Encoding,
            }), passok = false;
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
                                if (!passok) {
                                    while (passok) {
                                        if (!opt.password) {
                                            opt.password = window.prompt('need a password', opt.password || '');
                                        }
                                        try {
                                            contents[entry.filename] = await entry.getData(new zip.Uint8ArrayWriter(), opt);
                                            contents.password = opt.password;
                                            passok = true;
                                        } catch (e) {
                                            opt.password = '';
                                        }
                                    }
                                } else {
                                    contents[entry.filename] = await entry.getData(new zip.Uint8ArrayWriter(), opt);
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
                return F.I.blob(u8) ? new Uint8Array(u8.arrayBuffer()) : u8;
            }
        }
        async ZipCreate(password,process) {
            await this.ZipInitJS(process);
            return new zip.ZipWriter(new zip.Uint8ArrayWriter(), { password });
        }
        async ZipInitJS(process) {
            let F = this, T = F.T;
            if (!window.zip) await T.loadLibjs(T.Libzip,{process});
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
            if(u8 instanceof Promise)u8 = await u8;
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
            return (str || '').split('/').pop().split('?')[0].split('#')[0];
        }
        getpath(js){
            let F = this,T=F.T,I=T.I;
            return /^(\/|https?:\/\/|static\/js\/|data\/|assets|blob\:)/.test(js) ? js : T.JSpath + js;
        }
        getFileText(contents,decode,filetype,filename){
            let F = this,T=F.T,I=T.I;
            if(filename&&!decode&&!(/(text|javascript)/.test(filetype))){
                return new File([contents], filename, {'type': filetype});
            }
            if(!decode)return contents;
            if(filetype == 'datalist'){
                I.toArr(contents,entry=>{
                    if(/(text|javascript)/.test(F.gettype(entry[0]))){
                        contents[entry[0]] =  decode(entry[1]);
                    }
                });
            }else if(I.u8obj(contents)){
               return decode(contents);
            }
            return contents;

        }
        gettype(type) {
            let F = this;
            type = F.getname(type).split('.').pop().toLowerCase();
            if (type && !F.mime_list) {
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
            ARG = ARG || {};
            let F = this, dbName = ARG.dbName || F.dbname, store = ARG.store, db = F.StoreList[dbName];
            if (store && F.dbCheckTable(store, db)) {
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
            if(ARG.store instanceof F.StoreDatabase){
                ARG.store = ARG.store.table;
            }
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
                if (ARG.index) DB = DB.index(ARG.index);
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
                },
                success(db, resolve) {
                    F.close(db);
                    resolve('ok');
                }
            });
        }
        StoreDatabase = class {
            constructor(T, table, dbName) {
                let I = T.I;
                dbName = dbName || T.DB_NAME;
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
                let D = this;
                if (!ARG || typeof ARG =='boolean') ARG = { dbName:D.dbName};
                else if(D.T.I.str(ARG)) ARG = {dbName:ARG};
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
                console.log(ARG);
                ARG = this.setName(ARG);
                return this.removeItem(name, ARG);
            }
            data(name, version, ARG) {
                return this.getData(name, version, ARG);
            }
            getData(name, version, ARG) {
                ARG = this.setName(ARG);
                return this.getContent(name, version, ARG);
            }
            setData(name, data, opt) {
                return this.setContent(name, data, opt, this.dbName);
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
            async getBatch(arr, func) {
                let list = await Promise.all(arr.map(async v => {
                    return await this.get(v);
                }));
                if (func) return func(list);
                return list;
            }
        };
        async getLibjs(jsfile,process) {
            let F = this, T = F.T,file = jsfile.replace(/\.zip$/,'.js');
            if (F.Libjs[file]) return F.Libjs[file];
            let contents = await T.getStore(T.LibStore).data(F.LibKey + file, T.version);
            if (!contents) {
                if (/\.zip$/.test(jsfile)&&!window.zip) await T.loadScript(T.Libzip,{process});
                if (file != T.Libzip) {
                    contents = await T.FetchItem({
                        url: T.JSpath + jsfile,
                        'store': T.LibStore,
                        'key': F.LibKey,
                        'unpack': true,
                        'filename': file,
                        'process':e=>{
                            process&&process(`${T.getLang('installJS')}:${jsfile}`)
                        }
                    });
                }
            }
            if (/rar\.js$/.test(file)) {
                let memurl = F.URL(await F.getLibjs(file+'.mem'));
                let rarurl = F.URL(contents);
                contents = `var dataToPass=[],password,Readyfunc,isReady = new Promise(res=>Readyfunc=res);;self.Module={locateFile:()=>'` + memurl + `',monitorRunDependencies:function(t){0 == t && setTimeout(()=>Readyfunc(),100);},onRuntimeInitialized:function(){}};
                importScripts('` + rarurl + `');let unrar=function(t,e){let n=readRARContent(t.map((function(t){return{name:t.name,content:new Uint8Array(t.content)}})),e,(function(t,e,n){postMessage({t:4,current:n,total:e,name:t})})),o=function(t){if("file"===t.type)postMessage({t:2,file:t.fullFileName,size:t.fileSize,data:t.fileContent});else{if("dir"!==t.type)throw"Unknown type";Object.keys(t.ls).forEach((function(e){o(t.ls[e])}))}};return o(n),postMessage({t:1}),n};onmessage=async (message)=>{if(message.data.contents)dataToPass.push({name:"test.rar",content:message.data.contents});if(message.data.password)password=message.data.password;isReady.then(e=>unrar(dataToPass,password||undefined)).catch(message=>{if(['Uncaught Missing password','Missing password'].includes(message))return postMessage({t:-1,message})});};`;
                F.Libjs[file] = new File([contents], file, {
                    'type': F.gettype('js'), 'x-content-type-options': 'nosniff'
                });
            } else if (contents) {
                F.Libjs[file] = contents;
            }
            return F.Libjs[file];
        }
        get dbname() {
            return this.T.DB_NAME;
        }
        constructor(T) {
            let F = this, I = T.I;
            I.defines(F, { I, T }, 1);
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
    $ct(e, txt) {
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
        let elm = this.$(e);
        if (!elm) return;
        return this.$(e).getAttribute(s);
    }
    docElm(str, mime) {
        return new DOMParser().parseFromString(str, mime || 'text/html');
    }
    HTMLToTxt(str){
        if(this.I.str(str))str = this.docElm(str);
        if(str instanceof Document){
            return str.body.textContent;
        }
        return "";
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
    getLang(name,arg) {
        let result = this.lang&&this.lang[name]||name;
        if(arg&&result){
            T.I.toArr(arg,entry=>{
                result = result.replace(new RegExp('/\{'+entry[0]+'\}/','g'),entry[1]);
            });
        }
        return result
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
   Nttr = class Nttr {
    constructor(obj, T) {
        let Nttr = this, I = T.I;
        I.defines(Nttr, { T, I, obj }, 1);
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
    html(str) {
        if (str != undefined){
            this.obj.innerHTML = str;
            return this;
        }
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
    addClass(str) {
        this.cList.add(str);
        return this;
    }
    removeClass(str) {
        this.cList.remove(str);
        return this;
    }
    addChild(obj) {
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
        } else if (!evtname) {
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
    triger(type, opt) {
        let N = this, data = Object.assign({}, opt || {}, { target: N.obj });
        if (N.eventList[type]) N.eventList[type].forEach(val => val.func.call(N.obj, data));
        else N.T.triger(N.obj, type, data);
    }
    dispatch(evt) {
        this.obj.dispatchEvent(evt);
    }
    bind(opt, type) {
        let N = this, T = N.T, I = N.I;
        if(!type){
            type = N.I.mobile?'touchend':'click';
        }
        I.toArr(opt, entry => T.on(N.$(entry[0], this.obj), type, entry[1]));
    }
    click(func, type, opt) {
        let N = this;
        if(!type){
            type = N.I.mobile?'touchend':'click';
        }
        if (func instanceof Function) N.un(type), N.on(type, func, opt || false);
        else N.triger(type, func);
        return N;
    }
    getBoundingClientRect() {
        return this.obj.getBoundingClientRect();
    }
    remove() {
        this.un();
        this.obj.remove();
    }
    get children(){
        return Array.from(this.obj.children);
    }
    get parentNode(){
        return this.obj.parentNode;
    }
    get rect(){
        return this.getBoundingClientRect();
    }
};
    nWindow = class nWindow extends this.Nttr{
        action = {
            close(){
                this.hidden = true;
            },
            show(){
                this.hidden = false;
            },
            installWindow(){
                this.addClass('ajaxWindow');
                this.html(`<div class="container">
                    <div class="a-header">
                        <div class="title"><span class="loading">&#61712;</span></div>
                        <div class="menu">
                            <button type="button" class="close" data-naction="close">&#61453;</button>
                        </div>
                    </div>
                    <div class="a-body">
                        <p class="loading">&#61473;</p>
                    </div>
                    <div class="a-footer" hidden></div>
                </div>`);
            },
            installHeaderEvent(){
                let W = this,T=W.T,drag;
                if(T.I.mobile){
                    drag =  ['touchstart','touchmove','touchend'];
                }else{
                    drag = ['mousedown','mousemove','mouseup','mouseout'];
                }
                drag.forEach(v=>T.on(W.Nttr.$('.a-header'),v,e=>{
                    if(e.type=='mousedown'||e.type=='touchstart'){
                        if(e){
                            let {clientX,clientY} = e.type=='mousedown'?e:e.touches[0];
                            W.HeaderPointPos = {clientX,clientY};
                        }
                    }
                    if(e.type=='mouseup'||e.type=='mouseout'||e.type=='touchend'){
                        W.HeaderPointPos = false;
                    }
                    if((e.type=='mousemove'||e.type=='touchmove')&&W.HeaderPointPos){
                        let {clientX,clientY} = e.type=='mousemove'?e:e.touches[0],celm=W.$('.container'),rect = celm.getBoundingClientRect(),x="",y="";
                        let newclientX = W.HeaderPointPos.clientX-clientX;
                        let newclientY = W.HeaderPointPos.clientY-clientY;
                        y = rect.top - newclientY;
                        y = 'top:'+y+'px;bottom:unset;';
                        newclientX = newclientX||0;
                        x = rect.left - newclientX;
                        if(x<10||(x&&rect.width +x+15 > window.innerWidth)){
                            //clientX = parseFloat(celm.style.left);
                            x = parseFloat(celm.style.left);
                            if(x<=10){
                                x=10;
                            }else if(x+10>window.innerWidth){x-=10;}
                        }else{
                        }
                        x = 'left:'+x+'px;right:unset;width:'+rect.width+'px;';
                        W.$('.container').style.cssText = x+y;
                        W.HeaderPointPos = {clientX,clientY};
                    }
                }),{
                    passive:false
                });
            },
            installEvent(){   
                let W = this,T=W.T,obj = W.Nttr.obj;
                T.on(obj,'pointerup',e=>{
                    let elm = e.target;
                    if(elm==obj){
                        return W.runaction('close',[elm,e]);
                    }
                    let nAction = elm&&T.attr(elm,'data-naction');
                    if(nAction){
                        T.stopEvent(e);
                        return W.runaction(nAction,[elm,e]);
                    }
                });
            }
        };
        constructor(obj,T){
            super(obj,T);
            const W = this;
            W.Nttr = W;
            W.runaction = T.runaction;
            if(!W.$('.container'))W.runaction('installWindow');
            W.runaction('installEvent');
            W.runaction('installHeaderEvent');
            return W;
        }
    };
};
const Nttr = (obj) => {
    let T = Nenge, elm = T.$(obj);
    if(obj instanceof T.Nttr) return obj;
    return elm ? !elm.Nttr ? new T.Nttr(elm, T) : elm.Nttr : undefined;
};
const nWindow = (obj)=>{
    let T = Nenge;
    if(!obj)obj = T.$ce('div');document.body.appendChild(obj);
    let elm = T.$(obj);
    if(!elm.Nttr){
        new T.nWindow(elm,T);
    }
    return elm.Nttr;
};
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
                if (e.target != mask) return;
                maskobj.hidden = true;
                if (maskobj.evtobj instanceof Element) {
                    Nttr(maskobj.evtobj).hidden = true;
                    delete maskobj.evtobj;

                }
            }).hidden = true;
        }
        if (obj) {
            Nttr(mask).hidden = false;
            Nttr(mask).evtobj = obj;
        }
        return mask;
    }
    alert(message) {
        let N = this, T = this.T, alertobj = T.$(N.name('alert'));
        if (!alertobj) {
            let Alert = new nWindow();
            Alert.addClass(N.name('alert', 1));
            alertobj = T.$(N.name('alert'));
            alertobj.Alert = Alert;
        }
        alertobj.Alert.setBody(message);
    }

}(Nenge);
