const Nenge = new class {
    Module = {
        'noInitialRun': true,
        'arguments': ["-v", "--menu"],
        'preRun': [],
        'postRun': [],
        'print': text => console.log(text),
        'printErr': text => console.log(text),
        'totalDependencies': 0,
        'monitorRunDependencies': function (left) {
            this.totalDependencies = Math.max(this.totalDependencies, left);
        }
    };
    version = 2;
    maxsize = 0x6400000;
    part = '-part-';
    DB_NAME = 'RetroArch_WEB';
    DB_STORE_MAP = {
        'data-libjs': null,
        'data-rooms': null,
        'data-info': null,
        '/userdata': 'userdata',
        '/home/web_user/retroarch/userdata': 'retroarch',
    };
    Libjs = {};
    lang = {};
    LibStore = 'data-libjs';
    async getItem(store, name, version) {
        if (!name || name instanceof Function) return await this.GetItems(store, name || cb);
        let T = this,
            db = await T.GET_DB(store),
            transaction = T.transaction(store, db, !0),
            maxsize = T.maxsize,
            part = T.part;
        let result = await this.unitl.getItem(transaction, name);
        if (result && result.contents && result.filesize && result.filesize > maxsize) {
            if (version && result.version && result.version != version) {
                return;
            }
            let maxLen = Math.ceil(result.filesize / maxsize),
                keys = name.split(part),
                save = [],
                idx = parseInt(keys[1]) || 0,
                returnBuf = new Uint8Array(result.filesize);
            returnBuf.set(result.contents, idx * maxsize);
            for (let i = 0; i < maxLen; i++) {
                if ((!keys[1] || keys[1] == '0') && i == 0) continue;
                else if ((keys[1] == i)) continue;
                save.push(i > 0 ? keys[0] + part + i : keys[0]);
            }
            await Promise.all(save.map(async entry => {
                let subresult = await await this.unitl.getItem(transaction, entry);
                if (!subresult) {
                    throw T.Err(entry + ' data is lost');
                }
                let subidx = parseInt(entry.split(part)[1]) || 0;
                returnBuf.set(subresult.contents, subidx * maxsize);
            }));
            if (result.type.split('/')[0] == 'file') {
                result.contents = new File([returnBuf], keys[0], {
                    type: result.type.split('/').slice(1).join('/')
                });
            } else if (result.type.split('/')[0] == 'sting') {
                result.contents = new TextDecoder().decode(returnBuf);
            } else {
                result.contents = returnBuf;
            }
        }
        return result;
    }
    async setItem(store, name, data, cb) {
        let T = this,
            db = await T.GET_DB(store),
            maxsize = T.maxsize,
            part = T.part,
            type = data.type || '';
        if(data instanceof Promise)data = await data;
        if ((typeof data == 'string' && data > maxsize / 2) || (typeof data.contents == 'string' && data.contents > maxsize / 2)) {
            if (data.contents) data.contents = new TextEncoder().encode(data.contents);
            else data = {'contents': new TextEncoder().encode(data)};
            Object.assign(data, {'type': 'string'});
        } else if ((data instanceof Blob && data.size > maxsize) || (data.contents instanceof Blob && data.contents.size > maxsize)) {
            let filetype = (data.contents || data).type,
                filesize = (data.contents || data).size;
            if (data.contents) data.contents = new Uint8Array(await data.contents.arrayBuffer());
            else data = {
                'contents': new Uint8Array(await data.arrayBuffer())
            };
            Object.assign(data, {
                'type': filetype ? 'file/' + filetype : type,
                filesize
            });
        }
        if (data.hasOwnProperty('version') && !data.version) delete data.version;
        if (data.contents && data.contents.length > maxsize) {
            let save = {},
                BufLen = data.contents.byteLength;
            for (let index = 0; index < Math.ceil(BufLen / maxsize); index++) {
                save[index > 0 ? name + part + index : name] = maxsize * index;
            }
            let basecontent = {};
            Object.entries(data).forEach(entry => {
                if (entry[0] != 'contents') basecontent[entry[0]] = entry[1];
            });
            let result = await Promise.all(
                Object.entries(save).map(async entry => {
                    let [key, start] = entry,
                    end = BufLen - start >= maxsize ? start + maxsize : BufLen;
                    return await T.setItem(
                        store,
                        key,
                        Object.assign({}, basecontent, {
                            'contents': new Uint8Array(data.contents.subarray(start, end)),
                        })
                    );
                })
            );
            delete data.contents;
            data = null;
            basecontent = null;
            cb && cb(result);
            return result;
        }
        return new Promise(callback => {
            T.transaction(store, db).put(data, name).onsuccess = e => {
                let result = e.target.result;
                callback(result), cb && cb(result)
            };
        });
    }
    async removeItem(store, name,clear) {
        let T = this,
            db = await T.GET_DB(store);
        if(clear){
            let contents = await T.unitl.getItem(T.transaction(store, db), name);
            console.log(contents);
            if(contents&&contents.filesize&&contents.filesize>T.maxsize){
                let maxLen = Math.ceil(contents.filesize / T.maxsize),
                    part = T.part,
                    keys = name.split(part)[0],
                    result = '';
                    result += await T.removeItem(store,keys)+'\n';
                    for (let i = 1; i < maxLen; i++)result+=await T.removeItem(store,keys+part+i)+'\n';
                    contents = null;
                    return result;

            }
        }
        return new Promise((resolve, reject) => {
            T.transaction(store, db).delete(name).onsuccess = e => resolve(`delete:${name}`);
        });
    }
    async getContent(store, name, version) {
        let result = await this.getItem(store, name);
        if (!result) return undefined;
        if (version && (!result.version || version != result.version)) return undefined;
        return result.contents || result;
    }
    async getAllKeys(store, cb) {
        let T = this,
            db = await T.GET_DB(store);
        return new Promise(callback => {
            T.transaction(store, db, !0).getAllKeys().onsuccess = e => {
                let result = e.target.result;
                callback(result), cb && cb(result)
            };
        });
    }
    async getAllCursor(store,key, cb){
        let T = this,db = await T.GET_DB(store);
        return new Promise(callback => {
            let entries = {};
        T.transaction(store, db,!0).index(key).openKeyCursor().onsuccess = evt => {
            let cursor = evt.target.result;
            if (cursor) {
                entries[cursor.primaryKey] = {"timestamp": cursor.key};
                cursor.continue()
            } else {
                cb && cb(entries);
                callback(entries)
            }
        }
        })

    }
    async GetItems(store, cb) {
        let T = this,
            db = await T.GET_DB(store);
        return new Promise(callback => {
            let entries = {};
            T.transaction(store, db, !0).openCursor().onsuccess = evt => {
                let cursor = evt.target.result;
                if (cursor) {
                    entries[cursor.primaryKey] = cursor.value;
                    cursor.continue();
                } else {
                    callback(entries);
                    cb && cb(entries);
                }
            }
        });
    }
    async FectchItem(ARG) {
        let T = this,
            F = T.unitl,
            key = ARG.key || ARG.url && ARG.url.split('/').pop().split('?')[0],
            result,
            version = ARG.version,
            headers = {},
            response,
            callback = result => {
                if (result && result.contents) {
                    ARG.success && ARG.success(result.contents, headers);
                    return result.contents;
                }
                ARG.success && ARG.success(result, headers);
                return result;
            };
        if (ARG.store && !ARG.unset) {
            result = await T.getItem(ARG.store, key);
            if (result) {
                if (version && result.version) {
                    if (version == result.version) return callback(result);
                } else if (!ARG.checksize) {
                    return callback(result);
                }
            }
        }
        response = await F.fetch(ARG);
        headers = F.getheader(response, ARG);
        let password;
        if (headers['content-password']) {
            password = headers['content-password'];
        }
        if (response.status == 404) {
            ARG.error && ARG.error(response.statusText);
            return callback(result);
        } else if (result && result.filesize && headers.SIZE > 0) {
            if (result.filesize == headers.SIZE) return callback(result);
            if (result.contents) delete result.contents
        };
        let contents = await F.stream(response, headers, ARG),
            type = headers.TYPE;
        if (contents instanceof ArrayBuffer) {
            contents = new Uint8Array(contents);
            type = 'Uint8Array';
        }
        let filesize = contents.byteLength || contents.length;
        if (ARG.unpack && contents instanceof Uint8Array) {
            let packtext = ARG.packtext && ARG.packtext || '解压:';
            contents = await F.unFile(contents, (e, n) => ARG.process && ARG.process(packtext + (n ? n + ' ' : '') + e), password || ARG.password);
        }
        if (ARG.store) {
            if (contents instanceof Uint8Array || ARG.key != 'libdata') {
                await T.setItem(ARG.store, key, {
                    contents,
                    timestamp: new Date,
                    filesize,
                    version,
                    type
                });
            } else if (ARG.key == 'libdata') {
                let contents2;
                await Promise.all(Object.entries(contents).map(async entry => {
                    let [name, data] = entry,
                    filename = name.split('/').pop(),
                        filetype = this.unitl.gettype(filename),
                        filedata = new File([data], filename, {
                            'type': filetype
                        });
                    T.setItem(
                        ARG.store,
                        key + '-' + filename, {
                            'contents': filedata,
                            'timestamp': this.DATE,
                            'filesize': data.byteLength,
                            'version': this.version,
                            'type': filetype
                        }
                    );
                    if (ARG.filename == filename) {
                        contents2 = filedata;
                    }
                    return true;
                }));
                if (contents2) contents = contents2;
            }
        }
        ARG.success && ARG.success(contents, headers);
        return contents;
    }
    unitl = new class {
        async stream(response, headers, ARG) {
            let downsize = headers.SIZE || 0,
                downtext = ARG.downtext && ARG.downtext || '进度:',
                havesize = 0,
                type = headers.TYPE;
            const stream = new ReadableStream({
                async start(controller) {
                    const reader = response.body.getReader();
                    let PUSH = async () => {
                        const {
                            done,
                            value
                        } = await reader.read();
                        if (done) {
                            controller.close();
                        } else {
                            havesize += Number(value.length);
                            let statussize;
                            if (downsize) statussize = downtext + Math.floor(havesize / downsize * 100) + '%';
                            ARG.process && ARG.process(statussize, downsize, havesize);
                            /*下载或者上传进度*/
                            controller.enqueue(value);
                            PUSH();
                        }
                    };
                    PUSH();
                }
            });
            return new Response(stream)[type]();
        }
        getheader(response, ARG) {
            ARG = ARG || {};
            let headers = {};
            response.headers.forEach((v, k) => headers[k] = v);
            let [mime, charset] = headers['content-type'].split(/;\s+?/), type = ARG.type || 'arrayBuffer';
            if (mime) {
                headers.MIME = mime;
                mime = mime.split('/');
                if (!ARG.type) {
                    if (mime[1] == 'json') type = mime[1];
                    else if (mime[0] == 'text') type = mime[0];
                }
                headers.TYPE = type;
            }
            if (charset) {
                charset = charset.split('=')[1] || charset.split('=')[0];
                headers.CHARSET = charset;
            }
            headers.SIZE = Number(headers["content-length"]) || 0;
            return headers;
        }
        async fetch(ARG) {
            if (!ARG.url) throw {
                url: "url is null"
            };
            let url = ARG.url,
                fd, form, data = {};
            if (ARG.get) {
                url += (/\?/.test(url) ? '&' : '?') + new URLSearchParams(ARG.get).toString()
            }
            ['headers', 'context', 'referrer', 'referrerPolicy', 'mode', 'credentials', 'redirect', 'integrity', 'cache'].forEach(val => {
                if (ARG[val] != undefined) data[val] = ARG[val];
            });
            if (ARG.form || ARG.post) {
                if (typeof ARG.form == 'string') fd = new FormData(this.T.$(ARG.form));
                else if (ARG.form instanceof HTMLElement) {
                    fd = new FormData(ARG.form);
                } else if (form instanceof FormData) {
                    fd = form;
                } else {
                    fd = new FormData();
                }
                if (ARG.post) {
                    Object.entries(ARG.post).forEach(entry => fd.append(entry[0], entry[1]));
                }
            } else if (ARG.postdata) {
                fd = ARG.postdata;
            }
            if (fd) {
                data.method = 'POST';
                data.body = fd;
            }
            return await fetch(url, data).catch(e => {
                throw e
            });
        }
        async unRAR(u8, cb, password, key, file) {
            let worker = new Worker(this.URL(await this.getLibjs(file || 'rar.js')));
            return new Promise(complete => {
                let contents = {};
                worker.onmessage = result => {
                        if (1 === result.data.t) {
                            complete(contents);
                            result.target['terminate']();
                        } else if (2 === result.data.t) {
                            contents[result.data.file] = result.data.data;
                        } else if (4 === result.data.t && result.data.total > 0 && result.data.total >= result.data.current) {
                            cb && cb(Math.floor(Number(result.data.current) / Number(result.data.total) * 100) + '%', result.data.name);
                        }
                    },
                    worker.postMessage(!file ? {
                        data: u8,
                        password
                    } : u8);
            });

        }
        async un7z(u8, cb, password, key) {
            return this.unRAR(u8, cb, null, key, '7z.js');
        }
        async unZip(u8, cb, password, key) {
            let T = this.T;
            await this.ZipInitJS();
            let zipReader = new zip.ZipReader(u8 instanceof Blob ? new zip.BlobReader(u8) : new zip.Uint8ArrayReader(u8));
            let entries = await zipReader.getEntries({
                filenameEncoding: 'GBK',
            });
            if (entries.length > 0) {
                let contents = {};
                await Promise.all(
                    entries.map(
                        async entry => {
                            if (!entry.directory) contents[entry.filename] = await this.ZipReadEntry(entry, this.ZipPassword || password, cb);
                            return true;
                        }
                    )
                );
                if (key) {
                    Object.assign(T.Libjs, contents);
                }
                zipReader.close();
                return key ? T.Libjs[key] : contents;
            } else {
                return u8;
            }
        }
        async ZipReadEntry(entry, password, cb) {
            let onprogress = (index, max) => cb(entry.filename + ' &gt;&gt; ' + Math.ceil(index / max * 100) + '%');
            if (!entry.encrypted) return await entry.getData(new zip.Uint8ArrayWriter(), {
                onprogress
            });
            else {
                try {
                    return await entry.getData(new zip.Uint8ArrayWriter(), {
                        password,
                        onprogress
                    });
                } catch (e) {
                    if (e.message == 'File contains encrypted entry') {
                        let newpassword = window.prompt('need a read password');
                        if (newpassword) {
                            this.ZipPassword = newpassword;
                            return this.ZipReadEntry(entry, newpassword);
                        }
                    }
                    throw 'miss password';
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
            if (!window.zip) await this.T.addJS(await this.T.getLibjs('zip.min.js'));
            return true;
        }
        async ZipAddFile(files, password, ZipWriter, options, comment) {
            if (!ZipWriter) ZipWriter = await this.ZipCreate(password);
            if (files instanceof File) await ZipWriter.add(files.name, new zip.BlobReader(files), options);
            else await Promise.all(Array.from(files).map(async file => await ZipWriter.add(file.name, new zip.BlobReader(file), options)));
            return await ZipWriter.close(comment);
        }
        async unFile(u8, cb, password, key) {
            let action = null,
                u8Mime;
            if (u8 instanceof Blob) {
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
                if (!action || action == 'stream') {
                    u8 = new Uint8Array(await u8.arrayBuffer());
                    u8Mime = this.checkBuffer(u8);
                }
            } else if (u8 instanceof Uint8Array) {
                u8Mime = this.checkBuffer(u8);
            } else if (u8.buffer || u8 instanceof Array) {
                u8 = new Uint8Array(u8);
                u8Mime = this.checkBuffer(u8);
            }
            if (u8Mime) {
                if (u8Mime == 'zip') action = 'unZip';
                else if (u8Mime == 'rar') action = 'unRAR';
                else if (u8Mime == '7z') action = 'un7z';
            }
            if (action && this[action]) return await this[action](u8, cb, password, key);
            return u8;
        }
        get random() {
            return Number(Math.random().toString().slice(2))
        }
        gettype(type) {
            type = type && type.toString().split('?')[0].split('.').pop().toLowerCase();
            switch (type) {
                case 'js':
                    return 'text/javascript';
                    break;
                case 'css':
                    return 'text/css';
                    break;
                case 'html':
                case 'txt':
                case 'lrc':
                    return 'text/html';
                    break;
                case 'jpg':
                case 'png':
                case 'gif':
                case 'webp':
                    return 'image/' + type;
                    break;
                case 'pdf':
                    return 'application/pdf';
                    break;
                case 'zip':
                case '7z':
                case 'rar':
                    return 'application/x-' + type + '-compressed';
                    break;
                default:
                    return 'application/octet-stream';
                    break;
            }
        }
        istext(type) {
            return ['js', 'css', 'html', 'txt'].includes(type);
        }
        mimepreg = {
            "7z": /^377ABCAF271C/,
            "rar": /^52617221/,
            "zip": /^504B0304/,
            "png": /^89504E470D0A1A0A/,
            "gif": /^47494638/,
            "jpg": /^FFD8FF/,
            "webp": /^52494646/,
            "pdf": /^255044462D312E/,
        };
        checkBuffer(u8) {
            let head = Array.from(u8.slice(0, 8)).map(v => v.toString(16).padStart(2, 0).toLocaleUpperCase()).join('');
            for (let ext in this.mimepreg) {
                if (this.mimepreg[ext].test(head)) return ext;
            }
            return 'unkonw';
        }
        URL(u8, type) {
            if (!type) {
                if (u8 instanceof Blob && u8.type) type = u8.type;
                else if (!/(\\|\/)/.test(type)) type = this.gettype(type);
            }
            if (typeof u8 == 'string' && /^(blob|http|\/\w+)/.test(u8)) return u8;
            return window.URL.createObjectURL(u8 instanceof Blob ? u8 : new Blob([u8], {
                'type': type
            }));
        }
        removeURL(url) {
            return window.URL.revokeObjectURL(url);
        }
        download(name, buf, type) {
            let href;
            if (name instanceof Blob) {
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
        async getDB(DB_NAME, ARG) {
            ARG = ARG || {};
            if (typeof ARG == 'string') ARG = {
                store: ARG
            };
            let mb = ARG.db || this.DB_STORE[DB_NAME];
            if(ARG.version){
                mb.close();
            }else if (mb && (ARG.store && mb.objectStoreNames.contains(ARG.store) || !ARG.store)) {
                return mb;
            } else if (mb) {
                ARG.version = mb.version + 1;
                return getDB(DB_NAME, ARG);
            }
            return new Promise((resolve, reject) => {
                let req = self.indexedDB.open(DB_NAME, ARG.version);
                req.addEventListener('error', async err => {
                    console.log(err, req.error);
                    reject(err);
                });
                req.addEventListener('upgradeneeded', async e => {
                    let db = e.target.result,
                        Names = db.objectStoreNames;
                    if (ARG.upgrad) {
                        ARG.upgrad({
                            db,
                            'obj': req,
                            'list': Names
                        });
                    } else if (ARG.store && !Names.contains(ARG.store)) {
                        let Store = db.createObjectStore(ARG.store);
                        if (ARG.Index) Store.createIndex(ARG.Index, ARG.Index, {
                            "unique": false
                        });
                    }
                });
                req.addEventListener('versionchange', e => {
                    console.log(11);
                });
                req.addEventListener('success', async e => {
                    let Names = req.result.objectStoreNames;
                    if (ARG.store && !Names.contains(ARG.store)) {
                        ARG.db = req.result;
                        return this.getDB(DB_NAME, ARG).then(db => resolve(db));
                    }
                    this.DB_STORE[DB_NAME] = req.result;
                    resolve(this.DB_STORE[DB_NAME]);
                });
            });
        }
        getItem(transaction, name) {
            return new Promise(back => {
                transaction.get(name).onsuccess = e => back(e.target.result);
            });
        }
        constructor(t) {
            Object.defineProperties(this, {
                'T': {
                    get: () => t
                },
                'getLibjs': {
                    value: e => t.getLibjs(e)
                }
            });
        }
    }(this);
    async getLibjs(file) {
        if (this.Libjs[file]) return this.Libjs[file];
        let contents = await this.getContent('data-libjs', 'libdata-' + file, this.version);
        if (!contents) {
            let zip = 'zip.min.js';
            this.Libjs[zip] = this.JSpath + zip + '?' + this.unitl.random;
            if (file != zip) {
                contents = await this.FectchItem({
                    url: this.LibPack,
                    'store': 'data-libjs',
                    'key': 'libdata',
                    'unpack': true,
                    'filename': file
                });
            }
        }
        if (contents) {
            if (file == 'rar.js') {
                console.log(await this.getLibjs('rar.mem'));
                let memurl = this.unitl.URL(await this.getLibjs('rar.mem'));
                let rarurl = this.unitl.URL(contents);
                contents = `var dataToPass=[],password;self.Module={locateFile:()=>'` + memurl + `',monitorRunDependencies:function(t){0==t&&setTimeout((function(){unrar(dataToPass,password||null)}),100)},onRuntimeInitialized:function(){}};
                importScripts('` + rarurl + `');let unrar=function(t,e){let n=readRARContent(t.map((function(t){return{name:t.name,content:new Uint8Array(t.content)}})),e,(function(t,e,n){postMessage({t:4,current:n,total:e,name:t})})),o=function(t){if("file"===t.type)postMessage({t:2,file:t.fullFileName,size:t.fileSize,data:t.fileContent});else{if("dir"!==t.type)throw"Unknown type";Object.keys(t.ls).forEach((function(e){o(t.ls[e])}))}};return o(n),postMessage({t:1}),n};onmessage=function(t){dataToPass.push({name:"test.rar",content:t.data.data});if(!password&&t.data.password)password=t.data.password;};`;
                this.Libjs[file] = new File([contents], file, {
                    'type': this.unitl.gettype(file),
                    'x-content-type-options': 'nosniff'
                });
            } else {
                this.Libjs[file] = contents;
            }
        }
        return this.Libjs[file];
    }
    get DB() {
        return this.unitl.DB_STORE[this.DB_NAME];
    }
    async GET_DB(storeName, key) {
        let T = this;
        storeName = storeName || 'userdata';
        if (this.unitl.DB_STORE[storeName] && T.StoreNames.contains(storeName)) return this.unitl.DB_STORE[storeName];
        return await this.unitl.getDB(T.DB_NAME, {
            "store": storeName,
            "upgrad": result => {
                let {
                    db,
                    obj,
                    list
                } = result;
                let fileStore,
                    createIndex = (store, keyId) => store.createIndex(keyId, keyId, {
                        "unique": false
                    });
                if (!list.contains(storeName)) {
                    Object.entries(T.DB_STORE_MAP).forEach(entry => {
                        let NAME = entry[1] || entry[0],
                            keyId = null;
                        if (list.contains(NAME)) return;
                        let Store = db.createObjectStore(NAME);
                        if (entry[1]) keyId = "timestamp";
                        else if (key && NAME == storeName) keyId = key;
                        if (keyId && !Store.indexNames.contains(keyId)) createIndex(Store, keyId);
                        if (NAME == storeName) fileStore = Store;
                    });
                    if (!fileStore) {
                        fileStore = db.createObjectStore(storeName);
                        if (key && !fileStore.indexNames.contains(key)) createIndex(fileStore, key);
                    }
                }
            }
        });
    }
    transaction(store, db, mode) {
        db = db || this.DB;
        mode = mode ? "readonly" : "readwrite";
        let transaction = db.transaction([store], mode);
        transaction.onerror = e => {
            e.preventDefault();
            throw transaction.error;
        };
        return transaction.objectStore(store);
    }
    async clearDB(storeName) {
        let T = this;
        if (!storeName) return ;
        let db = await T.GET_DB(storeName);
        T.transaction(storeName, db).clear();
    }
    async deleteDB(storeName) {
        let T = this;
        if (!storeName) return  T.indexedDB.deleteDatabase(T.DB_NAME);
        let db = await T.GET_DB(storeName);
        let version = db.version+1;
        db.close();
        return await this.unitl.getDB(T.DB_NAME, {
            version,
            upgrad:obj=>{
                obj.db.deleteObjectStore(storeName);
            }
        });
    }
    get StoreNames() {
        return this.DB.objectStoreNames
    }
    addJS(buf, cb, iscss) {
        let re = false,
            script = document.createElement(!iscss ? 'script' : 'link'),
            func = success => {

                if (!/^(blob:)?https?:\/\//.test(buf) && !/(\.js$|\.css$)/.test(buf)) {
                    re = true;
                    buf = this.unitl.URL(buf, !iscss ? 'js' : 'css');
                }
                if (iscss) {
                    script.type = this.unitl.gettype('css');
                    script.href = buf;
                    script.rel = "stylesheet";
                } else {
                    script.type = this.unitl.gettype('js');
                    script.src = buf;
                }
                script.onload = e => {
                    success && success(e);
                    if (re) window.URL.revokeObjectURL(buf);
                    buf = null;
                };
                document[!iscss ? 'body' : 'head'].appendChild(script);
            };
        if (!cb) return new Promise((resolve, reject) => func(resolve, reject));
        else func(cb), script;

    };
    customElement(myelement) {
        let T = this,
            MyElement = class extends HTMLElement {
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
                    T.runaction('TAG-' + this.tagName, [this, 'attribute', name, oldValue, newValue]);
                }
                disconnectedCallback() {
                    /*custom element 文档 DOM 节点上移除时被调用*/
                    T.runaction('TAG-' + this.tagName, [this, 'disconnect']);
                }
            };
        window.customElements.define(myelement, MyElement);
    }
    DATE = new Date();
    on(elm, evt, fun, opt, cap) {
        (elm || document).addEventListener(evt, fun, opt === false ? {
            passive: false
        } : opt, cap);
    }
    un(elm, evt, fun, opt,cap) {
        (elm || document).removeEventListener(evt, fun,opt === false ? {
            passive: false
        } : opt,cap);
    }
    once(elm, evt, fun, opt,cap) {
        return this.on(elm, evt, fun, {
            passive: false,
            once: true
        },cap);
    }
    $(e, f) {
        if (e instanceof Function) return this.docload(e);
        return (f || document).querySelector(e);
    }
    $$ = (e, f) => (f || document).querySelectorAll(e);
    $ce = e => document.createElement(e);
    Err(msg) {
        throw new Error(msg);
    }
    ajax(ARG) {
        return new Promise((resolve, reject) => {
            ARG = ARG || {};
            const request = new XMLHttpRequest(ARG.paramsDictionary);
            request.responseType = ARG.type || "arraybuffer";
            if (!ARG.error) ARG.error = reject;
            //else this.on(request,'error',e=>reject(e));
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
            evt.forEach(val => ARG[val] && this.on(request, val, e => ARG[val](e, request)));
            if (!ARG.readystatechange) {
                this.on(request, 'readystatechange', event => {
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
                evt.forEach(val => ARG.upload[val] && this.on(request.upload, val, e => ARG.upload[val](e, request)));
            }
            let urldata = ARG.url.split('?'),
                url = urldata[0],
                Params, formData;
            if (urldata[1]) {
                Params = new URLSearchParams(urldata.slice(1).join(''));
            }
            ARG.get = ARG.get || {};
            ARG.get['inajax'] = 1;
            ARG.get['_t'] = new Date().getTime();
            if (ARG.get) {
                if (!Params) {
                    Params = new URLSearchParams(ARG.get);
                } else {
                    Object.entries(ARG.get).forEach(entry => Params.append(entry[0], entry[1]));
                }
            }
            if (Params) {
                url += '?' + Params.toString();
            }
            if (ARG.post) {
                if (ARG.post instanceof Element) {
                    formData = new FormData(ARG.post)
                } else if (ARG.post instanceof FormData) {
                    formData = ARG.post;
                } else {
                    formData = new FormData();
                    Object.entries(ARG.post).forEach(entry => formData.append(entry[0], entry[1]));
                }
                formData.append('inajax', 1);
            }
            request.open(!ARG.post ? "GET" : "POST", url);
            request.send(formData);
        });
    }
    runaction(action, data) {
        if (this.action[action]) {
            if (!data) return this.action[action]();
            if (data instanceof Array) return this.action[action].apply(this, data);
            return this.action[action].call(this, data);
        } else {
            console.log('lost action:' + action);
        }
    }
    docload(f) {
        return new Promise(complete => {
            if (document.readyState == 'loading') {
                return this.once(document, 'DOMContentLoaded', () => {
                    f && f.call(this);
                    complete(true);
            });
            }
            f && f.call(this);
            complete(true);
        });
    }
    JSpath = document.currentScript && document.currentScript.src.split('/').slice(0, -1).join('/') + '/';
    constructor() {

        this.LibPack = this.JSpath + 'libjs.png';
    }
    isMobile = 'ontouchend' in document;
    async appendscript(js) {
        let url = /^(\/|https?:\/\/|static\/js\/|data\/)/.test(js) ? js : this.JSpath + js;
        let data = await this.FectchItem({
            url,
            store: 'data-libjs',
            key: 'script-' + js.split('/').pop(),
            version: this.version
        });
        return await this.addJS(data);
    }
};