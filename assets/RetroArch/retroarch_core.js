const Nenge = new class {
    DB_NAME = 'RetroArch_WEB';
    DB_STORE_MAP = {
        'data-libjs': null,
        'data-rooms': null,
        'data-info': null,
        '/userdata': 'userdata',
        '/home/web_user/retroarch/userdata': 'retroarch',
    };
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
    lang = {};
    DATE = new Date();
    JSpath = document.currentScript && document.currentScript.src.split('/').slice(0, -1).join('/') + '/';
    isMobile = 'ontouchend' in document;
    $ = (e, f) => e instanceof Function ? this.docload(e) : (f || document).querySelector(e);
    $$ = (e, f) => (f || document).querySelectorAll(e);
    $ce = e => document.createElement(e);
    Err(msg) {
        throw new Error(msg);
    }
    async getItem(STORE_TABLE, name, version) {
        if (!name || name instanceof Function) return await this.GetItems(STORE_TABLE, name || cb);
        let T = this,
            F = T.unitl,
            maxsize = T.maxsize,
            part = T.part;
        let result = await F.getItem(STORE_TABLE, name);
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
                let subresult = await F.getItem(STORE_TABLE, entry);
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
    async setItem(STORE_TABLE, name, data, cb) {
        let T = this,
            F = T.unitl,
            maxsize = T.maxsize,
            part = T.part,
            type = data.type || '';
        if (data instanceof Promise) data = await data;
        if ((typeof data == 'string' && data > maxsize / 2) || (typeof data.contents == 'string' && data.contents > maxsize / 2)) {
            if (data.contents) data.contents = new TextEncoder().encode(data.contents);
            else data = {
                'contents': new TextEncoder().encode(data)
            };
            Object.assign(data, {
                'type': 'string'
            });
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
                    return await F.setItem(
                        STORE_TABLE,
                        Object.assign({}, basecontent, {
                            'contents': new Uint8Array(data.contents.subarray(start, end)),
                        }),
                        key
                    );
                })
            );
            delete data.contents;
            data = null;
            basecontent = null;
            cb instanceof Function && cb(result);
            return result;
        }
        let result = await F.setItem(STORE_TABLE, data, name);
        cb instanceof Function && cb(result);
        return result;
    }
    async removeItem(STORE_TABLE, name, clear) {
        let T = this,
            F = T.unitl;
        if (clear) {
            let contents = await F.getItem(STORE_TABLE, name);
            console.log(contents);
            if (contents && contents.filesize && contents.filesize > T.maxsize) {
                let maxLen = Math.ceil(contents.filesize / T.maxsize),
                    part = T.part,
                    keys = name.split(part)[0],
                    result = '';
                result += await F.removeItem(STORE_TABLE, keys) + '\n';
                for (let i = 1; i < maxLen; i++) result += await F.removeItem(STORE_TABLE, keys + part + i) + '\n';
                contents = null;
                return result;

            }
        }
        return await F.removeItem(STORE_TABLE, name);
    }
    async getContent(STORE_TABLE, name, version) {
        let result = await this.getItem(STORE_TABLE, name);
        if (!result) return undefined;
        if (version && (!result.version || version != result.version)) return undefined;
        return result.contents || result;
    }
    async getAllKeys(STORE_TABLE, cb, only) {
        let result = await this.unitl.getItemKey(STORE_TABLE, only);
        cb instanceof Function && cb(result);
        return result;
    }
    async getAllCursor(STORE_TABLE, key, cb, only) {
        let T = this,
            F = T.unitl,
            result = await F.getItemCursor(STORE_TABLE, key, only);
        cb instanceof Function && cb(result);
        return result;

    }
    async GetItems(STORE_TABLE, cb, only) {
        let result = await this.unitl.getAllItem(STORE_TABLE, only);
        cb instanceof Function && cb(result);
        return result;
    }
    async clearDB(STORE_TABLE, dbName) {
        let F = this.unitl;
        if (!STORE_TABLE) return;
        let DB = await F.DB_select(STORE_TABLE, dbName);
        DB.clear();
    }
    async deleteDB(STORE_TABLE, dbName) {
        let F = this.unitl;
        if (!STORE_TABLE) return F.indexedDB.deleteDatabase(dbName || this.DB_NAME);
        await F.deleteTable(STORE_TABLE, dbName);
    }
    async FectchItem(ARG) {
        if (typeof ARG == 'string') ARG = {
            'url': ARG
        };
        let T = this,
            F = T.unitl,
            key = ARG.key || F.getname(ARG.url) || 'index.php',
            result,
            version = ARG.version,
            headers = {},
            response,
            packtext = ARG.packtext && ARG.packtext || '解压:',
            unFile = (buf, p) => F.unFile(buf, (e, n) => ARG.process && ARG.process(packtext + (n ? n + ' ' : '') + e), p || ARG.password),
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
        headers = F.FetchHeader(response, ARG);
        let password = headers['password'];
        if (response.status == 404) {
            ARG.error && ARG.error(response.statusText);
            return callback(result);
        } else if (result && result.filesize && headers["byteLength"] > 0) {
            if (result.filesize == headers["byteLength"]) return callback(result);
            if (result.contents) delete result.contents
        };
        let contents = await F.FetchStream(response, headers, ARG),
            type = headers.type;
        if (contents.byteLength) {
            contents = new Uint8Array(contents);
            type = 'Uint8Array';
        }
        let filesize = contents.byteLength || headers["byteLength"] || contents.length || 0;
        if (ARG.unpack && ARG.store && filesize > T.maxsize) {
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
        }
        if (ARG.store) {
            if (ARG.key == 'libdata') {
                let contents2;
                if (contents instanceof Uint8Array) {
                    contents = new File([contents], F.getname(ARG.url), {
                        'type': headers['type']
                    });
                } else {
                    await Promise.all(Object.entries(contents).map(async entry => {
                        let [name, data] = entry,
                        filename = name.split('/').pop(),
                            filetype = F.gettype(filename),
                            filedata = new File([data], filename, {
                                'type': filetype
                            });
                        T.setItem(
                            ARG.store,
                            key + '-' + filename, {
                                'contents': filedata,
                                'timestamp': T.DATE,
                                'filesize': data.byteLength,
                                'version': T.version,
                                'type': filetype
                            }
                        );
                        if (ARG.filename == filename) {
                            contents2 = filedata;
                        }
                        return true;
                    }));
                }
                if (contents2) contents = contents2;
            } else {
                await T.setItem(ARG.store, key, {
                    contents,
                    timestamp: new Date,
                    filesize,
                    version,
                    type
                });
            }
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
    once(elm, evt, fun, opt, cap) {
        return this.on(elm, evt, fun, {
            passive: false,
            once: true
        }, cap);
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
    constructor() {}
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
            /*
            
zipFs = new zip.fs.FS();
await zipFs.importBlob(zippedBlob);
const firstEntry = zipFs.children[0];
const unzippedBlob = await firstEntry.getBlob(zip.getMimeType(firstEntry.name));
             */
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
            if (!window.zip) await this.T.addJS(await this.getLibjs('zip.min.js'));
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
        istext(type) {
            return this.gettype(type).includes('text');
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
        checkBuffer(u8) {
            let head = Array.from(u8.slice(0, 8)).map(v => v.toString(16).padStart(2, 0).toLocaleUpperCase()).join('');
            for (let ext in this.mime_preg) {
                if (this.mime_preg[ext].test(head)) return ext;
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
        indexedDB = window.indexedDB || window.webkitindexedDB;
        DB_STORE = {};
        get DB() {
            return this.DB_STORE[this.T.DB_NAME];
        }
        getDB_MAP(STORE_TABLE, STORE_INDEX, STORE_NAME) {
            let F = this,
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
            if (STORE_NAME) {
                !F.DB_MAP[STORE_NAME] && (F.DB_MAP[STORE_NAME] = {});
                if (STORE_TABLE) {
                    !F.DB_MAP[STORE_NAME][STORE_TABLE] && (F.DB_MAP[STORE_NAME][STORE_TABLE] = {});
                    if (STORE_INDEX) {
                        if (typeof STORE_INDEX == 'string') F.DB_MAP[STORE_NAME][STORE_TABLE][STORE_INDEX] = false;
                        else Object.assign(F.DB_MAP[STORE_NAME][STORE_TABLE], STORE_INDEX);
                    }
                }
            }
            return F.DB_MAP;

        }
        async DB_load(STORE_TABLE, STORE_NAME, STORE_INDEX) {
            let F = this,
                T = F.T,
                DB_MAP = F.getDB_MAP(STORE_TABLE, STORE_INDEX, STORE_NAME),
                Name = STORE_NAME || T.DB_NAME,
                DBDatabase = F.DB_STORE[Name];
            if (DBDatabase && DBDatabase.objectStoreNames.contains(STORE_TABLE)) {
                return DBDatabase;
            }
            console.log('install indexDB');
            await Promise.all(Object.entries(DB_MAP).map(async dbmap => {
                let storeName = dbmap[0],
                    DB = F.DB_STORE[storeName],
                    TABLE = dbmap[1],
                    version;
                if (DB) {
                    let list = DB.objectStoreNames;
                    for (var table in TABLE) {
                        if (!list.contains(table)) {
                            version = DB.version + 1;
                        }
                    }
                    if (!version) return 'ok';
                    DB.close();
                }
                return await F.DB_install(storeName, {
                    version,
                    TABLE
                });
            }));
            return F.DB_STORE[Name];
        }
        async DB_install(STORE_NAME, ARG) {
            ARG = ARG || {};
            if (typeof ARG == 'string') ARG = {
                store: ARG
            };
            let F = this,
                T = F.T,
                mb = ARG.db || F.DB_STORE[STORE_NAME];
            if (ARG.version) {
                mb && mb.close();
            } else if (mb) {
                return mb;
            }
            return new Promise((resolve, reject) => {
                let req = F.indexedDB.open(STORE_NAME, ARG.version);
                req.addEventListener('error', async err => {
                    console.log(err, req.error);
                    reject(err);
                });
                req.addEventListener('upgradeneeded', async e => {
                    let DB = req.result,
                        Names = DB.objectStoreNames;
                    if (ARG.upgrad) {
                        await ARG.upgrad.apply(req, [DB, Names]);
                    } else if (ARG.TABLE) {
                        await F.DB_creatTable(ARG.TABLE, DB,Names);
                    }
                });
                req.addEventListener('versionchange', e => {
                    console.log(11);
                });
                req.addEventListener('success', async e => {
                    let DB = req.result,
                        Names = DB.objectStoreNames;
                    if (ARG.success) {
                        ARG.success.apply(req, [DB,Names]);
                    } else if (!ARG.once && ARG.TABLE) {
                        ARG.version = DB.version + 1;
                        ARG.db = DB;
                        ARG.once = true;
                        for (let table in ARG.TABLE) {
                            if (!Names.contains(table)) return F.DB_install(STORE_NAME, ARG).then(db => resolve(db));
                        }
                    }
                    F.DB_STORE[STORE_NAME] = DB;
                    resolve(DB);
                });
            });
        }
        async DB_creatTable(TABLE, DB, list) {
            list = list || DB.objectStoreNames;
            let F = this;
            await Promise.all(
                Object.entries(TABLE).map(
                    async table => {
                        let DBObjectStore,keylist = Object.entries(table[1]);
                        if (!list.contains(table[0])) {
                            DBObjectStore = await DB.createObjectStore(table[0]);
                            keylist.length && F.DB_creatIndex(keylist, DBObjectStore);
                        }
                    }
                )
            );
        }
        DB_creatIndex = (keylist, DBObjectStore) =>keylist.forEach(
                indexKey => {
                    DBObjectStore.indexNames.contains(indexKey[0]) && DBObjectStore.createIndex(indexKey[0], indexKey[0], indexKey[1]||{"unique":false});
                }
            );
        async DB_select(STORE_TABLE, DB_NAME, ReadMode, DB_INDEX) {
            let F = this,
                DBDatabase = F.DB_STORE[DB_NAME] || F.DB;
            if (!DBDatabase || !DBDatabase.objectStoreNames.contains(STORE_TABLE)) DBDatabase = await F.DB_load(STORE_TABLE, DB_NAME, DB_INDEX);
            ReadMode = ReadMode ? "readonly" : "readwrite";
            let DBTransaction = DBDatabase.transaction([STORE_TABLE], ReadMode);
            DBTransaction.onerror = e => {
                e.preventDefault();
                throw DBTransaction.error;
            };
            return DBTransaction.objectStore(STORE_TABLE);
        }
        async getItem(store, name, dbName) {
            let DB = await this.DB_select(store, dbName, !0);
            return new Promise(resolve => {
                DB.get(name).onsuccess = e => resolve(e.target.result);
            });
        }
        async setItem(store, data, name, dbName) {
            let DB = await this.DB_select(store, dbName);
            return new Promise(resolve => {
                DB.put(data, name).onsuccess = e => resolve(e.target.result);
            });
        }
        async removeItem(store, name, dbName) {
            let DB = await this.DB_select(store, dbName);
            return new Promise((resolve, reject) => {
                DB.delete(name).onsuccess = e => resolve(`delete:${name}`);
            });
        }
        async getAllItem(store, only, dbName) {
            let F = this,
                T = F.T,
                DB = await F.DB_select(store, dbName, !0);
            return new Promise(callback => {
                let entries = {};
                DB.openCursor().onsuccess = evt => {
                    let cursor = evt.target.result;
                    if (cursor) {
                        if (only === true && cursor.value.contents instanceof Uint8Array && cursor.value.filesize > T.maxsize) {
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
        async getItemKey(store, dbName) {
            let DB = await this.DB_select(store, dbName, !0);
            return new Promise(resolve => {
                this.DB_select(store, dbName, !0)
                DB.getAllKeys().onsuccess = e => {
                    resolve(e.target.result)
                };
            });

        }
        async getItemCursor(store, key, only, dbName) {
            let DB = await this.DB_select(store, dbName, !0),
                len = DB.indexNames.length;
            if (len && !key) {
                key = DB.indexNames[0];
            } else if (!len) {
                return this.getItemKey(store, dbName);
            }
            return new Promise(resolve => {
                let entries = {};
                DB.index(key).openKeyCursor().onsuccess = evt => {
                    let cursor = evt.target.result;
                    if (cursor) {
                        if (only !== true || !cursor.primaryKey.includes(T.part)) {
                            entries[cursor.primaryKey] = {
                                "timestamp": cursor.key
                            };
                        }
                        cursor.continue()
                    } else {
                        resolve(entries)
                    }
                }
            })

        }
        async deleteTable(STORE_TABLE, dbName) {
            let F = this,
                DB = await F.DB_load(STORE_TABLE, dbName),
                version = DB.version + 1,
                name = DB.name;
            DB.close();
            return await F.DB_install(name, {
                version,
                upgrad: DB => {
                    DB.deleteObjectStore(STORE_TABLE);
                }
            });

        }
        Libjs = {};
        LibPack = 'libjs.png';
        LibStore = 'data-libjs';
        async getLibjs(file) {
            let F = this,
                T = F.T;
            if (F.Libjs[file]) return F.Libjs[file];
            let contents = await T.getContent('data-libjs', 'libdata-' + file, T.version);
            if (!contents) {
                let zip = 'zip.min.js',
                    path = T.JSpath;
                F.Libjs[zip] = path + zip + '?' + F.random;
                if (file != zip) {
                    contents = await T.FectchItem({
                        url: path + F.LibPack,
                        'store': 'data-libjs',
                        'key': 'libdata',
                        'unpack': true,
                        'filename': file
                    });
                }
            }
            if (contents) {
                if (file == 'rar.js') {
                    let memurl = F.URL(await F.getLibjs('rar.mem'));
                    let rarurl = F.URL(contents);
                    contents = `var dataToPass=[],password;self.Module={locateFile:()=>'` + memurl + `',monitorRunDependencies:function(t){0==t&&setTimeout((function(){unrar(dataToPass,password||null)}),100)},onRuntimeInitialized:function(){}};
                importScripts('` + rarurl + `');let unrar=function(t,e){let n=readRARContent(t.map((function(t){return{name:t.name,content:new Uint8Array(t.content)}})),e,(function(t,e,n){postMessage({t:4,current:n,total:e,name:t})})),o=function(t){if("file"===t.type)postMessage({t:2,file:t.fullFileName,size:t.fileSize,data:t.fileContent});else{if("dir"!==t.type)throw"Unknown type";Object.keys(t.ls).forEach((function(e){o(t.ls[e])}))}};return o(n),postMessage({t:1}),n};onmessage=function(t){dataToPass.push({name:"test.rar",content:t.data.data});if(!password&&t.data.password)password=t.data.password;};`;
                    F.Libjs[file] = new File([contents], file, {
                        'type': F.gettype(file),
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
};