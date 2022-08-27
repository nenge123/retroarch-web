(function () {
    let T = this;
    this.FsMount = class FsMount {
        constructor(Obj) {
            Object.entries(Obj).forEach(entry => {
                Object.defineProperty(this, entry[0], {
                    get: () => entry[1]
                })
            });
            this.speed = T.speed ? T.speed : 1000 / 60;
            this.MEMFS.stream_ops.write = this.ops_write;
            if (this.MEMFS.ops_table) this.MEMFS.ops_table.file.stream.write = this.ops_write;
        }
        mount(mount) {
            if (!this.FS.analyzePath(mount.mountpoint).exists) {
                this.FS.createPath('/', mount.mountpoint, !0, !0);
            }
            let len = mount.mountpoint.split('/').length;
            let node = this.MEMFS.createNode(len < 3 ? this.FS.root : null, len < 3 ? mount.mountpoint.split('/').pop() : mount.mountpoint.replace(/^\//, ''), 16384 | 511, 0);
            if (this.getStoreName(mount)) {
                if (!this.__mount) this.__mount = [];
                this.__mount.push(this.syncfs(mount, e => console.log(e)));
            }
            return node;
        }
        mountReady = () => Promise.all(this.__mount || []);
        getStoreName = mount => T.DB_STORE_MAP[mount.mountpoint];
        async syncfs(mount, callback, error) {
            callback = error instanceof Function ? error : callback;
            let storeName = this.getStoreName(mount);
            if (!storeName) return console.log('indexDB Store Name erro', mount);
            let result;
            if (!mount.isReady) {
                result = await this.writeToFS(storeName);
            } else {
                result = await this.syncWrite(storeName, mount);
            }
            mount.isReady = true;
            (callback instanceof Function) && callback(result);
            return result;
        }
        async writeToFS(db) {
            return Object.entries(await T.getAllData(db,true)).map(entry => this.storeLocalEntry(entry[0], entry[1])).join('');
        }
        async syncWrite(storeName, mount) {
            let IsReady = mount.isReady,
                local = this.getLocalSet(mount),
                remote = await this.getRemoteSet(storeName),
                src = (IsReady ? local : remote).entries || {},
                dst = (!IsReady ? local : remote).entries || {};
                return (await Promise.all(Object.entries(src).filter(entry => {
                    if (!entry[1]) return '';
                    let path = entry[0],
                        e2 = dst[path];
                    if (!e2 || entry[1].timestamp > e2.timestamp) {
                        return true;
                    }
                    return false;

                }).map(entry => entry[0]).sort().map(async path => {
                    if (!IsReady) {
                        let contents = await T.getItem(storeName, path);
                        if (contents) {
                            return this.storeLocalEntry(path, contents);
                        }
                    } else {
                        let contents = this.loadLocalEntry(path);
                        if (contents) {
                            await T.setItem(storeName, path, contents);
                            return 'DB saved:' + path + '\n';
                        }
                    }
                }))).join('') + (await Promise.all(Object.entries(dst).filter(entry => {
                    if (!entry[1]) return '';
                    let e2 = src[entry[0]],
                        path = entry[0];
                    if (!e2 || entry[1].timestamp > e2.timestamp) {
                        return true;
                    }
                    return false;

                }).map(entry => entry[0]).sort().map(async path => {
                    let msg = '';
                    if (!IsReady) {
                        this.removeLocalEntry(path);
                        msg = 'FS remove:';
                    } else {
                        await T.removeItem(storeName, path, true);
                        msg = 'DB remove:';
                    }
                    return msg + entry[0] + '\n';
                }))).join('');
        }
        loadLocalEntry(path) {
            let FS = this.FS,
                stat, node;
            if (FS.analyzePath(path).exists) {
                var lookup = FS.lookupPath(path);
                node = lookup.node;
                stat = FS.stat(path)
            } else {
                return path + ' is exists'
            }
            if (FS.isDir(stat.mode)) {
                return {
                    timestamp: stat.mtime,
                    mode: stat.mode
                };
            } else if (FS.isFile(stat.mode)) {
                node.contents = this.getFileDataAsTypedArray(node);
                return {
                    timestamp: stat.mtime,
                    mode: stat.mode,
                    contents: node.contents
                };
            } else {
                return "node type not supported";
            }
        }
        storeLocalEntry(path, entry) {
            let FS = this.FS
            if (FS.isDir(entry.mode)) {
                !FS.analyzePath(path).exists && FS.createPath('/', path, !0, !0)
            } else if (FS.isFile(entry.mode)) {
                let p = path && path.split('/').slice(0, -1).join('/');
                if (p && !FS.analyzePath(p).exists) FS.createPath('/', p, !0, !0);
                FS.writeFile(path, entry.contents, {
                    canOwn: true,
                    encoding: "binary"
                });
            } else {
                T.Err("node type not supported");
            }
            FS.chmod(path, entry.mode);
            FS.utime(path, entry.timestamp, entry.timestamp);
            return 'FS saved:' + path + '\n';
        }
        removeLocalEntry(path) {
            if (FS.analyzePath(path).exists) {
                var stat = FS.stat(path);
                if (FS.isDir(stat.mode)) {
                    FS.rmdir(path)
                } else if (FS.isFile(stat.mode)) {
                    FS.unlink(path)
                }
                return 'FS unlink:' + path + '\n';
            } else {
                return path + 'is not exists\n';
            }
        }
        async getRemoteSet(store, callback) {
            let remote = {
                'type': "remote",
                store,
                entries: await T.getAllCursor(store, 'timestamp',true)
            };
            callback && callback(remote);
            return remote;
        }
        getLocalSet(mount, callback) {
            if (!mount) T.Err('mount:PATH ERROR');
            let result = {
                "type": "local",
                entries: this.getLocalList(mount.mountpoint)
            };
            callback && callback(result);
            return result
        }
        getLocalList(mountpoint) {
            mountpoint = mountpoint || '/';
            let FS = this.FS,
                entries = {},
                index = 0,
                filterRoot = [".", ".."].concat(mountpoint == '/' ? ["dev", "tmp", "proc"] : []),
                isRealDir = p => !filterRoot.includes(p),
                toAbsolute = root => p => this.join2(root, p),
                check = this.stat(mountpoint) && FS.readdir(mountpoint).filter(isRealDir).map(toAbsolute(mountpoint));
            if (!check) T.Err('mount:PATH ERROR');
            while (check.length) {
                let path = check.pop();
                index++;
                let stat = this.stat(path);
                if (stat) {
                    if (FS.isDir(stat.mode)) {
                        check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
                    }
                    entries[path] = {
                        timestamp: stat.mtime
                    }

                }
            }
            return entries;

        }
        stat(path) {
            let pathinfo = FS.analyzePath(path);
            if (pathinfo.exists && pathinfo.object.node_ops&& pathinfo.object.node_ops.getattr) {
                return this.FS.stat(path);
            }
        }
        getFileDataAsTypedArray(node) {
            if (!node.contents) return new Uint8Array;
            if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
            return new Uint8Array(node.contents)
        }
        join() {
            var paths = Array.prototype.slice.call(arguments, 0);
            return this.normalize(paths.join("/"))
        }

        join2(l, r) {
            return this.normalize(l + "/" + r)
        }
        normalize(path) {
            var isAbsolute = path.charAt(0) === "/",
                trailingSlash = path.substring(-1) === "/";
            path = this.normalizeArray(path.split("/").filter(p => {
                return !!p
            }), !isAbsolute).join("/");
            if (!path && !isAbsolute) {
                path = "."
            }
            if (path && trailingSlash) {
                path += "/"
            }
            return (isAbsolute ? "/" : "") + path
        }

        normalizeArray(parts, allowAboveRoot) {
            var up = 0;
            for (var i = parts.length - 1; i >= 0; i--) {
                var last = parts[i];
                if (last === ".") {
                    parts.splice(i, 1)
                } else if (last === "..") {
                    parts.splice(i, 1);
                    up++
                } else if (up) {
                    parts.splice(i, 1);
                    up--
                }
            }
            if (allowAboveRoot) {
                for (; up; up--) {
                    parts.unshift("..")
                }
            }
            return parts
        }
        ops_write = (stream, buffer, offset, length, position, canOwn) => {
            if (this.HEAP8&&buffer.buffer === this.HEAP8.buffer) {
                canOwn = false
            }
            if (!length) return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    this.update(stream);
                    node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            this.MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
            else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        };
        update_promise(stream) {
            return new Promise((resolve, reject) => {
                if (!this.update_mount_list.includes(stream.node.mount)) this.update_mount_list.push(stream.node.mount);
                let Timer = setInterval(() => {
                    if (this.update_time && Timer != this.update_time) {
                        clearInterval(Timer);
                        reject('other update');
                    }
                    if (stream.fd == null) {
                        clearInterval(Timer);
                        resolve('ok');
                    }
                }, this.speed);
                this.update_time = Timer;
            });
        }
        update_path = [];
        update_mount_list = [];
        async update_mount() {
            if (this.update_mount_list.length) {
                let list = this.update_mount_list.map(async mount => this.syncfs(mount, e => console.log(e)));
                this.update_mount_list = [];
                this.update_path = [];
                await Promise.all(list);
            }
        }
        update(stream) {
            if (!this.getStoreName(stream.node.mount)) return;
            if (stream.path && stream.fd != null && !this.update_path.includes(stream.path)) {
                this.update_path.push(stream.path)
                this.update_promise(stream).then(result => this.update_mount());
            }
        }
        MKFILE(path, data, bool){
            let FS = this.FS,
                dir = path.split('/');
            if (dir.length) dir = dir.slice(0, -1).join('/');
            else dir = '/';
            if (!FS.analyzePath(dir).exists) {
                let pdir = dir.split('/').slice(0, -1).join('/');
                if (!FS.analyzePath(pdir).exists) FS.createPath('/', pdir, !0, !0);
                FS.createPath('/', dir, !0, !0);
            }
            if (typeof data == 'string') data = new TextEncoder().encode(data);
            if (bool) {
                if (FS.analyzePath(path).exists) FS.unlink(path);
                FS.writeFile(path, data, {
                    canOwn: true,
                    encoding: "binary"
                });
            } else if (!FS.analyzePath(path).exists) {
                FS.writeFile(path, data, {
                    canOwn: true,
                    encoding: "binary"
                });
            }
        }
    }
}).call(Nenge);