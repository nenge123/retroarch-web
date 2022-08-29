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
    version = 2;
    maxsize = 0x6400000;
    part = '-part-';
    lang = {};
    DATE = new Date();
    JSpath = document.currentScript && document.currentScript.src.split('/').slice(0, -1).join('/') + '/';
    isMobile = 'ontouchend' in document;
    constructor() {}
    async getItem(store, name, version, ARG = {}) {
        if (!name) return await this.getAllData(store, ARG);
        let T = this,
            F = T.unitl,
            maxsize = T.maxsize,
            part = T.part,
            result = await F.DB_ItemGet(Object.assign({
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
                        let subResult = await F.DB_ItemGet(Object.assign(ARG, {
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
            F = T.unitl,
            maxsize = T.maxsize,
            part = T.part;
        data = await F.DB_ConvertData(data, maxsize);
        if (data.contents && data.contents.byteLength > maxsize) {
            let filesize = data.contents.byteLength;
            let basecontent = {};
            Object.entries(data).forEach(entry => {
                if (entry[0] != 'contents') basecontent[entry[0]] = entry[1];
            });
            return await Promise.all(Array(Math.ceil(filesize / maxsize)).fill(name).map(async (v, k) => {
                let key = v,
                    start = k * maxsize;
                if (k > 0) key += part + k;
                return await F.DB_ItemPut({
                    store,
                    'data': Object.assign({
                        'contents': new Uint8Array(data.contents.subarray(start, filesize - start >= maxsize ? start + maxsize : filesize)),
                    }, basecontent, ),
                    'name': key,
                    dbName
                });
            }));
        }
        return await F.DB_ItemPut({
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
            F = T.unitl;
        if (clear) {
            let contents = await F.DB_ItemGet(Object.assign({
                store,
                name
            }, ARG));
            console.log(contents);
            if (contents && contents.filesize) {
                return await Promise.all(Array(Math.ceil(contents.filesize / T.maxsize)).fill(name.split(part)[0]).map(async (v, k) => {
                    let key = v;
                    if (k > 0) key += T.part + k;
                    return await F.DB_ItemRemove({
                        store,
                        'name': key
                    }) + '\n';
                }));

            }
        }
        return await F.DB_ItemRemove({
            store,
            name,
            dbName
        });
    }
    async getAllData(store, only, ARG) {
        return await this.unitl.DB_ItemAll(Object.assign({
            store,
            only
        }, ARG));
    }
    async getContent(store, name, version, ARG) {
        let result = await this.getItem(store, name, version, ARG);
        return result && result.contents || result;
    }
    async getAllKeys(store, dbName) {
        return await this.unitl.DB_ItemKeys({
            store,
            dbName
        });
    }
    async getAllCursor(store, key, only, ARG) {
        return await this.unitl.DB_ItemCursor(Object.assign({
            store,
            key,
            only
        }, ARG));
    }
    async clearDB(tables, dbName) {
        let F = this.unitl;
        if (!tables) return;
        if (typeof tables == 'string') tables = [tables];
        return await F.DB_clear(tables, dbName);
    }
    async deleteDB(tables, dbName) {
        let F = this.unitl;
        if (typeof tables == 'string') tables = [tables];
        return await F.DB_delete(tables, dbName);
    }
    async FetchItem(ARG) {
        if (!ARG || typeof ARG == 'string') ARG = {
            'url': ARG || '/'
        };
        let T = this,
            F = T.unitl,
            key = ARG.key || F.getname(ARG.url) || 'index.php',
            result,
            version = ARG.version,
            headers = {},
            response,
            unFile = (buf, password) => F.unFile(buf, Object.assign(ARG, {
                password
            })),
            callback = async result => {
                if (result && result.contents) {
                    if (result.type == 'unpack') result.contents = await unFile(result.contents, result.password)
                    ARG.success && ARG.success(result.contents, headers);
                    return result.contents;
                }
                ARG.success && ARG.success(result, headers);
                return result;
            };
        if (ARG.store && !ARG.unset) {
            result = await T.getItem(ARG.store, key, version, ARG);
            if (result) {
                if (!ARG.checksize) {
                    return callback(result);
                }
            }
        }
        response = await F.FetchStart(ARG);
        headers = F.FetchHeader(response, ARG);
        let password = headers['password'];
        if (response.status == 404) {
            ARG.error && ARG.error(response.statusText);
            return callback(result);
        } else if (result && result.filesize && headers["byteLength"] > 0) {
            if (result.filesize == headers["byteLength"]) return callback(result);
            if (result.contents) delete result.contents;
        };
        let contents = await F.FetchStream(response, headers, ARG),
            type = headers.type;
        if (contents.byteLength) {
            contents = new Uint8Array(contents.buffer || contents);
            type = 'Uint8Array';
        }
        let filesize = contents.byteLength || headers["byteLength"] || contents.length || 0;
        if (ARG.store && ARG.unpack && ARG.key != F.LibKey && filesize > T.maxsize) {
            type = 'unpack';
            await T.setItem(ARG.store, key, {
                contents,
                timestamp: new Date,
                filesize,
                version,
                type,
                password
            });
            delete ARG.store;
        }
        if (ARG.unpack && contents instanceof Uint8Array) {
            contents = await unFile(contents, password || ARG.password);
            if (!contents.byteLength) type = 'datalist';
            console.log(contents);
        }
        if (ARG.store && ARG.key == F.LibKey) {
            let contents2;
            if (contents instanceof Uint8Array) {
                contents = new File([contents], F.getname(ARG.url), {
                    'type': headers['type']
                });
                key = F.LibKey + '-' + F.getname(ARG.url);
                type = 'File';
            } else {
                await Promise.all(Object.entries(contents).map(async entry => {
                    let [name, data] = entry,
                    filename = name.split('/').pop(),
                        filetype = F.gettype(filename),
                        filedata = new File([data], filename, {
                            'type': filetype
                        });
                    T.Libjs[filename] = filedata;
                    await T.setItem(
                        ARG.store,
                        F.LibKey + '-' + filename, {
                            'contents': filedata,
                            'timestamp': T.DATE,
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
                delete ARG.store;
            }
        }
        if (ARG.store) {
            await T.setItem(ARG.store, key, {
                contents,
                timestamp: new Date,
                filesize,
                version,
                type
            });
        }
        ARG.success && ARG.success(contents, headers);
        return contents;
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
                this.$(!iscss ? 'body' : 'head').appendChild(script);
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
    async appendscript(js) {
        let url = /^(\/|https?:\/\/|static\/js\/|data\/)/.test(js) ? js : this.JSpath + js;
        let data = await this.FetchItem({
            url,
            store: 'data-libjs',
            key: 'script-' + js.split('/').pop(),
            version: this.version
        });
        return await this.addJS(data);
    }
    unFile(u8, process, ARG) {
        return this.unitl.unFile(u8, Object.assign({
            process
        }, ARG))
    }
    unitl = new class {
        async FetchStream(response, headers, ARG) {
            let downsize = headers["byteLength"] || 0,
                downtext = ARG.downtext && ARG.downtext || '进度:',
                havesize = 0;
            return new Response(new ReadableStream({
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
            }))[ARG.type || 'arrayBuffer']();
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
        async FetchStart(ARG) {
            let {
                url,
                get,
                post,
                postdata,
                form
            } = ARG || {}, fd, data = {};
            if (get) {
                url += (/\?/.test(url) ? '&' : '?') + new URLSearchParams(get).toString()
            }
            ['headers', 'context', 'referrer', 'referrerPolicy', 'mode', 'credentials', 'redirect', 'integrity', 'cache'].forEach(val => {
                if (ARG[val] != undefined) data[val] = ARG[val];
            });
            if (form || post) {
                if (typeof form == 'string') fd = new FormData(this.T.$(form));
                else if (form instanceof HTMLElement) {
                    fd = new FormData(form);
                } else if (form instanceof FormData) {
                    fd = form;
                } else {
                    fd = new FormData();
                }
                if (post) {
                    Object.entries(post).forEach(entry => fd.append(entry[0], entry[1]));
                }
            } else if (postdata) {
                fd = postdata;
            }
            if (fd) {
                data.method = 'POST';
                data.body = fd;
            }
            return await fetch(url, data).catch(e => {
                throw e
            });
        }
        async unRAR(u8, ARG) {
            let {
                process,
                password,
                packsrc
            } = ARG;
            let worker = new Worker(this.URL(await this.getLibjs(packsrc || 'rar.js')));
            return new Promise(complete => {
                let contents = {};
                worker.onmessage = result => {
                        let data = result.data;
                        if (1 === data.t) {
                            complete(contents);
                            result.target['terminate']();
                        } else if (2 === data.t) {
                            contents[data.file] = data.data;
                        } else if (4 === data.t && data.total > 0 && data.total >= data.current) {
                            process && process(ARG.packtext + ' ' + (data.name || '') + ' ' + Math.floor(Number(data.current) / Number(data.total) * 100) + '%', data.total, data.current);
                        }
                    },
                    worker.postMessage(!file ? {
                        data: u8,
                        password
                    } : u8);
            });

        }
        async un7z(u8, ARG) {
            ARG.packsrc = '7z.js';
            return this.unRAR(u8, ARG);
        }
        async unZip(u8, ARG = {}) {
            let {
                process,
                password,
                packtext
            } = ARG, F = this, T = F.T;
            await F.ZipInitJS();
            let zipReader = new zip.ZipReader(u8 instanceof Blob ? new zip.BlobReader(u8) : new zip.Uint8ArrayReader(u8));
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
            /*
            let {
                process,
                password,
                packtext
            } = ARG,F=this,T = F.T;
            await F.ZipInitJS();
            let zipFs = new zip.fs.FS(),contents={};
            await zipFs[u8 instanceof Blob ?'importBlob':'importUint8Array'](u8,{'filenameEncoding':T.Encoding});
            await Promise.all(
                zipFs.entries.map(async entry=>{
                let data = entry.data;
                if(!data ||data.directory)return ;
                let opt = {
                    'onprogress':(a,b)=>process&&process(packtext+entry.name+':'+Math.ceil(a*100/b)+'%')
                };
                if(!data.encrypted){
                    contents[data.filename] = await entry.getUint8Array(opt);
                }else{
                    contents[data.filename] = await F.ZipData(entry,opt,password);
                }
                return true;
            })) ;
            delete F.ZipPassword;
            return contents;
            */
        }
        ZipWait() {
            if (this.ZipPassword == undefined) return;
            return new Promise(complete => {
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
            if (!window.zip) await T.addJS(await F.getLibjs(F.Libzip));
            return true;
        }
        async ZipAddFile(files, password, ZipWriter, options, comment) {
            if (!ZipWriter) ZipWriter = await this.ZipCreate(password);
            if (files instanceof File) await ZipWriter.add(files.name, new zip.BlobReader(files), options);
            else await Promise.all(Array.from(files).map(async file => await ZipWriter.add(file.name, new zip.BlobReader(file), options)));
            return await ZipWriter.close(comment);
        }
        async unFile(u8, ARG = {}) {
            if (typeof ARG == 'string') ARG.unMode = {
                'unMode': ARG
            };
            ARG.packtext = ARG.packtext || '解压:';
            if (ARG.unMode && this[ARG.unMode]) return await this[ARG.unMode](u8, ARG);
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
                if (!action) {
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
            if (action && this[action]) return await this[action](u8, ARG);
            return u8;
        }
        get random() {
            return Number(Math.random().toString().slice(2))
        }
        getname(str) {
            return (str || '').split('/').pop().split('?')[0];
        }
        gettype(type) {
            type = this.getname(type).split('.').pop().toLowerCase();
            if (!this.mime_list) {
                this.mime_list = {};
                Object.entries(this.mime_map).forEach(entry => entry[1].forEach(m => this.mime_list[m] = entry[0] + (entry[0].includes('/') ? '' : '/' + m)));
            }
            return this.mime_list[type] || 'application/octet-stream';
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
                let result = Object.entries(this.mime_preg).filter(entry => entry[1].test(head))[0];
                if (result) return result[0];
            }
            return defalut || 'unkonw';
        }
        URL(u8, type) {
            let F = this;
            if (u8 instanceof Uint8Array) {
                if (!type) type = F.gettype(F.checkBuffer(u8));
            } else if (typeof u8 == 'string') {
                if (/^(blob|http)/.test(u8) || /^\/?[\w\-_\u4e00-\u9FA5:\/\.\?\^\+ =%&@#~]+$/.test(u8)) return u8;
                if (!type) type = F.gettype('js');
            }
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
        get DB() {
            return this.DB_STORE[this.T.DB_NAME];
        }
        get DB_idb() {
            return window.indexedDB || window.webkitindexedDB;
        }
        DB_GETMAP(ARG) {
            let {
                store,
                dbName,
                dbIndex
            } = ARG || {}, F = this,
                T = F.T;
            if (!F.DB_MAP) {
                F.DB_MAP = Object.assign({}, T.DB_MAP_LIST || {});
                if (T.DB_NAME && !F.DB_MAP[T.DB_NAME]) {
                    F.DB_MAP[T.DB_NAME] = {};
                    T.DB_STORE_MAP && Object.entries(T.DB_STORE_MAP).forEach(entry => {
                        let key = entry[1] == null || typeof entry[1] != 'string' ? entry[0] : entry[1];
                        F.DB_MAP[T.DB_NAME][key] = key == entry[1] ? {
                            'timestamp': false
                        } : entry[1] || {};
                    });
                }
            }
            if (dbName) {
                !F.DB_MAP[dbName] && (F.DB_MAP[dbName] = {});
                if (store) {
                    !F.DB_MAP[dbName][store] && (F.DB_MAP[dbName][store] = {});
                    if (dbIndex) {
                        if (typeof dbIndex == 'string') F.DB_MAP[dbName][store][dbIndex] = false;
                        else Object.assign(F.DB_MAP[dbName][store], dbIndex);
                    }
                }
            }
            return F.DB_MAP;

        }
        async DB_LOAD(ARG = {}) {
            let store = ARG.store,
                F = this,
                T = F.T,
                DB_Name = ARG.dbName || T.DB_NAME,
                DB = F.DB_STORE[DB_Name];
            if (DB && (!store || F.DB_checkTable(store, DB))) {
                return DB;
            }
            await F.DB_INSTALL(F.DB_GETMAP(Object.assign(ARG || {}, {
                'dbName': DB_Name
            })));
            return F.DB_STORE[DB_Name];
        }
        async DB_INSTALL(DB_MAP) {
            let F = this;
            console.log('install indexDB');
            await Promise.all(Object.entries(DB_MAP).map(async dbmap => {
                let [mapName, dbTable] = dbmap,
                DB = F.DB_STORE[mapName],
                    dbVer;
                if (DB) {
                    let notTable = Object.entries(dbTable).filter(v => !F.DB_checkTable(v[0], DB));
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
            return new Promise((resolve, reject) => {
                let req = F.DB_idb.open(dbName, dbVer);
                req.addEventListener('error', async err => {
                    console.log(err, req.error);
                    reject(err);
                });
                req.addEventListener('upgradeneeded', async e => {
                    let DB = req.result;
                    if (ARG.dbUpgrad) {
                        await ARG.dbUpgrad.apply(req, [DB]);
                    } else {
                        await F.DB_CreateTable(Object.assign(ARG, {
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
                        let notTable = Object.entries(dbTable).filter(v => !F.DB_checkTable(v[0], DB));
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
        async DB_CreateTable(ARG) {
            let {
                dbTable,
                DB
            } = ARG || {};
            if (!dbTable || !DB) return;
            let F = this;
            await Promise.all(
                Object.entries(dbTable).map(
                    async tableData => {
                        let options, [keyTable, keyData] = tableData;
                        if (keyData.options) {
                            options = keyData.options;
                            delete keyData.options;
                        }
                        let DBObjectStore, keylist = Object.entries(keyData);
                        if (!F.DB_checkTable(keyTable, DB)) {
                            DBObjectStore = await DB.createObjectStore(keyTable, options);
                            F.DB_CreateIndex(keylist, DBObjectStore);
                        }
                    }
                )
            );
        }
        DB_CreateIndex(keylist, DBObjectStore) {
            keylist.forEach(
                key_map => {
                    let [key, opt] = key_map;
                    !DBObjectStore.indexNames.contains(key) && DBObjectStore.createIndex(key, key, opt && opt.unique ? opt : {
                        "unique": false
                    });
                }
            );
        }
        DB_checkTable(list, DB, len) {
            if (typeof list == 'string') list = [list];
            list = list ? list.filter(v => DB.objectStoreNames.contains(v)) : [];
            if (len) return list;
            return list.length;
        }
        async DB_ConvertData(data, maxsize) {
            if (data instanceof Promise) data = await data;
            let contents = data.contents || data,
                result = {};
            if (typeof contents == 'string' && contents.length > maxsize) {
                contents = new TextEncoder().encode(contents);
                Object.assign(result, {
                    contents,
                    filesize: contents.byteLength,
                    'type': 'String',

                });
            } else if (contents instanceof Blob && contents.size > maxsize) {
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
            if (typeof ARG == 'string') ARG = {
                'store': ARG
            };
            ARG = Object.assign({
                'dbName': T.DB_NAME
            }, ARG);
            let {
                store,
                dbName
            } = ARG, DB = F.DB_STORE[dbName] || F.DB;
            if (!DB || !F.DB_checkTable(store, DB)) DB = await F.DB_LOAD(ARG);
            ReadMode = ReadMode ? "readonly" : "readwrite";
            if (!store) store = DB.objectStoreNames[0];
            else if (!F.DB_checkTable(store, DB)) return T.Err('store is null');
            let DBTransaction = DB.transaction([store], ReadMode);
            DBTransaction.onerror = e => {
                e.preventDefault();
                throw DBTransaction.error;
            };
            return DBTransaction.objectStore(store);
        }
        async DB_ItemGet(ARG) {
            if (typeof ARG == 'string') ARG = {
                'name': ARG
            };
            let name = ARG.name,
                DB = await this.DB_SELECT(ARG, !0);
            if (name) return new Promise(resolve => {
                DB.get(name).onsuccess = e => resolve(e.target.result);
            });
        }
        async DB_ItemPut(ARG) {
            let {
                data,
                name
            } = ARG || {}, DB = await this.DB_SELECT(ARG);
            return new Promise(resolve => {
                DB.put(data, name).onsuccess = e => resolve(e.target.result);
            });
        }
        async DB_ItemRemove(ARG) {
            if (typeof ARG == 'string') ARG = {
                'name': ARG
            };
            let name = ARG.name,
                DB = await this.DB_SELECT(ARG);
            if (name) return new Promise((resolve, reject) => {
                DB.delete(name).onsuccess = e => resolve(`delete:${name}`);
            });
        }
        async DB_ItemAll(ARG) {
            let F = this,
                T = F.T,
                DB = await F.DB_SELECT(ARG, !0);
            return new Promise(callback => {
                let entries = {};
                DB.openCursor().onsuccess = evt => {
                    let cursor = evt.target.result;
                    if (cursor) {
                        if (ARG.only === true && T.part && T.maxsize && cursor.value.contents instanceof Uint8Array && cursor.value.filesize > T.maxsize) {
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
        async DB_ItemKeys(ARG) {
            if (typeof ARG == 'string') ARG = {
                'dbName': ARG
            };
            let DB = await this.DB_SELECT(ARG, !0);
            return new Promise(resolve => {
                DB.getAllKeys().onsuccess = e => {
                    resolve(e.target.result)
                };
            });

        }
        async DB_ItemCursor(ARG) {
            if (typeof ARG == 'string') ARG = {
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
                return F.DB_ItemKeys(ARG);
            }
            return new Promise(resolve => {
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
        async DB_clear(tables, dbName) {
            if (typeof tables == 'string') tables = [tables];
            return await Promise.all(tables.map(async store => {
                let DB = await F.DB_SELECT({
                    store,
                    dbName
                });
                DB.clear();
            }));
        }
        DB_REMOVE(dbName) {
            return this.DB_idb.deleteDatabase(dbName || this.T.DB_NAME);
        }
        async DB_delete(tables, dbName) {
            if (!tables) return this.DB_REMOVE(dbName);
            let F = this,
                DB = await F.DB_LOAD({
                    dbName
                }),
                dbVer = DB.version + 1,
                list = F.DB_checkTable(tables, DB, !0);
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
        Libjs = {};
        LibPack = 'libjs.png';
        LibStore = 'data-libjs';
        LibKey = 'libjs';
        Libzip = 'zip.min.js';
        async getLibjs(file) {
            let F = this,
                T = F.T;
            if (F.Libjs[file]) return F.Libjs[file];
            let contents = await T.getContent('data-libjs', F.LibKey + '-' + file, T.version);
            if (!contents) {
                let zip = F.Libzip,
                    path = T.JSpath;
                F.Libjs[zip] = path + zip + '?' + F.random;
                if (file != zip) {
                    await T.FetchItem({
                        url: path + F.LibPack,
                        'store': 'data-libjs',
                        'key': F.LibKey,
                        'unpack': true,
                        'filename': file
                    });
                }
            }
            if (F.Libjs[file] instanceof File) {
                if (file == 'rar.js') {
                    let memurl = F.URL(await F.getLibjs('rar.mem'));
                    let rarurl = F.URL(contents);
                    contents = `var dataToPass=[],password;self.Module={locateFile:()=>'` + memurl + `',monitorRunDependencies:function(t){0==t&&setTimeout((function(){unrar(dataToPass,password||null)}),100)},onRuntimeInitialized:function(){}};
                importScripts('` + rarurl + `');let unrar=function(t,e){let n=readRARContent(t.map((function(t){return{name:t.name,content:new Uint8Array(t.content)}})),e,(function(t,e,n){postMessage({t:4,current:n,total:e,name:t})})),o=function(t){if("file"===t.type)postMessage({t:2,file:t.fullFileName,size:t.fileSize,data:t.fileContent});else{if("dir"!==t.type)throw"Unknown type";Object.keys(t.ls).forEach((function(e){o(t.ls[e])}))}};return o(n),postMessage({t:1}),n};onmessage=function(t){dataToPass.push({name:"test.rar",content:t.data.data});if(!password&&t.data.password)password=t.data.password;};`;
                    F.Libjs[file] = new File([contents], file, {
                        'type': F.gettype('js'),
                        'x-content-type-options': 'nosniff'
                    });
                } else {
                    F.Libjs[file] = contents;
                }
            }
            return F.Libjs[file];
        }
        constructor(t) {
            Object.defineProperties(this, {
                'T': {
                    get: () => t
                },
            });
        }
    }(this);
    on(elm, evt, fun, opt, cap) {
        (elm || document).addEventListener(evt, fun, opt === false ? {
            passive: false
        } : opt, cap);
    }
    un(elm, evt, fun, opt, cap) {
        (elm || document).removeEventListener(evt, fun, opt === false ? {
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
    $ = (e, f) => e instanceof Function ? this.docload(e) : e instanceof Element ? e : (f || document).querySelector(e);
    $$ = (e, f) => (f || document).querySelectorAll(e);
    $ce = e => document.createElement(e);
    $attr = {
        'active': {
            get: function () {
                return this.classList.contains('active')
            },
            set: function (bool) {
                return this.classList[bool ? 'add' : 'remove']('active')
            }
        },
        'Attr': {
            get: function () {
                return this.getAttr()
            },
            set: function (attr) {
                return this.setAttr(attr)
            }
        },
        'getAttr': function (name) {
            let elm = this;
            if (name) return elm.getAttribute(name);
            return Object.fromEntries(Array.from(elm.attributes || []).map(attr => [attr.name, attr.value]));
        },
        'setAttr': function (attr, value) {
            let elm = this;
            if (typeof attr == 'string') return value == undefined ? elm.removeAttribute(attr) : elm.setAttribute(attr, value);
            return Object.entries(attr).forEach(entry => elm.setAttribute(entry[0], entry[1]));
        },
        '$': function (e) {
            return T.$(e, this);
        },
        '$$': function (e) {
            return T.$$(e, this);
        },
        'on': function (evt, func, opt) {
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
            return T.on(this, evt, func, opt);
        },
        'un': function (evtname) {
            this.eventList && this.eventList.forEach(value => {
                let {
                    evt,
                    func,
                    opt
                } = value;
                if (!evtname) T.un(evt, func, opt);
                else if (evtname == evt) T.un(evt, func, opt);
            })
        },
        'once': function (evt, func, cap) {
            return T.once(this, evt, func, cap);
        }
    };
    $elm(e, f) {
        let T = this,
            elm = T.$(e, f);
        if (!elm) T.Error(e);
        else if (!elm.Attr) Object.entries(T.$attr).forEach(entry => {
            let [k, value] = entry;
            Object.defineProperty(elm, k, !value.get? {
                value
            } : value)
        });
        return elm;
    };
    Err(msg) {
        throw new Error(msg);
    }
};