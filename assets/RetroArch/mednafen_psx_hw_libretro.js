var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
    if (Module.hasOwnProperty(key)) {
        moduleOverrides[key] = Module[key]
    }
}
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = function (status, toThrow) {
    throw toThrow
};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === "object";
ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
ENVIRONMENT_IS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var scriptDirectory = "";

function locateFile(path) {
    if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory)
    }
    return scriptDirectory + path
}
var read_, readAsync, readBinary, setWindowTitle;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = require("path").dirname(scriptDirectory) + "/"
    } else {
        scriptDirectory = __dirname + "/"
    }
    read_ = function shell_read(filename, binary) {
        if (!nodeFS) nodeFS = require("fs");
        if (!nodePath) nodePath = require("path");
        filename = nodePath["normalize"](filename);
        return nodeFS["readFileSync"](filename, binary ? null : "utf8")
    };
    readBinary = function readBinary(filename) {
        var ret = read_(filename, true);
        if (!ret.buffer) {
            ret = new Uint8Array(ret)
        }
        assert(ret.buffer);
        return ret
    };
    if (process["argv"].length > 1) {
        thisProgram = process["argv"][1].replace(/\\/g, "/")
    }
    arguments_ = process["argv"].slice(2);
    if (typeof module !== "undefined") {
        module["exports"] = Module
    }
    process["on"]("uncaughtException", function (ex) {
        if (!(ex instanceof ExitStatus)) {
            throw ex
        }
    });
    process["on"]("unhandledRejection", abort);
    quit_ = function (status) {
        process["exit"](status)
    };
    Module["inspect"] = function () {
        return "[Emscripten Module object]"
    }
} else if (ENVIRONMENT_IS_SHELL) {
    if (typeof read != "undefined") {
        read_ = function shell_read(f) {
            return read(f)
        }
    }
    readBinary = function readBinary(f) {
        var data;
        if (typeof readbuffer === "function") {
            return new Uint8Array(readbuffer(f))
        }
        data = read(f, "binary");
        assert(typeof data === "object");
        return data
    };
    if (typeof scriptArgs != "undefined") {
        arguments_ = scriptArgs
    } else if (typeof arguments != "undefined") {
        arguments_ = arguments
    }
    if (typeof quit === "function") {
        quit_ = function (status) {
            quit(status)
        }
    }
    if (typeof print !== "undefined") {
        if (typeof console === "undefined") console = {};
        console.log = print;
        console.warn = console.error = typeof printErr !== "undefined" ? printErr : print
    }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href
    } else if (typeof document !== "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src
    }
    if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1)
    } else {
        scriptDirectory = ""
    } {
        read_ = function (url) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText
        };
        if (ENVIRONMENT_IS_WORKER) {
            readBinary = function (url) {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response)
            }
        }
        readAsync = function (url, onload, onerror) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function () {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return
                }
                onerror()
            };
            xhr.onerror = onerror;
            xhr.send(null)
        }
    }
    setWindowTitle = function (title) {
        document.title = title
    }
} else {}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
for (key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
        Module[key] = moduleOverrides[key]
    }
}
moduleOverrides = null;
if (Module["arguments"]) arguments_ = Module["arguments"];
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
if (Module["quit"]) quit_ = Module["quit"];
var STACK_ALIGN = 16;

function alignMemory(size, factor) {
    if (!factor) factor = STACK_ALIGN;
    return Math.ceil(size / factor) * factor
}

function warnOnce(text) {
    if (!warnOnce.shown) warnOnce.shown = {};
    if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        err(text)
    }
}
var tempRet0 = 0;
var setTempRet0 = function (value) {
    tempRet0 = value
};
var getTempRet0 = function () {
    return tempRet0
};
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
var noExitRuntime = Module["noExitRuntime"] || false;
if (typeof WebAssembly !== "object") {
    abort("no native wasm support detected")
}
var wasmMemory;
var ABORT = false;
var EXITSTATUS;

function assert(condition, text) {
    if (!condition) {
        abort("Assertion failed: " + text)
    }
}
var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(heap, idx, maxBytesToRead) {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr;
    if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(heap.subarray(idx, endPtr))
    } else {
        var str = "";
        while (idx < endPtr) {
            var u0 = heap[idx++];
            if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue
            }
            var u1 = heap[idx++] & 63;
            if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue
            }
            var u2 = heap[idx++] & 63;
            if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2
            } else {
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[idx++] & 63
            }
            if (u0 < 65536) {
                str += String.fromCharCode(u0)
            } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
            }
        }
    }
    return str
}

function UTF8ToString(ptr, maxBytesToRead) {
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ""
}

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i);
            u = 65536 + ((u & 1023) << 10) | u1 & 1023
        }
        if (u <= 127) {
            if (outIdx >= endIdx) break;
            heap[outIdx++] = u
        } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx) break;
            heap[outIdx++] = 192 | u >> 6;
            heap[outIdx++] = 128 | u & 63
        } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx) break;
            heap[outIdx++] = 224 | u >> 12;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        } else {
            if (outIdx + 3 >= endIdx) break;
            heap[outIdx++] = 240 | u >> 18;
            heap[outIdx++] = 128 | u >> 12 & 63;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}

function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127) ++len;
        else if (u <= 2047) len += 2;
        else if (u <= 65535) len += 3;
        else len += 4
    }
    return len
}

function allocateUTF8(str) {
    var size = lengthBytesUTF8(str) + 1;
    var ret = _malloc(size);
    if (ret) stringToUTF8Array(str, HEAP8, ret, size);
    return ret
}

function allocateUTF8OnStack(str) {
    var size = lengthBytesUTF8(str) + 1;
    var ret = stackAlloc(size);
    stringToUTF8Array(str, HEAP8, ret, size);
    return ret
}

function writeArrayToMemory(array, buffer) {
    HEAP8.set(array, buffer)
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer++ >> 0] = str.charCodeAt(i)
    }
    if (!dontAddNull) HEAP8[buffer >> 0] = 0
}

function alignUp(x, multiple) {
    if (x % multiple > 0) {
        x += multiple - x % multiple
    }
    return x
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferAndViews(buf) {
    buffer = buf;
    Module["HEAP8"] = HEAP8 = new Int8Array(buf);
    Module["HEAP16"] = HEAP16 = new Int16Array(buf);
    Module["HEAP32"] = HEAP32 = new Int32Array(buf);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
}
var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 536870912;
var wasmTable;
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
__ATINIT__.push({
    func: function () {
        ___wasm_call_ctors()
    }
});
if (Module["wasmMemory"]) {
    wasmMemory = Module["wasmMemory"]
} else {
    wasmMemory = new WebAssembly.Memory({
        "initial": INITIAL_MEMORY / 65536
    })
}
if (wasmMemory) {
    buffer = wasmMemory.buffer
}
INITIAL_MEMORY = buffer.byteLength;
updateGlobalBufferAndViews(buffer);
function preRun() {
    if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
            addOnPreRun(Module["preRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPRERUN__)
}

function initRuntime() {
    runtimeInitialized = true;
    if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
    TTY.init();
    callRuntimeCallbacks(__ATINIT__)
}

function preMain() {
    FS.ignorePermissions = false;
    callRuntimeCallbacks(__ATMAIN__)
}

function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    FS.quit();
    TTY.shutdown();
    runtimeExited = true
}

function postRun() {
    if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
            addOnPostRun(Module["postRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
}

function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
}

function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;

function getUniqueRunDependency(id) {
    return id
}

function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
}

function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};

function abort(what) {
    if (Module["onAbort"]) {
        Module["onAbort"](what)
    }
    what += "";
    err(what);
    ABORT = true;
    EXITSTATUS = 1;
    what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
    var e = new WebAssembly.RuntimeError(what);
    throw e
}

function hasPrefix(str, prefix) {
    return String.prototype.startsWith ? str.startsWith(prefix) : str.indexOf(prefix) === 0
}
var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
    return hasPrefix(filename, dataURIPrefix)
}
var fileURIPrefix = "file://";

function isFileURI(filename) {
    return hasPrefix(filename, fileURIPrefix)
}
var wasmBinaryFile = "mednafen_psx_hw_libretro.wasm";
if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile)
}

function getBinary(file) {
    try {
        if (file == wasmBinaryFile && wasmBinary) {
            return new Uint8Array(wasmBinary)
        }
        if (readBinary) {
            return readBinary(file)
        } else {
            throw "both async and sync fetching of the wasm failed"
        }
    } catch (err) {
        abort(err)
    }
}

function getBinaryPromise() {
    if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch === "function" && !isFileURI(wasmBinaryFile)) {
            return fetch(wasmBinaryFile, {
                credentials: "same-origin"
            }).then(function (response) {
                if (!response["ok"]) {
                    throw "failed to load wasm binary file at '" + wasmBinaryFile + "'"
                }
                return response["arrayBuffer"]()
            }).catch(function () {
                return getBinary(wasmBinaryFile)
            })
        } else {
            if (readAsync) {
                return new Promise(function (resolve, reject) {
                    readAsync(wasmBinaryFile, function (response) {
                        resolve(new Uint8Array(response))
                    }, reject)
                })
            }
        }
    }
    return Promise.resolve().then(function () {
        return getBinary(wasmBinaryFile)
    })
}

function createWasm() {
    var info = {
        "a": asmLibraryArg
    };

    function receiveInstance(instance, module) {
        var exports = instance.exports;
        Module["asm"] = exports;
        wasmMemory = Module["asm"]["Sh"];
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module["asm"]["Wh"];
        removeRunDependency("wasm-instantiate")
    }
    addRunDependency("wasm-instantiate");

    function receiveInstantiatedSource(output) {
        console.log(output);
        receiveInstance(output["instance"])
    }

    function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function (binary) {
            let w =  WebAssembly.instantiate(binary, info).catch(e=>{
                alert(e,e.message);
                console.log(e);
            });
            console.log(w);
            return w;

        }).then(receiver, function (reason) {
            err("failed to asynchronously prepare wasm: " + reason);
            abort(reason)
        });
    }

    function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && typeof fetch === "function") {
            return fetch(wasmBinaryFile, {
                credentials: "same-origin"
            }).then(function (response) {
                var result = WebAssembly.instantiateStreaming(response, info);
                return result.then(receiveInstantiatedSource, function (reason) {
                    err("wasm streaming compile failed: " + reason);
                    err("falling back to ArrayBuffer instantiation");
                    return instantiateArrayBuffer(receiveInstantiatedSource)
                })
            })
        } else {
            return instantiateArrayBuffer(receiveInstantiatedSource)
        }
    }
    if (Module["instantiateWasm"]) {
        try {
            var exports = Module["instantiateWasm"](info, receiveInstance);
            return exports
        } catch (e) {
            err("Module.instantiateWasm callback failed with error: " + e);
            return false
        }
    }
    instantiateAsync();
    return {}
}
var tempDouble;
var tempI64;

function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == "function") {
            callback(Module);
            continue
        }
        var func = callback.func;
        if (typeof func === "number") {
            if (callback.arg === undefined) {
                wasmTable.get(func)()
            } else {
                wasmTable.get(func)(callback.arg)
            }
        } else {
            func(callback.arg === undefined ? null : callback.arg)
        }
    }
}

function _emscripten_set_main_loop_timing(mode, value) {
    Browser.mainLoop.timingMode = mode;
    Browser.mainLoop.timingValue = value;
    if (!Browser.mainLoop.func) {
        return 1
    }
    if (mode == 0) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
            var timeUntilNextTick = Math.max(0, Browser.mainLoop.tickStartTime + value - _emscripten_get_now()) | 0;
            setTimeout(Browser.mainLoop.runner, timeUntilNextTick)
        };
        Browser.mainLoop.method = "timeout"
    } else if (mode == 1) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
            Browser.requestAnimationFrame(Browser.mainLoop.runner)
        };
        Browser.mainLoop.method = "rAF"
    } else if (mode == 2) {
        if (typeof setImmediate === "undefined") {
            var setImmediates = [];
            var emscriptenMainLoopMessageId = "setimmediate";
            var Browser_setImmediate_messageHandler = function (event) {
                if (event.data === emscriptenMainLoopMessageId || event.data.target === emscriptenMainLoopMessageId) {
                    event.stopPropagation();
                    setImmediates.shift()()
                }
            };
            addEventListener("message", Browser_setImmediate_messageHandler, true);
            setImmediate = function Browser_emulated_setImmediate(func) {
                setImmediates.push(func);
                if (ENVIRONMENT_IS_WORKER) {
                    if (Module["setImmediates"] === undefined) Module["setImmediates"] = [];
                    Module["setImmediates"].push(func);
                    postMessage({
                        target: emscriptenMainLoopMessageId
                    })
                } else postMessage(emscriptenMainLoopMessageId, "*")
            }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
            setImmediate(Browser.mainLoop.runner)
        };
        Browser.mainLoop.method = "immediate"
    }
    return 0
}
var _emscripten_get_now;
if (ENVIRONMENT_IS_NODE) {
    _emscripten_get_now = function () {
        var t = process["hrtime"]();
        return t[0] * 1e3 + t[1] / 1e6
    }
} else if (typeof dateNow !== "undefined") {
    _emscripten_get_now = dateNow
} else _emscripten_get_now = function () {
    return performance.now()
};

function setMainLoop(browserIterationFunc, fps, simulateInfiniteLoop, arg, noSetTiming) {
    noExitRuntime = true;
    assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
    Browser.mainLoop.func = browserIterationFunc;
    Browser.mainLoop.arg = arg;
    var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
    Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
            var start = Date.now();
            var blocker = Browser.mainLoop.queue.shift();
            blocker.func(blocker.arg);
            if (Browser.mainLoop.remainingBlockers) {
                var remaining = Browser.mainLoop.remainingBlockers;
                var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
                if (blocker.counted) {
                    Browser.mainLoop.remainingBlockers = next
                } else {
                    next = next + .5;
                    Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9
                }
            }
            console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
            Browser.mainLoop.updateStatus();
            if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
            setTimeout(Browser.mainLoop.runner, 0);
            return
        }
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
            Browser.mainLoop.scheduler();
            return
        } else if (Browser.mainLoop.timingMode == 0) {
            Browser.mainLoop.tickStartTime = _emscripten_get_now()
        }
        GL.newRenderingFrameStarted();
        Browser.mainLoop.runIter(browserIterationFunc);
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
        if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
        Browser.mainLoop.scheduler()
    };
    if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps);
        else _emscripten_set_main_loop_timing(1, 1);
        Browser.mainLoop.scheduler()
    }
    if (simulateInfiniteLoop) {
        throw "unwind"
    }
}
var Browser = {
    mainLoop: {
        scheduler: null,
        method: "",
        currentlyRunningMainloop: 0,
        func: null,
        arg: 0,
        timingMode: 0,
        timingValue: 0,
        currentFrameNumber: 0,
        queue: [],
        pause: function () {
            Browser.mainLoop.scheduler = null;
            Browser.mainLoop.currentlyRunningMainloop++
        },
        resume: function () {
            Browser.mainLoop.currentlyRunningMainloop++;
            var timingMode = Browser.mainLoop.timingMode;
            var timingValue = Browser.mainLoop.timingValue;
            var func = Browser.mainLoop.func;
            Browser.mainLoop.func = null;
            setMainLoop(func, 0, false, Browser.mainLoop.arg, true);
            _emscripten_set_main_loop_timing(timingMode, timingValue);
            Browser.mainLoop.scheduler()
        },
        updateStatus: function () {
            if (Module["setStatus"]) {
                var message = Module["statusMessage"] || "Please wait...";
                var remaining = Browser.mainLoop.remainingBlockers;
                var expected = Browser.mainLoop.expectedBlockers;
                if (remaining) {
                    if (remaining < expected) {
                        Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")")
                    } else {
                        Module["setStatus"](message)
                    }
                } else {
                    Module["setStatus"]("")
                }
            }
        },
        runIter: function (func) {
            if (ABORT) return;
            if (Module["preMainLoop"]) {
                var preRet = Module["preMainLoop"]();
                if (preRet === false) {
                    return
                }
            }
            try {
                func()
            } catch (e) {
                if (e instanceof ExitStatus) {
                    return
                } else if (e == "unwind") {
                    return
                } else {
                    if (e && typeof e === "object" && e.stack) err("exception thrown: " + [e, e.stack]);
                    throw e
                }
            }
            if (Module["postMainLoop"]) Module["postMainLoop"]()
        }
    },
    isFullscreen: false,
    pointerLock: false,
    moduleContextCreatedCallbacks: [],
    workers: [],
    init: function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
        if (Browser.initted) return;
        Browser.initted = true;
        try {
            new Blob;
            Browser.hasBlobConstructor = true
        } catch (e) {
            Browser.hasBlobConstructor = false;
            console.log("warning: no blob constructor, cannot create blobs with mimetypes")
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
        Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
            console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
            Module.noImageDecoding = true
        }
        var imagePlugin = {};
        imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
            return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name)
        };
        imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
            var b = null;
            if (Browser.hasBlobConstructor) {
                try {
                    b = new Blob([byteArray], {
                        type: Browser.getMimetype(name)
                    });
                    if (b.size !== byteArray.length) {
                        b = new Blob([new Uint8Array(byteArray).buffer], {
                            type: Browser.getMimetype(name)
                        })
                    }
                } catch (e) {
                    warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder")
                }
            }
            if (!b) {
                var bb = new Browser.BlobBuilder;
                bb.append(new Uint8Array(byteArray).buffer);
                b = bb.getBlob()
            }
            var url = Browser.URLObject.createObjectURL(b);
            var img = new Image;
            img.onload = function img_onload() {
                assert(img.complete, "Image " + name + " could not be decoded");
                var canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                Module["preloadedImages"][name] = canvas;
                Browser.URLObject.revokeObjectURL(url);
                if (onload) onload(byteArray)
            };
            img.onerror = function img_onerror(event) {
                console.log("Image " + url + " could not be decoded");
                if (onerror) onerror()
            };
            img.src = url
        };
        Module["preloadPlugins"].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
            return !Module.noAudioDecoding && name.substr(-4) in {
                ".ogg": 1,
                ".wav": 1,
                ".mp3": 1
            }
        };
        audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
            var done = false;

            function finish(audio) {
                if (done) return;
                done = true;
                Module["preloadedAudios"][name] = audio;
                if (onload) onload(byteArray)
            }

            function fail() {
                if (done) return;
                done = true;
                Module["preloadedAudios"][name] = new Audio;
                if (onerror) onerror()
            }
            if (Browser.hasBlobConstructor) {
                try {
                    var b = new Blob([byteArray], {
                        type: Browser.getMimetype(name)
                    })
                } catch (e) {
                    return fail()
                }
                var url = Browser.URLObject.createObjectURL(b);
                var audio = new Audio;
                audio.addEventListener("canplaythrough", function () {
                    finish(audio)
                }, false);
                audio.onerror = function audio_onerror(event) {
                    if (done) return;
                    console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");

                    function encode64(data) {
                        var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                        var PAD = "=";
                        var ret = "";
                        var leftchar = 0;
                        var leftbits = 0;
                        for (var i = 0; i < data.length; i++) {
                            leftchar = leftchar << 8 | data[i];
                            leftbits += 8;
                            while (leftbits >= 6) {
                                var curr = leftchar >> leftbits - 6 & 63;
                                leftbits -= 6;
                                ret += BASE[curr]
                            }
                        }
                        if (leftbits == 2) {
                            ret += BASE[(leftchar & 3) << 4];
                            ret += PAD + PAD
                        } else if (leftbits == 4) {
                            ret += BASE[(leftchar & 15) << 2];
                            ret += PAD
                        }
                        return ret
                    }
                    audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
                    finish(audio)
                };
                audio.src = url;
                Browser.safeSetTimeout(function () {
                    finish(audio)
                }, 1e4)
            } else {
                return fail()
            }
        };
        Module["preloadPlugins"].push(audioPlugin);

        function pointerLockChange() {
            Browser.pointerLock = document["pointerLockElement"] === Module["canvas"] || document["mozPointerLockElement"] === Module["canvas"] || document["webkitPointerLockElement"] === Module["canvas"] || document["msPointerLockElement"] === Module["canvas"]
        }
        var canvas = Module["canvas"];
        if (canvas) {
            canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || function () {};
            canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || function () {};
            canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
            document.addEventListener("pointerlockchange", pointerLockChange, false);
            document.addEventListener("mozpointerlockchange", pointerLockChange, false);
            document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
            document.addEventListener("mspointerlockchange", pointerLockChange, false);
            if (Module["elementPointerLock"]) {
                canvas.addEventListener("click", function (ev) {
                    if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
                        Module["canvas"].requestPointerLock();
                        ev.preventDefault()
                    }
                }, false)
            }
        }
    },
    createContext: function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
        var ctx;
        var contextHandle;
        if (useWebGL) {
            var contextAttributes = {
                antialias: false,
                alpha: false,
                majorVersion: 2
            };
            if (webGLContextAttributes) {
                for (var attribute in webGLContextAttributes) {
                    contextAttributes[attribute] = webGLContextAttributes[attribute]
                }
            }
            if (typeof GL !== "undefined") {
                contextHandle = GL.createContext(canvas, contextAttributes);
                if (contextHandle) {
                    ctx = GL.getContext(contextHandle).GLctx
                }
            }
        } else {
            ctx = canvas.getContext("2d")
        }
        if (!ctx) return null;
        if (setInModule) {
            if (!useWebGL) assert(typeof GLctx === "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
            Module.ctx = ctx;
            if (useWebGL) GL.makeContextCurrent(contextHandle);
            Module.useWebGL = useWebGL;
            Browser.moduleContextCreatedCallbacks.forEach(function (callback) {
                callback()
            });
            Browser.init()
        }
        return ctx
    },
    destroyContext: function (canvas, useWebGL, setInModule) {},
    fullscreenHandlersInstalled: false,
    lockPointer: undefined,
    resizeCanvas: undefined,
    requestFullscreen: function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === "undefined") Browser.resizeCanvas = false;
        var canvas = Module["canvas"];

        function fullscreenChange() {
            Browser.isFullscreen = false;
            var canvasContainer = canvas.parentNode;
            if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
                canvas.exitFullscreen = Browser.exitFullscreen;
                if (Browser.lockPointer) canvas.requestPointerLock();
                Browser.isFullscreen = true;
                if (Browser.resizeCanvas) {
                    Browser.setFullscreenCanvasSize()
                } else {
                    Browser.updateCanvasDimensions(canvas)
                }
            } else {
                canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
                canvasContainer.parentNode.removeChild(canvasContainer);
                if (Browser.resizeCanvas) {
                    Browser.setWindowedCanvasSize()
                } else {
                    Browser.updateCanvasDimensions(canvas)
                }
            }
            if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullscreen);
            if (Module["onFullscreen"]) Module["onFullscreen"](Browser.isFullscreen)
        }
        if (!Browser.fullscreenHandlersInstalled) {
            Browser.fullscreenHandlersInstalled = true;
            document.addEventListener("fullscreenchange", fullscreenChange, false);
            document.addEventListener("mozfullscreenchange", fullscreenChange, false);
            document.addEventListener("webkitfullscreenchange", fullscreenChange, false);
            document.addEventListener("MSFullscreenChange", fullscreenChange, false)
        }
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        canvasContainer.requestFullscreen = canvasContainer["requestFullscreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullscreen"] ? function () {
            canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"])
        } : null) || (canvasContainer["webkitRequestFullScreen"] ? function () {
            canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"])
        } : null);
        canvasContainer.requestFullscreen()
    },
    exitFullscreen: function () {
        if (!Browser.isFullscreen) {
            return false
        }
        var CFS = document["exitFullscreen"] || document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["msExitFullscreen"] || document["webkitCancelFullScreen"] || function () {};
        CFS.apply(document, []);
        return true
    },
    nextRAF: 0,
    fakeRequestAnimationFrame: function (func) {
        var now = Date.now();
        if (Browser.nextRAF === 0) {
            Browser.nextRAF = now + 1e3 / 60
        } else {
            while (now + 2 >= Browser.nextRAF) {
                Browser.nextRAF += 1e3 / 60
            }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay)
    },
    requestAnimationFrame: function (func) {
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(func);
            return
        }
        var RAF = Browser.fakeRequestAnimationFrame;
        RAF(func)
    },
    safeRequestAnimationFrame: function (func) {
        return Browser.requestAnimationFrame(function () {
            if (ABORT) return;
            func()
        })
    },
    safeSetTimeout: function (func, timeout) {
        noExitRuntime = true;
        return setTimeout(function () {
            if (ABORT) return;
            func()
        }, timeout)
    },
    getMimetype: function (name) {
        return {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "bmp": "image/bmp",
            "ogg": "audio/ogg",
            "wav": "audio/wav",
            "mp3": "audio/mpeg"
        } [name.substr(name.lastIndexOf(".") + 1)]
    },
    getUserMedia: function (func) {
        if (!window.getUserMedia) {
            window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"]
        }
        window.getUserMedia(func)
    },
    getMovementX: function (event) {
        return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0
    },
    getMovementY: function (event) {
        return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0
    },
    getMouseWheelDelta: function (event) {
        var delta = 0;
        switch (event.type) {
            case "DOMMouseScroll":
                delta = event.detail / 3;
                break;
            case "mousewheel":
                delta = event.wheelDelta / 120;
                break;
            case "wheel":
                delta = event.deltaY;
                switch (event.deltaMode) {
                    case 0:
                        delta /= 100;
                        break;
                    case 1:
                        delta /= 3;
                        break;
                    case 2:
                        delta *= 80;
                        break;
                    default:
                        throw "unrecognized mouse wheel delta mode: " + event.deltaMode
                }
                break;
            default:
                throw "unrecognized mouse wheel event: " + event.type
        }
        return delta
    },
    mouseX: 0,
    mouseY: 0,
    mouseMovementX: 0,
    mouseMovementY: 0,
    touches: {},
    lastTouches: {},
    calculateMouseEvent: function (event) {
        if (Browser.pointerLock) {
            if (event.type != "mousemove" && "mozMovementX" in event) {
                Browser.mouseMovementX = Browser.mouseMovementY = 0
            } else {
                Browser.mouseMovementX = Browser.getMovementX(event);
                Browser.mouseMovementY = Browser.getMovementY(event)
            }
            if (typeof SDL != "undefined") {
                Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
                Browser.mouseY = SDL.mouseY + Browser.mouseMovementY
            } else {
                Browser.mouseX += Browser.mouseMovementX;
                Browser.mouseY += Browser.mouseMovementY
            }
        } else {
            var rect = Module["canvas"].getBoundingClientRect();
            var cw = Module["canvas"].width;
            var ch = Module["canvas"].height;
            var scrollX = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
            var scrollY = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
            if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
                var touch = event.touch;
                if (touch === undefined) {
                    return
                }
                var adjustedX = touch.pageX - (scrollX + rect.left);
                var adjustedY = touch.pageY - (scrollY + rect.top);
                adjustedX = adjustedX * (cw / rect.width);
                adjustedY = adjustedY * (ch / rect.height);
                var coords = {
                    x: adjustedX,
                    y: adjustedY
                };
                if (event.type === "touchstart") {
                    Browser.lastTouches[touch.identifier] = coords;
                    Browser.touches[touch.identifier] = coords
                } else if (event.type === "touchend" || event.type === "touchmove") {
                    var last = Browser.touches[touch.identifier];
                    if (!last) last = coords;
                    Browser.lastTouches[touch.identifier] = last;
                    Browser.touches[touch.identifier] = coords
                }
                return
            }
            var x = event.pageX - (scrollX + rect.left);
            var y = event.pageY - (scrollY + rect.top);
            x = x * (cw / rect.width);
            y = y * (ch / rect.height);
            Browser.mouseMovementX = x - Browser.mouseX;
            Browser.mouseMovementY = y - Browser.mouseY;
            Browser.mouseX = x;
            Browser.mouseY = y
        }
    },
    asyncLoad: function (url, onload, onerror, noRunDep) {
        var dep = !noRunDep ? getUniqueRunDependency("al " + url) : "";
        readAsync(url, function (arrayBuffer) {
            assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
            onload(new Uint8Array(arrayBuffer));
            if (dep) removeRunDependency(dep)
        }, function (event) {
            if (onerror) {
                onerror()
            } else {
                throw 'Loading data file "' + url + '" failed.'
            }
        });
        if (dep) addRunDependency(dep)
    },
    resizeListeners: [],
    updateResizeListeners: function () {
        var canvas = Module["canvas"];
        Browser.resizeListeners.forEach(function (listener) {
            listener(canvas.width, canvas.height)
        })
    },
    setCanvasSize: function (width, height, noUpdates) {
        var canvas = Module["canvas"];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners()
    },
    windowedWidth: 0,
    windowedHeight: 0,
    setFullscreenCanvasSize: function () {
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[SDL.screen >> 2];
            flags = flags | 8388608;
            HEAP32[SDL.screen >> 2] = flags
        }
        Browser.updateCanvasDimensions(Module["canvas"]);
        Browser.updateResizeListeners()
    },
    setWindowedCanvasSize: function () {
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[SDL.screen >> 2];
            flags = flags & ~8388608;
            HEAP32[SDL.screen >> 2] = flags
        }
        Browser.updateCanvasDimensions(Module["canvas"]);
        Browser.updateResizeListeners()
    },
    updateCanvasDimensions: function (canvas, wNative, hNative) {
        if (wNative && hNative) {
            canvas.widthNative = wNative;
            canvas.heightNative = hNative
        } else {
            wNative = canvas.widthNative;
            hNative = canvas.heightNative
        }
        var w = wNative;
        var h = hNative;
        if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
            if (w / h < Module["forcedAspectRatio"]) {
                w = Math.round(h * Module["forcedAspectRatio"])
            } else {
                h = Math.round(w / Module["forcedAspectRatio"])
            }
        }
        if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
            var factor = Math.min(screen.width / w, screen.height / h);
            w = Math.round(w * factor);
            h = Math.round(h * factor)
        }
        if (Browser.resizeCanvas) {
            if (canvas.width != w) canvas.width = w;
            if (canvas.height != h) canvas.height = h;
            if (typeof canvas.style != "undefined") {
                canvas.style.removeProperty("width");
                canvas.style.removeProperty("height")
            }
        } else {
            if (canvas.width != wNative) canvas.width = wNative;
            if (canvas.height != hNative) canvas.height = hNative;
            if (typeof canvas.style != "undefined") {
                if (w != wNative || h != hNative) {
                    canvas.style.setProperty("width", w + "px", "important");
                    canvas.style.setProperty("height", h + "px", "important")
                } else {
                    canvas.style.removeProperty("width");
                    canvas.style.removeProperty("height")
                }
            }
        }
    },
    wgetRequests: {},
    nextWgetRequestHandle: 0,
    getNextWgetRequestHandle: function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle
    }
};
var RA = {
    BUFFER_SIZE: 2048,
    context: null,
    buffers: [],
    numBuffers: 0,
    bufIndex: 0,
    bufOffset: 0,
    startTime: 0,
    nonblock: false,
    currentTimeWorkaround: false,
    setStartTime: function () {
        if (RA.context.currentTime) {
            RA.startTime = window["performance"]["now"]() - RA.context.currentTime * 1e3;
            Module["resumeMainLoop"]()
        } else window["setTimeout"](RA.setStartTime, 0)
    },
    getCurrentPerfTime: function () {
        if (RA.startTime) return (window["performance"]["now"]() - RA.startTime) / 1e3;
        else return 0
    },
    process: function (queueBuffers) {
        var currentTime = RA.getCurrentPerfTime();
        for (var i = 0; i < RA.bufIndex; i++) {
            if (RA.buffers[i].endTime !== 0 && RA.buffers[i].endTime < currentTime) {
                RA.buffers[i].endTime = 0;
                var buf = RA.buffers.splice(i, 1);
                RA.buffers[RA.numBuffers - 1] = buf[0];
                i--;
                RA.bufIndex--
            }
        }
    },
    fillBuffer: function (buf, samples) {
        var count = 0;
        const leftBuffer = RA.buffers[RA.bufIndex].getChannelData(0);
        const rightBuffer = RA.buffers[RA.bufIndex].getChannelData(1);
        while (samples && RA.bufOffset !== RA.BUFFER_SIZE) {
            leftBuffer[RA.bufOffset] = HEAPF32[buf + count * 8 >> 2];
            rightBuffer[RA.bufOffset] = HEAPF32[buf + (count * 8 + 4) >> 2];
            RA.bufOffset++;
            count++;
            samples--
        }
        return count
    },
    queueAudio: function () {
        var index = RA.bufIndex;
        var startTime;
        if (RA.bufIndex) startTime = RA.buffers[RA.bufIndex - 1].endTime;
        else startTime = RA.context.currentTime;
        RA.buffers[index].endTime = startTime + RA.buffers[index].duration;
        const bufferSource = RA.context.createBufferSource();
        bufferSource.buffer = RA.buffers[index];
        bufferSource.connect(RA.context.destination);
        bufferSource.start(startTime);
        RA.bufIndex++;
        RA.bufOffset = 0
    },
    block: function () {
        do {
            RA.process()
        } while (RA.bufIndex === RA.numBuffers)
    }
};

function _RWebAudioBufferSize() {
    return RA.numBuffers * RA.BUFFER_SIZE * 8
}

function _RWebAudioFree() {
    RA.bufIndex = 0;
    RA.bufOffset = 0
}

function _RWebAudioInit(latency) {
    var ac = window["AudioContext"] || window["webkitAudioContext"];
    if (!ac) return 0;
    RA.context = new ac;
    RA.numBuffers = latency * RA.context.sampleRate / (1e3 * RA.BUFFER_SIZE) | 0;
    if (RA.numBuffers < 2) RA.numBuffers = 2;
    for (var i = 0; i < RA.numBuffers; i++) {
        RA.buffers[i] = RA.context.createBuffer(2, RA.BUFFER_SIZE, RA.context.sampleRate);
        RA.buffers[i].endTime = 0
    }
    RA.nonblock = false;
    RA.startTime = 0;
    RA.context.createGain();
    window["setTimeout"](RA.setStartTime, 0);
    Module["pauseMainLoop"]();
    return 1
}

function _RWebAudioRecalibrateTime() {
    if (RA.startTime) {
        RA.startTime = window["performance"]["now"]() - RA.context.currentTime * 1e3
    }
}

function _RWebAudioSampleRate() {
    return RA.context.sampleRate
}

function _RWebAudioSetNonblockState(state) {
    RA.nonblock = state
}

function _RWebAudioStart() {
    return true
}

function _RWebAudioStop() {
    RA.bufIndex = 0;
    RA.bufOffset = 0;
    return true
}

function _RWebAudioWrite(buf, size) {
    RA.process();
    var samples = size / 8;
    var count = 0;
    while (samples) {
        if (RA.bufIndex === RA.numBuffers) {
            if (RA.nonblock) break;
            else RA.block()
        }
        var fill = RA.fillBuffer(buf, samples);
        samples -= fill;
        count += fill;
        buf += fill * 8;
        if (RA.bufOffset === RA.BUFFER_SIZE) {
            RA.queueAudio()
        }
    }
    return count * 8
}

function _RWebAudioWriteAvail() {
    RA.process();
    return ((RA.numBuffers - RA.bufIndex) * RA.BUFFER_SIZE - RA.bufOffset) * 8
}
var RWC = {
    RETRO_CAMERA_BUFFER_OPENGL_TEXTURE: 0,
    RETRO_CAMERA_BUFFER_RAW_FRAMEBUFFER: 1,
    tmp: null,
    contexts: [],
    counter: 0,
    ready: function (data) {
        return RWC.contexts[data].runMode == 2 && !RWC.contexts[data].videoElement.paused && RWC.contexts[data].videoElement.videoWidth != 0 && RWC.contexts[data].videoElement.videoHeight != 0
    }
};

function _RWebCamFree(data) {
    RWC.contexts[data].videoElement.pause();
    RWC.contexts[data].videoElement = null;
    RWC.contexts[data] = null
}

function _RWebCamInit(caps1, caps2, width, height) {
    if (!navigator) return 0;
    if (!navigator.mediaDevices.getUserMedia) return 0;
    var c = ++RWC.counter;
    RWC.contexts[c] = [];
    RWC.contexts[c].videoElement = document.createElement("video");
    RWC.contexts[c].videoElement.classList.add("retroarchWebcamVideo");
    if (width !== 0 && height !== 0) {
        RWC.contexts[c].videoElement.width = width;
        RWC.contexts[c].videoElement.height = height
    }
    RWC.contexts[c].runMode = 1;
    RWC.contexts[c].glTex = caps1 & 1 << RWC.RETRO_CAMERA_BUFFER_OPENGL_TEXTURE;
    RWC.contexts[c].rawFb = caps1 & 1 << RWC.RETRO_CAMERA_BUFFER_RAW_FRAMEBUFFER;
    if (!window.disableWebCam) {
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        }).then(function (stream) {
            RWC.contexts[c].videoElement.autoplay = true;
            RWC.contexts[c].videoElement.srcObject = stream;
            RWC.contexts[c].runMode = 2
        }).catch(function (err) {
            console.log("Webcam request failed", err);
            RWC.runMode = 0
        })
    } else {
        console.log("Webcam disabled.");
        RWC.runMode = 0
    }
    if (!RWC.tmp) RWC.tmp = _malloc(4);
    return c
}

function __webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(ctx) {
    return !!(ctx.dibvbi = ctx.getExtension("WEBGL_draw_instanced_base_vertex_base_instance"))
}

function __webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(ctx) {
    return !!(ctx.mdibvbi = ctx.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance"))
}

function __webgl_enable_WEBGL_multi_draw(ctx) {
    return !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"))
}
var GL = {
    counter: 1,
    buffers: [],
    mappedBuffers: {},
    programs: [],
    framebuffers: [],
    renderbuffers: [],
    textures: [],
    uniforms: [],
    shaders: [],
    vaos: [],
    contexts: [],
    offscreenCanvases: {},
    timerQueriesEXT: [],
    queries: [],
    samplers: [],
    transformFeedbacks: [],
    syncs: [],
    byteSizeByTypeRoot: 5120,
    byteSizeByType: [1, 1, 2, 2, 4, 4, 4, 2, 3, 4, 8],
    programInfos: {},
    stringCache: {},
    stringiCache: {},
    unpackAlignment: 4,
    recordError: function recordError(errorCode) {
        if (!GL.lastError) {
            GL.lastError = errorCode
        }
    },
    getNewId: function (table) {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
            table[i] = null
        }
        return ret
    },
    MAX_TEMP_BUFFER_SIZE: 2097152,
    numTempVertexBuffersPerSize: 64,
    log2ceilLookup: function (i) {
        return 32 - Math.clz32(i === 0 ? 0 : i - 1)
    },
    generateTempBuffers: function (quads, context) {
        var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
        context.tempVertexBufferCounters1 = [];
        context.tempVertexBufferCounters2 = [];
        context.tempVertexBufferCounters1.length = context.tempVertexBufferCounters2.length = largestIndex + 1;
        context.tempVertexBuffers1 = [];
        context.tempVertexBuffers2 = [];
        context.tempVertexBuffers1.length = context.tempVertexBuffers2.length = largestIndex + 1;
        context.tempIndexBuffers = [];
        context.tempIndexBuffers.length = largestIndex + 1;
        for (var i = 0; i <= largestIndex; ++i) {
            context.tempIndexBuffers[i] = null;
            context.tempVertexBufferCounters1[i] = context.tempVertexBufferCounters2[i] = 0;
            var ringbufferLength = GL.numTempVertexBuffersPerSize;
            context.tempVertexBuffers1[i] = [];
            context.tempVertexBuffers2[i] = [];
            var ringbuffer1 = context.tempVertexBuffers1[i];
            var ringbuffer2 = context.tempVertexBuffers2[i];
            ringbuffer1.length = ringbuffer2.length = ringbufferLength;
            for (var j = 0; j < ringbufferLength; ++j) {
                ringbuffer1[j] = ringbuffer2[j] = null
            }
        }
        if (quads) {
            context.tempQuadIndexBuffer = GLctx.createBuffer();
            context.GLctx.bindBuffer(34963, context.tempQuadIndexBuffer);
            var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
            var quadIndexes = new Uint16Array(numIndexes);
            var i = 0,
                v = 0;
            while (1) {
                quadIndexes[i++] = v;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v + 1;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v + 2;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v + 2;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v + 3;
                if (i >= numIndexes) break;
                v += 4
            }
            context.GLctx.bufferData(34963, quadIndexes, 35044);
            context.GLctx.bindBuffer(34963, null)
        }
    },
    getTempVertexBuffer: function getTempVertexBuffer(sizeBytes) {
        var idx = GL.log2ceilLookup(sizeBytes);
        var ringbuffer = GL.currentContext.tempVertexBuffers1[idx];
        var nextFreeBufferIndex = GL.currentContext.tempVertexBufferCounters1[idx];
        GL.currentContext.tempVertexBufferCounters1[idx] = GL.currentContext.tempVertexBufferCounters1[idx] + 1 & GL.numTempVertexBuffersPerSize - 1;
        var vbo = ringbuffer[nextFreeBufferIndex];
        if (vbo) {
            return vbo
        }
        var prevVBO = GLctx.getParameter(34964);
        ringbuffer[nextFreeBufferIndex] = GLctx.createBuffer();
        GLctx.bindBuffer(34962, ringbuffer[nextFreeBufferIndex]);
        GLctx.bufferData(34962, 1 << idx, 35048);
        GLctx.bindBuffer(34962, prevVBO);
        return ringbuffer[nextFreeBufferIndex]
    },
    getTempIndexBuffer: function getTempIndexBuffer(sizeBytes) {
        var idx = GL.log2ceilLookup(sizeBytes);
        var ibo = GL.currentContext.tempIndexBuffers[idx];
        if (ibo) {
            return ibo
        }
        var prevIBO = GLctx.getParameter(34965);
        GL.currentContext.tempIndexBuffers[idx] = GLctx.createBuffer();
        GLctx.bindBuffer(34963, GL.currentContext.tempIndexBuffers[idx]);
        GLctx.bufferData(34963, 1 << idx, 35048);
        GLctx.bindBuffer(34963, prevIBO);
        return GL.currentContext.tempIndexBuffers[idx]
    },
    newRenderingFrameStarted: function newRenderingFrameStarted() {
        if (!GL.currentContext) {
            return
        }
        var vb = GL.currentContext.tempVertexBuffers1;
        GL.currentContext.tempVertexBuffers1 = GL.currentContext.tempVertexBuffers2;
        GL.currentContext.tempVertexBuffers2 = vb;
        vb = GL.currentContext.tempVertexBufferCounters1;
        GL.currentContext.tempVertexBufferCounters1 = GL.currentContext.tempVertexBufferCounters2;
        GL.currentContext.tempVertexBufferCounters2 = vb;
        var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
        for (var i = 0; i <= largestIndex; ++i) {
            GL.currentContext.tempVertexBufferCounters1[i] = 0
        }
    },
    getSource: function (shader, count, string, length) {
        var source = "";
        for (var i = 0; i < count; ++i) {
            var len = length ? HEAP32[length + i * 4 >> 2] : -1;
            source += UTF8ToString(HEAP32[string + i * 4 >> 2], len < 0 ? undefined : len)
        }
        return source
    },
    calcBufLength: function calcBufLength(size, type, stride, count) {
        if (stride > 0) {
            return count * stride
        }
        var typeSize = GL.byteSizeByType[type - GL.byteSizeByTypeRoot];
        return size * typeSize * count
    },
    usedTempBuffers: [],
    preDrawHandleClientVertexAttribBindings: function preDrawHandleClientVertexAttribBindings(count) {
        GL.resetBufferBinding = false;
        for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
            var cb = GL.currentContext.clientBuffers[i];
            if (!cb.clientside || !cb.enabled) continue;
            GL.resetBufferBinding = true;
            var size = GL.calcBufLength(cb.size, cb.type, cb.stride, count);
            var buf = GL.getTempVertexBuffer(size);
            GLctx.bindBuffer(34962, buf);
            GLctx.bufferSubData(34962, 0, HEAPU8.subarray(cb.ptr, cb.ptr + size));
            cb.vertexAttribPointerAdaptor.call(GLctx, i, cb.size, cb.type, cb.normalized, cb.stride, 0)
        }
    },
    postDrawHandleClientVertexAttribBindings: function postDrawHandleClientVertexAttribBindings() {
        if (GL.resetBufferBinding) {
            GLctx.bindBuffer(34962, GL.buffers[GLctx.currentArrayBufferBinding])
        }
    },
    createContext: function (canvas, webGLContextAttributes) {
        var ctx = canvas.getContext("webgl2", webGLContextAttributes);
        if (!ctx) return 0;
        var handle = GL.registerContext(ctx, webGLContextAttributes);
        return handle
    },
    registerContext: function (ctx, webGLContextAttributes) {
        var handle = GL.getNewId(GL.contexts);
        var context = {
            handle: handle,
            attributes: webGLContextAttributes,
            version: webGLContextAttributes.majorVersion,
            GLctx: ctx
        };
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault === "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
            GL.initExtensions(context)
        }
        context.maxVertexAttribs = context.GLctx.getParameter(34921);
        context.clientBuffers = [];
        for (var i = 0; i < context.maxVertexAttribs; i++) {
            context.clientBuffers[i] = {
                enabled: false,
                clientside: false,
                size: 0,
                type: 0,
                normalized: 0,
                stride: 0,
                ptr: 0,
                vertexAttribPointerAdaptor: null
            }
        }
        GL.generateTempBuffers(false, context);
        return handle
    },
    makeContextCurrent: function (contextHandle) {
        GL.currentContext = GL.contexts[contextHandle];
        Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
        return !(contextHandle && !GLctx)
    },
    getContext: function (contextHandle) {
        return GL.contexts[contextHandle]
    },
    deleteContext: function (contextHandle) {
        if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
        if (typeof JSEvents === "object") JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
        if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
        GL.contexts[contextHandle] = null
    },
    initExtensions: function (context) {
        if (!context) context = GL.currentContext;
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
        var GLctx = context.GLctx;
        __webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
        __webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
        GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
        __webgl_enable_WEBGL_multi_draw(GLctx);
        var exts = GLctx.getSupportedExtensions() || [];
        exts.forEach(function (ext) {
            if (ext.indexOf("lose_context") < 0 && ext.indexOf("debug") < 0) {
                GLctx.getExtension(ext)
            }
        })
    },
    populateUniformTable: function (program) {
        var p = GL.programs[program];
        var ptable = GL.programInfos[program] = {
            uniforms: {},
            maxUniformLength: 0,
            maxAttributeLength: -1,
            maxUniformBlockNameLength: -1
        };
        var utable = ptable.uniforms;
        var numUniforms = GLctx.getProgramParameter(p, 35718);
        for (var i = 0; i < numUniforms; ++i) {
            var u = GLctx.getActiveUniform(p, i);
            var name = u.name;
            ptable.maxUniformLength = Math.max(ptable.maxUniformLength, name.length + 1);
            if (name.slice(-1) == "]") {
                name = name.slice(0, name.lastIndexOf("["))
            }
            var loc = GLctx.getUniformLocation(p, name);
            if (loc) {
                var id = GL.getNewId(GL.uniforms);
                utable[name] = [u.size, id];
                GL.uniforms[id] = loc;
                for (var j = 1; j < u.size; ++j) {
                    var n = name + "[" + j + "]";
                    loc = GLctx.getUniformLocation(p, n);
                    id = GL.getNewId(GL.uniforms);
                    GL.uniforms[id] = loc
                }
            }
        }
    }
};

function _glBindTexture(target, texture) {
    GLctx.bindTexture(target, GL.textures[texture])
}

function writeI53ToI64(ptr, num) {
    HEAPU32[ptr >> 2] = num;
    HEAPU32[ptr + 4 >> 2] = (num - HEAPU32[ptr >> 2]) / 4294967296
}

function emscriptenWebGLGet(name_, p, type) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    var ret = undefined;
    switch (name_) {
        case 36346:
            ret = 1;
            break;
        case 36344:
            if (type != 0 && type != 1) {
                GL.recordError(1280)
            }
            return;
        case 34814:
        case 36345:
            ret = 0;
            break;
        case 34466:
            var formats = GLctx.getParameter(34467);
            ret = formats ? formats.length : 0;
            break;
        case 33309:
            if (GL.currentContext.version < 2) {
                GL.recordError(1282);
                return
            }
            var exts = GLctx.getSupportedExtensions() || [];
            ret = 2 * exts.length;
            break;
        case 33307:
        case 33308:
            if (GL.currentContext.version < 2) {
                GL.recordError(1280);
                return
            }
            ret = name_ == 33307 ? 3 : 0;
            break
    }
    if (ret === undefined) {
        var result = GLctx.getParameter(name_);
        switch (typeof result) {
            case "number":
                ret = result;
                break;
            case "boolean":
                ret = result ? 1 : 0;
                break;
            case "string":
                GL.recordError(1280);
                return;
            case "object":
                if (result === null) {
                    switch (name_) {
                        case 34964:
                        case 35725:
                        case 34965:
                        case 36006:
                        case 36007:
                        case 32873:
                        case 34229:
                        case 36662:
                        case 36663:
                        case 35053:
                        case 35055:
                        case 36010:
                        case 35097:
                        case 35869:
                        case 32874:
                        case 36389:
                        case 35983:
                        case 35368:
                        case 34068: {
                            ret = 0;
                            break
                        }
                        default: {
                            GL.recordError(1280);
                            return
                        }
                    }
                } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
                    for (var i = 0; i < result.length; ++i) {
                        switch (type) {
                            case 0:
                                HEAP32[p + i * 4 >> 2] = result[i];
                                break;
                            case 2:
                                HEAPF32[p + i * 4 >> 2] = result[i];
                                break;
                            case 4:
                                HEAP8[p + i >> 0] = result[i] ? 1 : 0;
                                break
                        }
                    }
                    return
                } else {
                    try {
                        ret = result.name | 0
                    } catch (e) {
                        GL.recordError(1280);
                        err("GL_INVALID_ENUM in glGet" + type + "v: Unknown object returned from WebGL getParameter(" + name_ + ")! (error: " + e + ")");
                        return
                    }
                }
                break;
            default:
                GL.recordError(1280);
                err("GL_INVALID_ENUM in glGet" + type + "v: Native code calling glGet" + type + "v(" + name_ + ") and it returns " + result + " of type " + typeof result + "!");
                return
        }
    }
    switch (type) {
        case 1:
            writeI53ToI64(p, ret);
            break;
        case 0:
            HEAP32[p >> 2] = ret;
            break;
        case 2:
            HEAPF32[p >> 2] = ret;
            break;
        case 4:
            HEAP8[p >> 0] = ret ? 1 : 0;
            break
    }
}

function _glGetIntegerv(name_, p) {
    emscriptenWebGLGet(name_, p, 0)
}

function _RWebCamPoll(data, frame_raw_cb, frame_gl_cb) {
    if (!RWC.ready(data)) return 0;
    var ret = 0;
    if (RWC.contexts[data].glTexId !== 0 && frame_gl_cb !== 0) {
        _glGetIntegerv(32873, RWC.tmp);
        var prev = HEAP32[RWC.tmp >> 2];
        _glBindTexture(3553, RWC.contexts[data].glTexId);
        if (RWC.contexts[data].glFirstFrame) {
            Module.ctx.texImage2D(Module.ctx.TEXTURE_2D, 0, Module.ctx.RGB, Module.ctx.RGB, Module.ctx.UNSIGNED_BYTE, RWC.contexts[data].videoElement);
            RWC.contexts[data].glFirstFrame = false
        } else {
            Module.ctx.texSubImage2D(Module.ctx.TEXTURE_2D, 0, 0, 0, Module.ctx.RGB, Module.ctx.UNSIGNED_BYTE, RWC.contexts[data].videoElement)
        }
        _glBindTexture(3553, prev);
        Runtime.dynCall("viii", frame_gl_cb, [RWC.contexts[data].glTexId, 3553, 0]);
        ret = 1
    }
    if (RWC.contexts[data].rawFbCanvas && frame_raw_cb !== 0) {
        if (!RWC.contexts[data].rawFbCanvasCtx) {
            RWC.contexts[data].rawFbCanvas.width = RWC.contexts[data].videoElement.videoWidth;
            RWC.contexts[data].rawFbCanvas.height = RWC.contexts[data].videoElement.videoHeight;
            RWC.contexts[data].rawFbCanvasCtx = RWC.contexts[data].rawFbCanvas.getContext("2d");
            RWC.contexts[data].rawBuffer = _malloc(RWC.contexts[data].videoElement.videoWidth * RWC.contexts[data].videoElement.videoHeight * 4)
        }
        RWC.contexts[data].rawFbCanvasCtx.drawImage(RWC.contexts[data].videoElement, 0, 0, RWC.contexts[data].rawFbCanvas.width, RWC.contexts[data].rawFbCanvas.height);
        var image = RWC.contexts[data].rawFbCanvasCtx.getImageData(0, 0, RWC.contexts[data].videoElement.videoWidth, RWC.contexts[data].videoElement.videoHeight);
        Module.HEAPU8.set(image.data, RWC.contexts[data].rawBuffer);
        Runtime.dynCall("viiii", frame_raw_cb, [RWC.contexts[data].rawBuffer, RWC.contexts[data].videoElement.videoWidth, RWC.contexts[data].videoElement.videoHeight, RWC.contexts[data].videoElement.videoWidth * 4]);
        ret = 1
    }
    return ret
}

function __glGenObject(n, buffers, createFunction, objectTable) {
    for (var i = 0; i < n; i++) {
        var buffer = GLctx[createFunction]();
        var id = buffer && GL.getNewId(objectTable);
        if (buffer) {
            buffer.name = id;
            objectTable[id] = buffer
        } else {
            GL.recordError(1282)
        }
        HEAP32[buffers + i * 4 >> 2] = id
    }
}

function _glGenTextures(n, textures) {
    __glGenObject(n, textures, "createTexture", GL.textures)
}

function _glTexParameteri(x0, x1, x2) {
    GLctx["texParameteri"](x0, x1, x2)
}

function _RWebCamStart(data) {
    var ret = 0;
    if (RWC.contexts[data].glTex) {
        _glGenTextures(1, RWC.tmp);
        RWC.contexts[data].glTexId = HEAP32[RWC.tmp >> 2];
        if (RWC.contexts[data].glTexId !== 0) {
            _glGetIntegerv(32873, RWC.tmp);
            var prev = HEAP32[RWC.tmp >> 2];
            _glBindTexture(3553, RWC.contexts[data].glTexId);
            _glTexParameteri(3553, 10240, 9729);
            _glTexParameteri(3553, 10241, 9729);
            _glTexParameteri(3553, 10242, 33071);
            _glTexParameteri(3553, 10243, 33071);
            _glBindTexture(3553, prev);
            RWC.contexts[data].glFirstFrame = true;
            ret = 1
        }
    }
    if (RWC.contexts[data].rawFb) {
        RWC.contexts[data].rawFbCanvas = document.createElement("canvas");
        RWC.contexts[data].rawFbCanvas.classList.add("retroarchWebcamCanvas");
        ret = 1
    }
    return ret
}

function _glDeleteTextures(n, textures) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[textures + i * 4 >> 2];
        var texture = GL.textures[id];
        if (!texture) continue;
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null
    }
}

function _RWebCamStop(data) {
    if (RWC.contexts[data].glTexId) {
        _glDeleteTextures(1, RWC.contexts[data].glTexId)
    }
    if (RWC.contexts[data].rawFbCanvas) {
        if (RWC.contexts[data].rawBuffer) {
            _free(RWC.contexts[data].rawBuffer);
            RWC.contexts[data].rawBuffer = 0;
            RWC.contexts[data].rawFbCanvasCtx = null
        }
        RWC.contexts[data].rawFbCanvas = null
    }
}

function ___assert_fail(condition, filename, line, func) {
    abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"])
}
var ExceptionInfoAttrs = {
    DESTRUCTOR_OFFSET: 0,
    REFCOUNT_OFFSET: 4,
    TYPE_OFFSET: 8,
    CAUGHT_OFFSET: 12,
    RETHROWN_OFFSET: 13,
    SIZE: 16
};

function ___cxa_allocate_exception(size) {
    return _malloc(size + ExceptionInfoAttrs.SIZE) + ExceptionInfoAttrs.SIZE
}

function _atexit(func, arg) {
    __ATEXIT__.unshift({
        func: func,
        arg: arg
    })
}

function ___cxa_atexit(a0, a1) {
    return _atexit(a0, a1)
}

function ExceptionInfo(excPtr) {
    this.excPtr = excPtr;
    this.ptr = excPtr - ExceptionInfoAttrs.SIZE;
    this.set_type = function (type) {
        HEAP32[this.ptr + ExceptionInfoAttrs.TYPE_OFFSET >> 2] = type
    };
    this.get_type = function () {
        return HEAP32[this.ptr + ExceptionInfoAttrs.TYPE_OFFSET >> 2]
    };
    this.set_destructor = function (destructor) {
        HEAP32[this.ptr + ExceptionInfoAttrs.DESTRUCTOR_OFFSET >> 2] = destructor
    };
    this.get_destructor = function () {
        return HEAP32[this.ptr + ExceptionInfoAttrs.DESTRUCTOR_OFFSET >> 2]
    };
    this.set_refcount = function (refcount) {
        HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2] = refcount
    };
    this.set_caught = function (caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + ExceptionInfoAttrs.CAUGHT_OFFSET >> 0] = caught
    };
    this.get_caught = function () {
        return HEAP8[this.ptr + ExceptionInfoAttrs.CAUGHT_OFFSET >> 0] != 0
    };
    this.set_rethrown = function (rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + ExceptionInfoAttrs.RETHROWN_OFFSET >> 0] = rethrown
    };
    this.get_rethrown = function () {
        return HEAP8[this.ptr + ExceptionInfoAttrs.RETHROWN_OFFSET >> 0] != 0
    };
    this.init = function (type, destructor) {
        this.set_type(type);
        this.set_destructor(destructor);
        this.set_refcount(0);
        this.set_caught(false);
        this.set_rethrown(false)
    };
    this.add_ref = function () {
        var value = HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2];
        HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2] = value + 1
    };
    this.release_ref = function () {
        var prev = HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2];
        HEAP32[this.ptr + ExceptionInfoAttrs.REFCOUNT_OFFSET >> 2] = prev - 1;
        return prev === 1
    }
}
var exceptionLast = 0;
var uncaughtExceptionCount = 0;

function ___cxa_throw(ptr, type, destructor) {
    var info = new ExceptionInfo(ptr);
    info.init(type, destructor);
    exceptionLast = ptr;
    uncaughtExceptionCount++;
    throw ptr
}

function _tzset() {
    if (_tzset.called) return;
    _tzset.called = true;
    var currentYear = (new Date).getFullYear();
    var winter = new Date(currentYear, 0, 1);
    var summer = new Date(currentYear, 6, 1);
    var winterOffset = winter.getTimezoneOffset();
    var summerOffset = summer.getTimezoneOffset();
    var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
    HEAP32[__get_timezone() >> 2] = stdTimezoneOffset * 60;
    HEAP32[__get_daylight() >> 2] = Number(winterOffset != summerOffset);

    function extractZone(date) {
        var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
        return match ? match[1] : "GMT"
    }
    var winterName = extractZone(winter);
    var summerName = extractZone(summer);
    var winterNamePtr = allocateUTF8(winterName);
    var summerNamePtr = allocateUTF8(summerName);
    if (summerOffset < winterOffset) {
        HEAP32[__get_tzname() >> 2] = winterNamePtr;
        HEAP32[__get_tzname() + 4 >> 2] = summerNamePtr
    } else {
        HEAP32[__get_tzname() >> 2] = summerNamePtr;
        HEAP32[__get_tzname() + 4 >> 2] = winterNamePtr
    }
}

function _localtime_r(time, tmPtr) {
    _tzset();
    var date = new Date(HEAP32[time >> 2] * 1e3);
    HEAP32[tmPtr >> 2] = date.getSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getHours();
    HEAP32[tmPtr + 12 >> 2] = date.getDate();
    HEAP32[tmPtr + 16 >> 2] = date.getMonth();
    HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
    HEAP32[tmPtr + 24 >> 2] = date.getDay();
    var start = new Date(date.getFullYear(), 0, 1);
    var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday;
    HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
    var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    var winterOffset = start.getTimezoneOffset();
    var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
    HEAP32[tmPtr + 32 >> 2] = dst;
    var zonePtr = HEAP32[__get_tzname() + (dst ? 4 : 0) >> 2];
    HEAP32[tmPtr + 40 >> 2] = zonePtr;
    return tmPtr
}

function ___localtime_r(a0, a1) {
    return _localtime_r(a0, a1)
}

function setErrNo(value) {
    HEAP32[___errno_location() >> 2] = value;
    return value
}
var PATH = {
    splitPath: function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1)
    },
    normalizeArray: function (parts, allowAboveRoot) {
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
    },
    normalize: function (path) {
        var isAbsolute = path.charAt(0) === "/",
            trailingSlash = path.substr(-1) === "/";
        path = PATH.normalizeArray(path.split("/").filter(function (p) {
            return !!p
        }), !isAbsolute).join("/");
        if (!path && !isAbsolute) {
            path = "."
        }
        if (path && trailingSlash) {
            path += "/"
        }
        return (isAbsolute ? "/" : "") + path
    },
    dirname: function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
            return "."
        }
        if (dir) {
            dir = dir.substr(0, dir.length - 1)
        }
        return root + dir
    },
    basename: function (path) {
        if (path === "/") return "/";
        path = PATH.normalize(path);
        path = path.replace(/\/$/, "");
        var lastSlash = path.lastIndexOf("/");
        if (lastSlash === -1) return path;
        return path.substr(lastSlash + 1)
    },
    extname: function (path) {
        return PATH.splitPath(path)[3]
    },
    join: function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join("/"))
    },
    join2: function (l, r) {
        return PATH.normalize(l + "/" + r)
    }
};

function getRandomDevice() {
    if (typeof crypto === "object" && typeof crypto["getRandomValues"] === "function") {
        var randomBuffer = new Uint8Array(1);
        return function () {
            crypto.getRandomValues(randomBuffer);
            return randomBuffer[0]
        }
    } else if (ENVIRONMENT_IS_NODE) {
        try {
            var crypto_module = require("crypto");
            return function () {
                return crypto_module["randomBytes"](1)[0]
            }
        } catch (e) {}
    }
    return function () {
        abort("randomDevice")
    }
}
var PATH_FS = {
    resolve: function () {
        var resolvedPath = "",
            resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path = i >= 0 ? arguments[i] : FS.cwd();
            if (typeof path !== "string") {
                throw new TypeError("Arguments to path.resolve must be strings")
            } else if (!path) {
                return ""
            }
            resolvedPath = path + "/" + resolvedPath;
            resolvedAbsolute = path.charAt(0) === "/"
        }
        resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function (p) {
            return !!p
        }), !resolvedAbsolute).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
    },
    relative: function (from, to) {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);

        function trim(arr) {
            var start = 0;
            for (; start < arr.length; start++) {
                if (arr[start] !== "") break
            }
            var end = arr.length - 1;
            for (; end >= 0; end--) {
                if (arr[end] !== "") break
            }
            if (start > end) return [];
            return arr.slice(start, end - start + 1)
        }
        var fromParts = trim(from.split("/"));
        var toParts = trim(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
            if (fromParts[i] !== toParts[i]) {
                samePartsLength = i;
                break
            }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
            outputParts.push("..")
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/")
    }
};
var TTY = {
    ttys: [],
    init: function () {},
    shutdown: function () {},
    register: function (dev, ops) {
        TTY.ttys[dev] = {
            input: [],
            output: [],
            ops: ops
        };
        FS.registerDevice(dev, TTY.stream_ops)
    },
    stream_ops: {
        open: function (stream) {
            var tty = TTY.ttys[stream.node.rdev];
            if (!tty) {
                throw new FS.ErrnoError(43)
            }
            stream.tty = tty;
            stream.seekable = false
        },
        close: function (stream) {
            stream.tty.ops.flush(stream.tty)
        },
        flush: function (stream) {
            stream.tty.ops.flush(stream.tty)
        },
        read: function (stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.get_char) {
                throw new FS.ErrnoError(60)
            }
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
                var result;
                try {
                    result = stream.tty.ops.get_char(stream.tty)
                } catch (e) {
                    throw new FS.ErrnoError(29)
                }
                if (result === undefined && bytesRead === 0) {
                    throw new FS.ErrnoError(6)
                }
                if (result === null || result === undefined) break;
                bytesRead++;
                buffer[offset + i] = result
            }
            if (bytesRead) {
                stream.node.timestamp = Date.now()
            }
            return bytesRead
        },
        write: function (stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.put_char) {
                throw new FS.ErrnoError(60)
            }
            try {
                for (var i = 0; i < length; i++) {
                    stream.tty.ops.put_char(stream.tty, buffer[offset + i])
                }
            } catch (e) {
                throw new FS.ErrnoError(29)
            }
            if (length) {
                stream.node.timestamp = Date.now()
            }
            return i
        }
    },
    default_tty_ops: {
        get_char: function (tty) {
            if (!tty.input.length) {
                var result = null;
                if (ENVIRONMENT_IS_NODE) {
                    var BUFSIZE = 256;
                    var buf = Buffer.alloc ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE);
                    var bytesRead = 0;
                    try {
                        bytesRead = nodeFS.readSync(process.stdin.fd, buf, 0, BUFSIZE, null)
                    } catch (e) {
                        if (e.toString().indexOf("EOF") != -1) bytesRead = 0;
                        else throw e
                    }
                    if (bytesRead > 0) {
                        result = buf.slice(0, bytesRead).toString("utf-8")
                    } else {
                        result = null
                    }
                } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                    result = window.prompt("Input: ");
                    if (result !== null) {
                        result += "\n"
                    }
                } else if (typeof readline == "function") {
                    result = readline();
                    if (result !== null) {
                        result += "\n"
                    }
                }
                if (!result) {
                    return null
                }
                tty.input = intArrayFromString(result, true)
            }
            return tty.input.shift()
        },
        put_char: function (tty, val) {
            if (val === null || val === 10) {
                out(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0) tty.output.push(val)
            }
        },
        flush: function (tty) {
            if (tty.output && tty.output.length > 0) {
                out(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
    },
    default_tty1_ops: {
        put_char: function (tty, val) {
            if (val === null || val === 10) {
                err(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0) tty.output.push(val)
            }
        },
        flush: function (tty) {
            if (tty.output && tty.output.length > 0) {
                err(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
    }
};

function mmapAlloc(size) {
    var alignedSize = alignMemory(size, 16384);
    var ptr = _malloc(alignedSize);
    while (size < alignedSize) HEAP8[ptr + size++] = 0;
    return ptr
}
var MEMFS = {
    ops_table: null,
    mount: function (mount) {
        return MEMFS.createNode(null, "/", 16384 | 511, 0)
    },
    createNode: function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
            throw new FS.ErrnoError(63)
        }
        if (!MEMFS.ops_table) {
            MEMFS.ops_table = {
                dir: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        lookup: MEMFS.node_ops.lookup,
                        mknod: MEMFS.node_ops.mknod,
                        rename: MEMFS.node_ops.rename,
                        unlink: MEMFS.node_ops.unlink,
                        rmdir: MEMFS.node_ops.rmdir,
                        readdir: MEMFS.node_ops.readdir,
                        symlink: MEMFS.node_ops.symlink
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek
                    }
                },
                file: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek,
                        read: MEMFS.stream_ops.read,
                        write: MEMFS.stream_ops.write,
                        allocate: MEMFS.stream_ops.allocate,
                        mmap: MEMFS.stream_ops.mmap,
                        msync: MEMFS.stream_ops.msync
                    }
                },
                link: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        readlink: MEMFS.node_ops.readlink
                    },
                    stream: {}
                },
                chrdev: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: FS.chrdev_stream_ops
                }
            }
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
            node.node_ops = MEMFS.ops_table.dir.node;
            node.stream_ops = MEMFS.ops_table.dir.stream;
            node.contents = {}
        } else if (FS.isFile(node.mode)) {
            node.node_ops = MEMFS.ops_table.file.node;
            node.stream_ops = MEMFS.ops_table.file.stream;
            node.usedBytes = 0;
            node.contents = null
        } else if (FS.isLink(node.mode)) {
            node.node_ops = MEMFS.ops_table.link.node;
            node.stream_ops = MEMFS.ops_table.link.stream
        } else if (FS.isChrdev(node.mode)) {
            node.node_ops = MEMFS.ops_table.chrdev.node;
            node.stream_ops = MEMFS.ops_table.chrdev.stream
        }
        node.timestamp = Date.now();
        if (parent) {
            parent.contents[name] = node;
            parent.timestamp = node.timestamp
        }
        return node
    },
    getFileDataAsTypedArray: function (node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents)
    },
    expandFileStorage: function (node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0)
    },
    resizeFileStorage: function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
            node.contents = null;
            node.usedBytes = 0
        } else {
            var oldContents = node.contents;
            node.contents = new Uint8Array(newSize);
            if (oldContents) {
                node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
            }
            node.usedBytes = newSize
        }
    },
    node_ops: {
        getattr: function (node) {
            var attr = {};
            attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
            attr.ino = node.id;
            attr.mode = node.mode;
            attr.nlink = 1;
            attr.uid = 0;
            attr.gid = 0;
            attr.rdev = node.rdev;
            if (FS.isDir(node.mode)) {
                attr.size = 4096
            } else if (FS.isFile(node.mode)) {
                attr.size = node.usedBytes
            } else if (FS.isLink(node.mode)) {
                attr.size = node.link.length
            } else {
                attr.size = 0
            }
            attr.atime = new Date(node.timestamp);
            attr.mtime = new Date(node.timestamp);
            attr.ctime = new Date(node.timestamp);
            attr.blksize = 4096;
            attr.blocks = Math.ceil(attr.size / attr.blksize);
            return attr
        },
        setattr: function (node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
            if (attr.size !== undefined) {
                MEMFS.resizeFileStorage(node, attr.size)
            }
        },
        lookup: function (parent, name) {
            throw FS.genericErrors[44]
        },
        mknod: function (parent, name, mode, dev) {
            return MEMFS.createNode(parent, name, mode, dev)
        },
        rename: function (old_node, new_dir, new_name) {
            if (FS.isDir(old_node.mode)) {
                var new_node;
                try {
                    new_node = FS.lookupNode(new_dir, new_name)
                } catch (e) {}
                if (new_node) {
                    for (var i in new_node.contents) {
                        throw new FS.ErrnoError(55)
                    }
                }
            }
            delete old_node.parent.contents[old_node.name];
            old_node.parent.timestamp = Date.now();
            old_node.name = new_name;
            new_dir.contents[new_name] = old_node;
            new_dir.timestamp = old_node.parent.timestamp;
            old_node.parent = new_dir
        },
        unlink: function (parent, name) {
            delete parent.contents[name];
            parent.timestamp = Date.now()
        },
        rmdir: function (parent, name) {
            var node = FS.lookupNode(parent, name);
            for (var i in node.contents) {
                throw new FS.ErrnoError(55)
            }
            delete parent.contents[name];
            parent.timestamp = Date.now()
        },
        readdir: function (node) {
            var entries = [".", ".."];
            for (var key in node.contents) {
                if (!node.contents.hasOwnProperty(key)) {
                    continue
                }
                entries.push(key)
            }
            return entries
        },
        symlink: function (parent, newname, oldpath) {
            var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
            node.link = oldpath;
            return node
        },
        readlink: function (node) {
            if (!FS.isLink(node.mode)) {
                throw new FS.ErrnoError(28)
            }
            return node.link
        }
    },
    stream_ops: {
        read: function (stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= stream.node.usedBytes) return 0;
            var size = Math.min(stream.node.usedBytes - position, length);
            if (size > 8 && contents.subarray) {
                buffer.set(contents.subarray(position, position + size), offset)
            } else {
                for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i]
            }
            return size
        },
        write: function (stream, buffer, offset, length, position, canOwn) {
            if (buffer.buffer === HEAP8.buffer) {
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
                    node.contents = buffer.slice(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) {
                node.contents.set(buffer.subarray(offset, offset + length), position)
            } else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        },
        llseek: function (stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.usedBytes
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(28)
            }
            return position
        },
        allocate: function (stream, offset, length) {
            MEMFS.expandFileStorage(stream.node, offset + length);
            stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
        },
        mmap: function (stream, address, length, position, prot, flags) {
            if (address !== 0) {
                throw new FS.ErrnoError(28)
            }
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(43)
            }
            var ptr;
            var allocated;
            var contents = stream.node.contents;
            if (!(flags & 2) && contents.buffer === buffer) {
                allocated = false;
                ptr = contents.byteOffset
            } else {
                if (position > 0 || position + length < contents.length) {
                    if (contents.subarray) {
                        contents = contents.subarray(position, position + length)
                    } else {
                        contents = Array.prototype.slice.call(contents, position, position + length)
                    }
                }
                allocated = true;
                ptr = mmapAlloc(length);
                if (!ptr) {
                    throw new FS.ErrnoError(48)
                }
                HEAP8.set(contents, ptr)
            }
            return {
                ptr: ptr,
                allocated: allocated
            }
        },
        msync: function (stream, buffer, offset, length, mmapFlags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(43)
            }
            if (mmapFlags & 2) {
                return 0
            }
            var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
            return 0
        }
    }
};
var FS = {
    root: null,
    mounts: [],
    devices: {},
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    trackingDelegate: {},
    tracking: {
        openFlags: {
            READ: 1,
            WRITE: 2
        }
    },
    ErrnoError: null,
    genericErrors: {},
    filesystems: null,
    syncFSRequests: 0,
    lookupPath: function (path, opts) {
        path = PATH_FS.resolve(FS.cwd(), path);
        opts = opts || {};
        if (!path) return {
            path: "",
            node: null
        };
        var defaults = {
            follow_mount: true,
            recurse_count: 0
        };
        for (var key in defaults) {
            if (opts[key] === undefined) {
                opts[key] = defaults[key]
            }
        }
        if (opts.recurse_count > 8) {
            throw new FS.ErrnoError(32)
        }
        var parts = PATH.normalizeArray(path.split("/").filter(function (p) {
            return !!p
        }), false);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) {
                break
            }
            current = FS.lookupNode(current, parts[i]);
            current_path = PATH.join2(current_path, parts[i]);
            if (FS.isMountpoint(current)) {
                if (!islast || islast && opts.follow_mount) {
                    current = current.mounted.root
                }
            }
            if (!islast || opts.follow) {
                var count = 0;
                while (FS.isLink(current.mode)) {
                    var link = FS.readlink(current_path);
                    current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
                    var lookup = FS.lookupPath(current_path, {
                        recurse_count: opts.recurse_count
                    });
                    current = lookup.node;
                    if (count++ > 40) {
                        throw new FS.ErrnoError(32)
                    }
                }
            }
        }
        return {
            path: current_path,
            node: current
        }
    },
    getPath: function (node) {
        var path;
        while (true) {
            if (FS.isRoot(node)) {
                var mount = node.mount.mountpoint;
                if (!path) return mount;
                return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
            }
            path = path ? node.name + "/" + path : node.name;
            node = node.parent
        }
    },
    hashName: function (parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = (hash << 5) - hash + name.charCodeAt(i) | 0
        }
        return (parentid + hash >>> 0) % FS.nameTable.length
    },
    hashAddNode: function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node
    },
    hashRemoveNode: function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
            FS.nameTable[hash] = node.name_next
        } else {
            var current = FS.nameTable[hash];
            while (current) {
                if (current.name_next === node) {
                    current.name_next = node.name_next;
                    break
                }
                current = current.name_next
            }
        }
    },
    lookupNode: function (parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
            throw new FS.ErrnoError(errCode, parent)
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
            var nodeName = node.name;
            if (node.parent.id === parent.id && nodeName === name) {
                return node
            }
        }
        return FS.lookup(parent, name)
    },
    createNode: function (parent, name, mode, rdev) {
        var node = new FS.FSNode(parent, name, mode, rdev);
        FS.hashAddNode(node);
        return node
    },
    destroyNode: function (node) {
        FS.hashRemoveNode(node)
    },
    isRoot: function (node) {
        return node === node.parent
    },
    isMountpoint: function (node) {
        return !!node.mounted
    },
    isFile: function (mode) {
        return (mode & 61440) === 32768
    },
    isDir: function (mode) {
        return (mode & 61440) === 16384
    },
    isLink: function (mode) {
        return (mode & 61440) === 40960
    },
    isChrdev: function (mode) {
        return (mode & 61440) === 8192
    },
    isBlkdev: function (mode) {
        return (mode & 61440) === 24576
    },
    isFIFO: function (mode) {
        return (mode & 61440) === 4096
    },
    isSocket: function (mode) {
        return (mode & 49152) === 49152
    },
    flagModes: {
        "r": 0,
        "r+": 2,
        "w": 577,
        "w+": 578,
        "a": 1089,
        "a+": 1090
    },
    modeStringToFlags: function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === "undefined") {
            throw new Error("Unknown file open mode: " + str)
        }
        return flags
    },
    flagsToPermissionString: function (flag) {
        var perms = ["r", "w", "rw"][flag & 3];
        if (flag & 512) {
            perms += "w"
        }
        return perms
    },
    nodePermissions: function (node, perms) {
        if (FS.ignorePermissions) {
            return 0
        }
        if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
            return 2
        } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
            return 2
        } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
            return 2
        }
        return 0
    },
    mayLookup: function (dir) {
        var errCode = FS.nodePermissions(dir, "x");
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0
    },
    mayCreate: function (dir, name) {
        try {
            var node = FS.lookupNode(dir, name);
            return 20
        } catch (e) {}
        return FS.nodePermissions(dir, "wx")
    },
    mayDelete: function (dir, name, isdir) {
        var node;
        try {
            node = FS.lookupNode(dir, name)
        } catch (e) {
            return e.errno
        }
        var errCode = FS.nodePermissions(dir, "wx");
        if (errCode) {
            return errCode
        }
        if (isdir) {
            if (!FS.isDir(node.mode)) {
                return 54
            }
            if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                return 10
            }
        } else {
            if (FS.isDir(node.mode)) {
                return 31
            }
        }
        return 0
    },
    mayOpen: function (node, flags) {
        if (!node) {
            return 44
        }
        if (FS.isLink(node.mode)) {
            return 32
        } else if (FS.isDir(node.mode)) {
            if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
                return 31
            }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
    },
    MAX_OPEN_FDS: 4096,
    nextfd: function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
            if (!FS.streams[fd]) {
                return fd
            }
        }
        throw new FS.ErrnoError(33)
    },
    getStream: function (fd) {
        return FS.streams[fd]
    },
    createStream: function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
            FS.FSStream = function () {};
            FS.FSStream.prototype = {
                object: {
                    get: function () {
                        return this.node
                    },
                    set: function (val) {
                        this.node = val
                    }
                },
                isRead: {
                    get: function () {
                        return (this.flags & 2097155) !== 1
                    }
                },
                isWrite: {
                    get: function () {
                        return (this.flags & 2097155) !== 0
                    }
                },
                isAppend: {
                    get: function () {
                        return this.flags & 1024
                    }
                }
            }
        }
        var newStream = new FS.FSStream;
        for (var p in stream) {
            newStream[p] = stream[p]
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream
    },
    closeStream: function (fd) {
        FS.streams[fd] = null
    },
    chrdev_stream_ops: {
        open: function (stream) {
            var device = FS.getDevice(stream.node.rdev);
            stream.stream_ops = device.stream_ops;
            if (stream.stream_ops.open) {
                stream.stream_ops.open(stream)
            }
        },
        llseek: function () {
            throw new FS.ErrnoError(70)
        }
    },
    major: function (dev) {
        return dev >> 8
    },
    minor: function (dev) {
        return dev & 255
    },
    makedev: function (ma, mi) {
        return ma << 8 | mi
    },
    registerDevice: function (dev, ops) {
        FS.devices[dev] = {
            stream_ops: ops
        }
    },
    getDevice: function (dev) {
        return FS.devices[dev]
    },
    getMounts: function (mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
            var m = check.pop();
            mounts.push(m);
            check.push.apply(check, m.mounts)
        }
        return mounts
    },
    syncfs: function (populate, callback) {
        if (typeof populate === "function") {
            callback = populate;
            populate = false
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) {
            err("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;

        function doCallback(errCode) {
            FS.syncFSRequests--;
            return callback(errCode)
        }

        function done(errCode) {
            if (errCode) {
                if (!done.errored) {
                    done.errored = true;
                    return doCallback(errCode)
                }
                return
            }
            if (++completed >= mounts.length) {
                doCallback(null)
            }
        }
        mounts.forEach(function (mount) {
            if (!mount.type.syncfs) {
                return done(null)
            }
            mount.type.syncfs(mount, populate, done)
        })
    },
    mount: function (type, opts, mountpoint) {
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
            throw new FS.ErrnoError(10)
        } else if (!root && !pseudo) {
            var lookup = FS.lookupPath(mountpoint, {
                follow_mount: false
            });
            mountpoint = lookup.path;
            node = lookup.node;
            if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(10)
            }
            if (!FS.isDir(node.mode)) {
                throw new FS.ErrnoError(54)
            }
        }
        var mount = {
            type: type,
            opts: opts,
            mountpoint: mountpoint,
            mounts: []
        };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
            FS.root = mountRoot
        } else if (node) {
            node.mounted = mount;
            if (node.mount) {
                node.mount.mounts.push(mount)
            }
        }
        return mountRoot
    },
    unmount: function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, {
            follow_mount: false
        });
        if (!FS.isMountpoint(lookup.node)) {
            throw new FS.ErrnoError(28)
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach(function (hash) {
            var current = FS.nameTable[hash];
            while (current) {
                var next = current.name_next;
                if (mounts.indexOf(current.mount) !== -1) {
                    FS.destroyNode(current)
                }
                current = next
            }
        });
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        node.mount.mounts.splice(idx, 1)
    },
    lookup: function (parent, name) {
        return parent.node_ops.lookup(parent, name)
    },
    mknod: function (path, mode, dev) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === "." || name === "..") {
            throw new FS.ErrnoError(28)
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.mknod) {
            throw new FS.ErrnoError(63)
        }
        return parent.node_ops.mknod(parent, name, mode, dev)
    },
    create: function (path, mode) {
        mode = mode !== undefined ? mode : 438;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0)
    },
    mkdir: function (path, mode) {
        mode = mode !== undefined ? mode : 511;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0)
    },
    mkdirTree: function (path, mode) {
        var dirs = path.split("/");
        var d = "";
        for (var i = 0; i < dirs.length; ++i) {
            if (!dirs[i]) continue;
            d += "/" + dirs[i];
            try {
                FS.mkdir(d, mode)
            } catch (e) {
                if (e.errno != 20) throw e
            }
        }
    },
    mkdev: function (path, mode, dev) {
        if (typeof dev === "undefined") {
            dev = mode;
            mode = 438
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev)
    },
    symlink: function (oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
            throw new FS.ErrnoError(44)
        }
        var lookup = FS.lookupPath(newpath, {
            parent: true
        });
        var parent = lookup.node;
        if (!parent) {
            throw new FS.ErrnoError(44)
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.symlink) {
            throw new FS.ErrnoError(63)
        }
        return parent.node_ops.symlink(parent, newname, oldpath)
    },
    rename: function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        lookup = FS.lookupPath(old_path, {
            parent: true
        });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, {
            parent: true
        });
        new_dir = lookup.node;
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        if (old_dir.mount !== new_dir.mount) {
            throw new FS.ErrnoError(75)
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(28)
        }
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(55)
        }
        var new_node;
        try {
            new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {}
        if (old_node === new_node) {
            return
        }
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!old_dir.node_ops.rename) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
            throw new FS.ErrnoError(10)
        }
        if (new_dir !== old_dir) {
            errCode = FS.nodePermissions(old_dir, "w");
            if (errCode) {
                throw new FS.ErrnoError(errCode)
            }
        }
        try {
            if (FS.trackingDelegate["willMovePath"]) {
                FS.trackingDelegate["willMovePath"](old_path, new_path)
            }
        } catch (e) {
            err("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
        FS.hashRemoveNode(old_node);
        try {
            old_dir.node_ops.rename(old_node, new_dir, new_name)
        } catch (e) {
            throw e
        } finally {
            FS.hashAddNode(old_node)
        }
        try {
            if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path)
        } catch (e) {
            err("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
    },
    rmdir: function (path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.rmdir) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            err("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            err("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    },
    readdir: function (path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
            throw new FS.ErrnoError(54)
        }
        return node.node_ops.readdir(node)
    },
    unlink: function (path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.unlink) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            err("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            err("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    },
    readlink: function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
            throw new FS.ErrnoError(44)
        }
        if (!link.node_ops.readlink) {
            throw new FS.ErrnoError(28)
        }
        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
    },
    stat: function (path, dontFollow) {
        var lookup = FS.lookupPath(path, {
            follow: !dontFollow
        });
        var node = lookup.node;
        if (!node) {
            throw new FS.ErrnoError(44)
        }
        if (!node.node_ops.getattr) {
            throw new FS.ErrnoError(63)
        }
        return node.node_ops.getattr(node)
    },
    lstat: function (path) {
        return FS.stat(path, true)
    },
    chmod: function (path, mode, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
            mode: mode & 4095 | node.mode & ~4095,
            timestamp: Date.now()
        })
    },
    lchmod: function (path, mode) {
        FS.chmod(path, mode, true)
    },
    fchmod: function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        FS.chmod(stream.node, mode)
    },
    chown: function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
            timestamp: Date.now()
        })
    },
    lchown: function (path, uid, gid) {
        FS.chown(path, uid, gid, true)
    },
    fchown: function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        FS.chown(stream.node, uid, gid)
    },
    truncate: function (path, len) {
        if (len < 0) {
            throw new FS.ErrnoError(28)
        }
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: true
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isDir(node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!FS.isFile(node.mode)) {
            throw new FS.ErrnoError(28)
        }
        var errCode = FS.nodePermissions(node, "w");
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        node.node_ops.setattr(node, {
            size: len,
            timestamp: Date.now()
        })
    },
    ftruncate: function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(28)
        }
        FS.truncate(stream.node, len)
    },
    utime: function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        node.node_ops.setattr(node, {
            timestamp: Math.max(atime, mtime)
        })
    },
    open: function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
            throw new FS.ErrnoError(44)
        }
        flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === "undefined" ? 438 : mode;
        if (flags & 64) {
            mode = mode & 4095 | 32768
        } else {
            mode = 0
        }
        var node;
        if (typeof path === "object") {
            node = path
        } else {
            path = PATH.normalize(path);
            try {
                var lookup = FS.lookupPath(path, {
                    follow: !(flags & 131072)
                });
                node = lookup.node
            } catch (e) {}
        }
        var created = false;
        if (flags & 64) {
            if (node) {
                if (flags & 128) {
                    throw new FS.ErrnoError(20)
                }
            } else {
                node = FS.mknod(path, mode, 0);
                created = true
            }
        }
        if (!node) {
            throw new FS.ErrnoError(44)
        }
        if (FS.isChrdev(node.mode)) {
            flags &= ~512
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54)
        }
        if (!created) {
            var errCode = FS.mayOpen(node, flags);
            if (errCode) {
                throw new FS.ErrnoError(errCode)
            }
        }
        if (flags & 512) {
            FS.truncate(node, 0)
        }
        flags &= ~(128 | 512 | 131072);
        var stream = FS.createStream({
            node: node,
            path: FS.getPath(node),
            flags: flags,
            seekable: true,
            position: 0,
            stream_ops: node.stream_ops,
            ungotten: [],
            error: false
        }, fd_start, fd_end);
        if (stream.stream_ops.open) {
            stream.stream_ops.open(stream)
        }
        if (Module["logReadFiles"] && !(flags & 1)) {
            if (!FS.readFiles) FS.readFiles = {};
            if (!(path in FS.readFiles)) {
                FS.readFiles[path] = 1;
                err("FS.trackingDelegate error on read file: " + path)
            }
        }
        try {
            if (FS.trackingDelegate["onOpenFile"]) {
                var trackingFlags = 0;
                if ((flags & 2097155) !== 1) {
                    trackingFlags |= FS.tracking.openFlags.READ
                }
                if ((flags & 2097155) !== 0) {
                    trackingFlags |= FS.tracking.openFlags.WRITE
                }
                FS.trackingDelegate["onOpenFile"](path, trackingFlags)
            }
        } catch (e) {
            err("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
        }
        return stream
    },
    close: function (stream) {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (stream.getdents) stream.getdents = null;
        try {
            if (stream.stream_ops.close) {
                stream.stream_ops.close(stream)
            }
        } catch (e) {
            throw e
        } finally {
            FS.closeStream(stream.fd)
        }
        stream.fd = null
    },
    isClosed: function (stream) {
        return stream.fd === null
    },
    llseek: function (stream, offset, whence) {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
            throw new FS.ErrnoError(70)
        }
        if (whence != 0 && whence != 1 && whence != 2) {
            throw new FS.ErrnoError(28)
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position
    },
    read: function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.read) {
            throw new FS.ErrnoError(28)
        }
        var seeking = typeof position !== "undefined";
        if (!seeking) {
            position = stream.position
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(70)
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead
    },
    write: function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.write) {
            throw new FS.ErrnoError(28)
        }
        if (stream.seekable && stream.flags & 1024) {
            FS.llseek(stream, 0, 2)
        }
        var seeking = typeof position !== "undefined";
        if (!seeking) {
            position = stream.position
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(70)
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
            if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path)
        } catch (e) {
            err("FS.trackingDelegate['onWriteToFile']('" + stream.path + "') threw an exception: " + e.message)
        }
        return bytesWritten
    },
    allocate: function (stream, offset, length) {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (offset < 0 || length <= 0) {
            throw new FS.ErrnoError(28)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8)
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(43)
        }
        if (!stream.stream_ops.allocate) {
            throw new FS.ErrnoError(138)
        }
        stream.stream_ops.allocate(stream, offset, length)
    },
    mmap: function (stream, address, length, position, prot, flags) {
        if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
            throw new FS.ErrnoError(2)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(2)
        }
        if (!stream.stream_ops.mmap) {
            throw new FS.ErrnoError(43)
        }
        return stream.stream_ops.mmap(stream, address, length, position, prot, flags)
    },
    msync: function (stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
            return 0
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
    },
    munmap: function (stream) {
        return 0
    },
    ioctl: function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
            throw new FS.ErrnoError(59)
        }
        return stream.stream_ops.ioctl(stream, cmd, arg)
    },
    readFile: function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") {
            ret = UTF8ArrayToString(buf, 0)
        } else if (opts.encoding === "binary") {
            ret = buf
        }
        FS.close(stream);
        return ret
    },
    writeFile: function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data === "string") {
            var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
            var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
            FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
        } else if (ArrayBuffer.isView(data)) {
            FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
        } else {
            throw new Error("Unsupported data type")
        }
        FS.close(stream)
    },
    cwd: function () {
        return FS.currentPath
    },
    chdir: function (path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        if (lookup.node === null) {
            throw new FS.ErrnoError(44)
        }
        if (!FS.isDir(lookup.node.mode)) {
            throw new FS.ErrnoError(54)
        }
        var errCode = FS.nodePermissions(lookup.node, "x");
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        FS.currentPath = lookup.path
    },
    createDefaultDirectories: function () {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user")
    },
    createDefaultDevices: function () {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
            read: function () {
                return 0
            },
            write: function (stream, buffer, offset, length, pos) {
                return length
            }
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var random_device = getRandomDevice();
        FS.createDevice("/dev", "random", random_device);
        FS.createDevice("/dev", "urandom", random_device);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp")
    },
    createSpecialDirectories: function () {
        FS.mkdir("/proc");
        var proc_self = FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount({
            mount: function () {
                var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
                node.node_ops = {
                    lookup: function (parent, name) {
                        var fd = +name;
                        var stream = FS.getStream(fd);
                        if (!stream) throw new FS.ErrnoError(8);
                        var ret = {
                            parent: null,
                            mount: {
                                mountpoint: "fake"
                            },
                            node_ops: {
                                readlink: function () {
                                    return stream.path
                                }
                            }
                        };
                        ret.parent = ret;
                        return ret
                    }
                };
                return node
            }
        }, {}, "/proc/self/fd")
    },
    createStandardStreams: function () {
        if (Module["stdin"]) {
            FS.createDevice("/dev", "stdin", Module["stdin"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdin")
        }
        if (Module["stdout"]) {
            FS.createDevice("/dev", "stdout", null, Module["stdout"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdout")
        }
        if (Module["stderr"]) {
            FS.createDevice("/dev", "stderr", null, Module["stderr"])
        } else {
            FS.symlink("/dev/tty1", "/dev/stderr")
        }
        var stdin = FS.open("/dev/stdin", 0);
        var stdout = FS.open("/dev/stdout", 1);
        var stderr = FS.open("/dev/stderr", 1)
    },
    ensureErrnoError: function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
            this.node = node;
            this.setErrno = function (errno) {
                this.errno = errno
            };
            this.setErrno(errno);
            this.message = "FS error"
        };
        FS.ErrnoError.prototype = new Error;
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        [44].forEach(function (code) {
            FS.genericErrors[code] = new FS.ErrnoError(code);
            FS.genericErrors[code].stack = "<generic error, no stack>"
        })
    },
    staticInit: function () {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = {
            "MEMFS": MEMFS
        }
    },
    init: function (input, output, error) {
        FS.init.initialized = true;
        FS.ensureErrnoError();
        Module["stdin"] = input || Module["stdin"];
        Module["stdout"] = output || Module["stdout"];
        Module["stderr"] = error || Module["stderr"];
        FS.createStandardStreams()
    },
    quit: function () {
        FS.init.initialized = false;
        var fflush = Module["_fflush"];
        if (fflush) fflush(0);
        for (var i = 0; i < FS.streams.length; i++) {
            var stream = FS.streams[i];
            if (!stream) {
                continue
            }
            FS.close(stream)
        }
    },
    getMode: function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode
    },
    findObject: function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
            return ret.object
        } else {
            return null
        }
    },
    analyzePath: function (path, dontResolveLastLink) {
        try {
            var lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            path = lookup.path
        } catch (e) {}
        var ret = {
            isRoot: false,
            exists: false,
            error: 0,
            name: null,
            path: null,
            object: null,
            parentExists: false,
            parentPath: null,
            parentObject: null
        };
        try {
            var lookup = FS.lookupPath(path, {
                parent: true
            });
            ret.parentExists = true;
            ret.parentPath = lookup.path;
            ret.parentObject = lookup.node;
            ret.name = PATH.basename(path);
            lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            ret.exists = true;
            ret.path = lookup.path;
            ret.object = lookup.node;
            ret.name = lookup.node.name;
            ret.isRoot = lookup.path === "/"
        } catch (e) {
            ret.error = e.errno
        }
        return ret
    },
    createPath: function (parent, path, canRead, canWrite) {
        parent = typeof parent === "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
            var part = parts.pop();
            if (!part) continue;
            var current = PATH.join2(parent, part);
            try {
                FS.mkdir(current)
            } catch (e) {}
            parent = current
        }
        return current
    },
    createFile: function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode)
    },
    createDataFile: function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
            if (typeof data === "string") {
                var arr = new Array(data.length);
                for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
                data = arr
            }
            FS.chmod(node, mode | 146);
            var stream = FS.open(node, 577);
            FS.write(stream, data, 0, data.length, 0, canOwn);
            FS.close(stream);
            FS.chmod(node, mode)
        }
        return node
    },
    createDevice: function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
            open: function (stream) {
                stream.seekable = false
            },
            close: function (stream) {
                if (output && output.buffer && output.buffer.length) {
                    output(10)
                }
            },
            read: function (stream, buffer, offset, length, pos) {
                var bytesRead = 0;
                for (var i = 0; i < length; i++) {
                    var result;
                    try {
                        result = input()
                    } catch (e) {
                        throw new FS.ErrnoError(29)
                    }
                    if (result === undefined && bytesRead === 0) {
                        throw new FS.ErrnoError(6)
                    }
                    if (result === null || result === undefined) break;
                    bytesRead++;
                    buffer[offset + i] = result
                }
                if (bytesRead) {
                    stream.node.timestamp = Date.now()
                }
                return bytesRead
            },
            write: function (stream, buffer, offset, length, pos) {
                for (var i = 0; i < length; i++) {
                    try {
                        output(buffer[offset + i])
                    } catch (e) {
                        throw new FS.ErrnoError(29)
                    }
                }
                if (length) {
                    stream.node.timestamp = Date.now()
                }
                return i
            }
        });
        return FS.mkdev(path, mode, dev)
    },
    forceLoadFile: function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest !== "undefined") {
            throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
        } else if (read_) {
            try {
                obj.contents = intArrayFromString(read_(obj.url), true);
                obj.usedBytes = obj.contents.length
            } catch (e) {
                throw new FS.ErrnoError(29)
            }
        } else {
            throw new Error("Cannot load without read() or XMLHttpRequest.")
        }
    },
    createLazyFile: function (parent, name, url, canRead, canWrite) {
        function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length - 1 || idx < 0) {
                return undefined
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset]
        };
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter
        };
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
            var xhr = new XMLHttpRequest;
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing) chunkSize = datalength;
            var doXHR = function (from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
                if (xhr.overrideMimeType) {
                    xhr.overrideMimeType("text/plain; charset=x-user-defined")
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                    return new Uint8Array(xhr.response || [])
                } else {
                    return intArrayFromString(xhr.responseText || "", true)
                }
            };
            var lazyArray = this;
            lazyArray.setDataGetter(function (chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum + 1) * chunkSize - 1;
                end = Math.min(end, datalength - 1);
                if (typeof lazyArray.chunks[chunkNum] === "undefined") {
                    lazyArray.chunks[chunkNum] = doXHR(start, end)
                }
                if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum]
            });
            if (usesGzip || !datalength) {
                chunkSize = datalength = 1;
                datalength = this.getter(0).length;
                chunkSize = datalength;
                out("LazyFiles on gzip forces download of the whole file when length is accessed")
            }
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true
        };
        if (typeof XMLHttpRequest !== "undefined") {
            if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
            var lazyArray = new LazyUint8Array;
            Object.defineProperties(lazyArray, {
                length: {
                    get: function () {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._length
                    }
                },
                chunkSize: {
                    get: function () {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._chunkSize
                    }
                }
            });
            var properties = {
                isDevice: false,
                contents: lazyArray
            }
        } else {
            var properties = {
                isDevice: false,
                url: url
            }
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
            node.contents = properties.contents
        } else if (properties.url) {
            node.contents = null;
            node.url = properties.url
        }
        Object.defineProperties(node, {
            usedBytes: {
                get: function () {
                    return this.contents.length
                }
            }
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function (key) {
            var fn = node.stream_ops[key];
            stream_ops[key] = function forceLoadLazyFile() {
                FS.forceLoadFile(node);
                return fn.apply(null, arguments)
            }
        });
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
            FS.forceLoadFile(node);
            var contents = stream.node.contents;
            if (position >= contents.length) return 0;
            var size = Math.min(contents.length - position, length);
            if (contents.slice) {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents[position + i]
                }
            } else {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents.get(position + i)
                }
            }
            return size
        };
        node.stream_ops = stream_ops;
        return node
    },
    createPreloadedFile: function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency("cp " + fullname);

        function processData(byteArray) {
            function finish(byteArray) {
                if (preFinish) preFinish();
                if (!dontCreateFile) {
                    FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
                }
                if (onload) onload();
                removeRunDependency(dep)
            }
            var handled = false;
            Module["preloadPlugins"].forEach(function (plugin) {
                if (handled) return;
                if (plugin["canHandle"](fullname)) {
                    plugin["handle"](byteArray, fullname, finish, function () {
                        if (onerror) onerror();
                        removeRunDependency(dep)
                    });
                    handled = true
                }
            });
            if (!handled) finish(byteArray)
        }
        addRunDependency(dep);
        if (typeof url == "string") {
            Browser.asyncLoad(url, function (byteArray) {
                processData(byteArray)
            }, onerror)
        } else {
            processData(url)
        }
    },
    indexedDB: function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    },
    DB_NAME: function () {
        return "EM_FS_" + window.location.pathname
    },
    DB_VERSION: 20,
    DB_STORE_NAME: "FILE_DATA",
    saveFilesToDB: function (paths, onload, onerror) {
        onload = onload || function () {};
        onerror = onerror || function () {};
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
            out("creating db");
            var db = openRequest.result;
            db.createObjectStore(FS.DB_STORE_NAME)
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0,
                fail = 0,
                total = paths.length;

            function finish() {
                if (fail == 0) onload();
                else onerror()
            }
            paths.forEach(function (path) {
                var putRequest = files.put(FS.analyzePath(path).object.contents, path);
                putRequest.onsuccess = function putRequest_onsuccess() {
                    ok++;
                    if (ok + fail == total) finish()
                };
                putRequest.onerror = function putRequest_onerror() {
                    fail++;
                    if (ok + fail == total) finish()
                }
            });
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    },
    loadFilesFromDB: function (paths, onload, onerror) {
        onload = onload || function () {};
        onerror = onerror || function () {};
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = onerror;
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            try {
                var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
            } catch (e) {
                onerror(e);
                return
            }
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0,
                fail = 0,
                total = paths.length;

            function finish() {
                if (fail == 0) onload();
                else onerror()
            }
            paths.forEach(function (path) {
                var getRequest = files.get(path);
                getRequest.onsuccess = function getRequest_onsuccess() {
                    if (FS.analyzePath(path).exists) {
                        FS.unlink(path)
                    }
                    FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
                    ok++;
                    if (ok + fail == total) finish()
                };
                getRequest.onerror = function getRequest_onerror() {
                    fail++;
                    if (ok + fail == total) finish()
                }
            });
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    }
};
var SYSCALLS = {
    mappings: {},
    DEFAULT_POLLMASK: 5,
    umask: 511,
    calculateAt: function (dirfd, path, allowEmpty) {
        if (path[0] === "/") {
            return path
        }
        var dir;
        if (dirfd === -100) {
            dir = FS.cwd()
        } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream) throw new FS.ErrnoError(8);
            dir = dirstream.path
        }
        if (path.length == 0) {
            if (!allowEmpty) {
                throw new FS.ErrnoError(44)
            }
            return dir
        }
        return PATH.join2(dir, path)
    },
    doStat: function (func, path, buf) {
        try {
            var stat = func(path)
        } catch (e) {
            if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                return -54
            }
            throw e
        }
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 4 >> 2] = 0;
        HEAP32[buf + 8 >> 2] = stat.ino;
        HEAP32[buf + 12 >> 2] = stat.mode;
        HEAP32[buf + 16 >> 2] = stat.nlink;
        HEAP32[buf + 20 >> 2] = stat.uid;
        HEAP32[buf + 24 >> 2] = stat.gid;
        HEAP32[buf + 28 >> 2] = stat.rdev;
        HEAP32[buf + 32 >> 2] = 0;
        tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
        HEAP32[buf + 48 >> 2] = 4096;
        HEAP32[buf + 52 >> 2] = stat.blocks;
        HEAP32[buf + 56 >> 2] = stat.atime.getTime() / 1e3 | 0;
        HEAP32[buf + 60 >> 2] = 0;
        HEAP32[buf + 64 >> 2] = stat.mtime.getTime() / 1e3 | 0;
        HEAP32[buf + 68 >> 2] = 0;
        HEAP32[buf + 72 >> 2] = stat.ctime.getTime() / 1e3 | 0;
        HEAP32[buf + 76 >> 2] = 0;
        tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 80 >> 2] = tempI64[0], HEAP32[buf + 84 >> 2] = tempI64[1];
        return 0
    },
    doMsync: function (addr, stream, len, flags, offset) {
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags)
    },
    doMkdir: function (path, mode) {
        path = PATH.normalize(path);
        if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
        FS.mkdir(path, mode, 0);
        return 0
    },
    doMknod: function (path, mode, dev) {
        switch (mode & 61440) {
            case 32768:
            case 8192:
            case 24576:
            case 4096:
            case 49152:
                break;
            default:
                return -28
        }
        FS.mknod(path, mode, dev);
        return 0
    },
    doReadlink: function (path, buf, bufsize) {
        if (bufsize <= 0) return -28;
        var ret = FS.readlink(path);
        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = HEAP8[buf + len];
        stringToUTF8(ret, buf, bufsize + 1);
        HEAP8[buf + len] = endChar;
        return len
    },
    doAccess: function (path, amode) {
        if (amode & ~7) {
            return -28
        }
        var node;
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        node = lookup.node;
        if (!node) {
            return -44
        }
        var perms = "";
        if (amode & 4) perms += "r";
        if (amode & 2) perms += "w";
        if (amode & 1) perms += "x";
        if (perms && FS.nodePermissions(node, perms)) {
            return -2
        }
        return 0
    },
    doDup: function (path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd
    },
    doReadv: function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.read(stream, HEAP8, ptr, len, offset);
            if (curr < 0) return -1;
            ret += curr;
            if (curr < len) break
        }
        return ret
    },
    doWritev: function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.write(stream, HEAP8, ptr, len, offset);
            if (curr < 0) return -1;
            ret += curr
        }
        return ret
    },
    varargs: undefined,
    get: function () {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
        return ret
    },
    getStr: function (ptr) {
        var ret = UTF8ToString(ptr);
        return ret
    },
    getStreamFromFD: function (fd) {
        var stream = FS.getStream(fd);
        if (!stream) throw new FS.ErrnoError(8);
        return stream
    },
    get64: function (low, high) {
        return low
    }
};

function ___sys_fcntl64(fd, cmd, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
            case 0: {
                var arg = SYSCALLS.get();
                if (arg < 0) {
                    return -28
                }
                var newStream;
                newStream = FS.open(stream.path, stream.flags, 0, arg);
                return newStream.fd
            }
            case 1:
            case 2:
                return 0;
            case 3:
                return stream.flags;
            case 4: {
                var arg = SYSCALLS.get();
                stream.flags |= arg;
                return 0
            }
            case 12: {
                var arg = SYSCALLS.get();
                var offset = 0;
                HEAP16[arg + offset >> 1] = 2;
                return 0
            }
            case 13:
            case 14:
                return 0;
            case 16:
            case 8:
                return -28;
            case 9:
                setErrNo(28);
                return -1;
            default: {
                return -28
            }
        }
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_fstat64(fd, buf) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        return SYSCALLS.doStat(FS.stat, stream.path, buf)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_ftruncate64(fd, zero, low, high) {
    try {
        var length = SYSCALLS.get64(low, high);
        FS.ftruncate(fd, length);
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_getcwd(buf, size) {
    try {
        if (size === 0) return -28;
        var cwd = FS.cwd();
        var cwdLengthInBytes = lengthBytesUTF8(cwd);
        if (size < cwdLengthInBytes + 1) return -68;
        stringToUTF8(cwd, buf, size);
        return buf
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_getdents64(fd, dirp, count) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        if (!stream.getdents) {
            stream.getdents = FS.readdir(stream.path)
        }
        var struct_size = 280;
        var pos = 0;
        var off = FS.llseek(stream, 0, 1);
        var idx = Math.floor(off / struct_size);
        while (idx < stream.getdents.length && pos + struct_size <= count) {
            var id;
            var type;
            var name = stream.getdents[idx];
            if (name[0] === ".") {
                id = 1;
                type = 4
            } else {
                var child = FS.lookupNode(stream.node, name);
                id = child.id;
                type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8
            }
            tempI64 = [id >>> 0, (tempDouble = id, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[dirp + pos >> 2] = tempI64[0], HEAP32[dirp + pos + 4 >> 2] = tempI64[1];
            tempI64 = [(idx + 1) * struct_size >>> 0, (tempDouble = (idx + 1) * struct_size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[dirp + pos + 8 >> 2] = tempI64[0], HEAP32[dirp + pos + 12 >> 2] = tempI64[1];
            HEAP16[dirp + pos + 16 >> 1] = 280;
            HEAP8[dirp + pos + 18 >> 0] = type;
            stringToUTF8(name, dirp + pos + 19, 256);
            pos += struct_size;
            idx += 1
        }
        FS.llseek(stream, idx * struct_size, 0);
        return pos
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_getpid() {
    return 42
}

function ___sys_ioctl(fd, op, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
            case 21509:
            case 21505: {
                if (!stream.tty) return -59;
                return 0
            }
            case 21510:
            case 21511:
            case 21512:
            case 21506:
            case 21507:
            case 21508: {
                if (!stream.tty) return -59;
                return 0
            }
            case 21519: {
                if (!stream.tty) return -59;
                var argp = SYSCALLS.get();
                HEAP32[argp >> 2] = 0;
                return 0
            }
            case 21520: {
                if (!stream.tty) return -59;
                return -28
            }
            case 21531: {
                var argp = SYSCALLS.get();
                return FS.ioctl(stream, op, argp)
            }
            case 21523: {
                if (!stream.tty) return -59;
                return 0
            }
            case 21524: {
                if (!stream.tty) return -59;
                return 0
            }
            default:
                abort("bad ioctl syscall " + op)
        }
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_mkdir(path, mode) {
    try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.doMkdir(path, mode)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_open(path, flags, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var pathname = SYSCALLS.getStr(path);
        var mode = varargs ? SYSCALLS.get() : 0;
        var stream = FS.open(pathname, flags, mode);
        return stream.fd
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_readlink(path, buf, bufsize) {
    try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.doReadlink(path, buf, bufsize)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_rename(old_path, new_path) {
    try {
        old_path = SYSCALLS.getStr(old_path);
        new_path = SYSCALLS.getStr(new_path);
        FS.rename(old_path, new_path);
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_rmdir(path) {
    try {
        path = SYSCALLS.getStr(path);
        FS.rmdir(path);
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_stat64(path, buf) {
    try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.doStat(FS.stat, path, buf)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function ___sys_unlink(path) {
    try {
        path = SYSCALLS.getStr(path);
        FS.unlink(path);
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function _abort() {
    abort()
}
var _emscripten_get_now_is_monotonic = true;

function _clock_gettime(clk_id, tp) {
    var now;
    if (clk_id === 0) {
        now = Date.now()
    } else if ((clk_id === 1 || clk_id === 4) && _emscripten_get_now_is_monotonic) {
        now = _emscripten_get_now()
    } else {
        setErrNo(28);
        return -1
    }
    HEAP32[tp >> 2] = now / 1e3 | 0;
    HEAP32[tp + 4 >> 2] = now % 1e3 * 1e3 * 1e3 | 0;
    return 0
}
var ERRNO_CODES = {
    EPERM: 63,
    ENOENT: 44,
    ESRCH: 71,
    EINTR: 27,
    EIO: 29,
    ENXIO: 60,
    E2BIG: 1,
    ENOEXEC: 45,
    EBADF: 8,
    ECHILD: 12,
    EAGAIN: 6,
    EWOULDBLOCK: 6,
    ENOMEM: 48,
    EACCES: 2,
    EFAULT: 21,
    ENOTBLK: 105,
    EBUSY: 10,
    EEXIST: 20,
    EXDEV: 75,
    ENODEV: 43,
    ENOTDIR: 54,
    EISDIR: 31,
    EINVAL: 28,
    ENFILE: 41,
    EMFILE: 33,
    ENOTTY: 59,
    ETXTBSY: 74,
    EFBIG: 22,
    ENOSPC: 51,
    ESPIPE: 70,
    EROFS: 69,
    EMLINK: 34,
    EPIPE: 64,
    EDOM: 18,
    ERANGE: 68,
    ENOMSG: 49,
    EIDRM: 24,
    ECHRNG: 106,
    EL2NSYNC: 156,
    EL3HLT: 107,
    EL3RST: 108,
    ELNRNG: 109,
    EUNATCH: 110,
    ENOCSI: 111,
    EL2HLT: 112,
    EDEADLK: 16,
    ENOLCK: 46,
    EBADE: 113,
    EBADR: 114,
    EXFULL: 115,
    ENOANO: 104,
    EBADRQC: 103,
    EBADSLT: 102,
    EDEADLOCK: 16,
    EBFONT: 101,
    ENOSTR: 100,
    ENODATA: 116,
    ETIME: 117,
    ENOSR: 118,
    ENONET: 119,
    ENOPKG: 120,
    EREMOTE: 121,
    ENOLINK: 47,
    EADV: 122,
    ESRMNT: 123,
    ECOMM: 124,
    EPROTO: 65,
    EMULTIHOP: 36,
    EDOTDOT: 125,
    EBADMSG: 9,
    ENOTUNIQ: 126,
    EBADFD: 127,
    EREMCHG: 128,
    ELIBACC: 129,
    ELIBBAD: 130,
    ELIBSCN: 131,
    ELIBMAX: 132,
    ELIBEXEC: 133,
    ENOSYS: 52,
    ENOTEMPTY: 55,
    ENAMETOOLONG: 37,
    ELOOP: 32,
    EOPNOTSUPP: 138,
    EPFNOSUPPORT: 139,
    ECONNRESET: 15,
    ENOBUFS: 42,
    EAFNOSUPPORT: 5,
    EPROTOTYPE: 67,
    ENOTSOCK: 57,
    ENOPROTOOPT: 50,
    ESHUTDOWN: 140,
    ECONNREFUSED: 14,
    EADDRINUSE: 3,
    ECONNABORTED: 13,
    ENETUNREACH: 40,
    ENETDOWN: 38,
    ETIMEDOUT: 73,
    EHOSTDOWN: 142,
    EHOSTUNREACH: 23,
    EINPROGRESS: 26,
    EALREADY: 7,
    EDESTADDRREQ: 17,
    EMSGSIZE: 35,
    EPROTONOSUPPORT: 66,
    ESOCKTNOSUPPORT: 137,
    EADDRNOTAVAIL: 4,
    ENETRESET: 39,
    EISCONN: 30,
    ENOTCONN: 53,
    ETOOMANYREFS: 141,
    EUSERS: 136,
    EDQUOT: 19,
    ESTALE: 72,
    ENOTSUP: 138,
    ENOMEDIUM: 148,
    EILSEQ: 25,
    EOVERFLOW: 61,
    ECANCELED: 11,
    ENOTRECOVERABLE: 56,
    EOWNERDEAD: 62,
    ESTRPIPE: 135
};

function _dummyErrnoCodes() {
    if (!ERRNO_CODES) {
        console.error("ERRNO_CODES not imported!")
    }
}
var EGL = {
    errorCode: 12288,
    defaultDisplayInitialized: false,
    currentContext: 0,
    currentReadSurface: 0,
    currentDrawSurface: 0,
    contextAttributes: {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false
    },
    stringCache: {},
    setErrorCode: function (code) {
        EGL.errorCode = code
    },
    chooseConfig: function (display, attribList, config, config_size, numConfigs) {
        if (display != 62e3) {
            EGL.setErrorCode(12296);
            return 0
        }
        if (attribList) {
            for (;;) {
                var param = HEAP32[attribList >> 2];
                if (param == 12321) {
                    var alphaSize = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.alpha = alphaSize > 0
                } else if (param == 12325) {
                    var depthSize = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.depth = depthSize > 0
                } else if (param == 12326) {
                    var stencilSize = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.stencil = stencilSize > 0
                } else if (param == 12337) {
                    var samples = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.antialias = samples > 0
                } else if (param == 12338) {
                    var samples = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.antialias = samples == 1
                } else if (param == 12544) {
                    var requestedPriority = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.lowLatency = requestedPriority != 12547
                } else if (param == 12344) {
                    break
                }
                attribList += 8
            }
        }
        if ((!config || !config_size) && !numConfigs) {
            EGL.setErrorCode(12300);
            return 0
        }
        if (numConfigs) {
            HEAP32[numConfigs >> 2] = 1
        }
        if (config && config_size > 0) {
            HEAP32[config >> 2] = 62002
        }
        EGL.setErrorCode(12288);
        return 1
    }
};

function _eglBindAPI(api) {
    if (api == 12448) {
        EGL.setErrorCode(12288);
        return 1
    } else {
        EGL.setErrorCode(12300);
        return 0
    }
}

function _eglChooseConfig(display, attrib_list, configs, config_size, numConfigs) {
    return EGL.chooseConfig(display, attrib_list, configs, config_size, numConfigs)
}

function _eglCreateContext(display, config, hmm, contextAttribs) {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    var glesContextVersion = 1;
    for (;;) {
        var param = HEAP32[contextAttribs >> 2];
        if (param == 12440) {
            glesContextVersion = HEAP32[contextAttribs + 4 >> 2]
        } else if (param == 12344) {
            break
        } else {
            EGL.setErrorCode(12292);
            return 0
        }
        contextAttribs += 8
    }
    if (glesContextVersion < 2 || glesContextVersion > 3) {
        EGL.setErrorCode(12293);
        return 0
    }
    EGL.contextAttributes.majorVersion = glesContextVersion - 1;
    EGL.contextAttributes.minorVersion = 0;
    EGL.context = GL.createContext(Module["canvas"], EGL.contextAttributes);
    if (EGL.context != 0) {
        EGL.setErrorCode(12288);
        GL.makeContextCurrent(EGL.context);
        Module.useWebGL = true;
        Browser.moduleContextCreatedCallbacks.forEach(function (callback) {
            callback()
        });
        GL.makeContextCurrent(null);
        return 62004
    } else {
        EGL.setErrorCode(12297);
        return 0
    }
}

function _eglCreateWindowSurface(display, config, win, attrib_list) {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (config != 62002) {
        EGL.setErrorCode(12293);
        return 0
    }
    EGL.setErrorCode(12288);
    return 62006
}

function _eglDestroyContext(display, context) {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (context != 62004) {
        EGL.setErrorCode(12294);
        return 0
    }
    GL.deleteContext(EGL.context);
    EGL.setErrorCode(12288);
    if (EGL.currentContext == context) {
        EGL.currentContext = 0
    }
    return 1
}

function _eglDestroySurface(display, surface) {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (surface != 62006) {
        EGL.setErrorCode(12301);
        return 1
    }
    if (EGL.currentReadSurface == surface) {
        EGL.currentReadSurface = 0
    }
    if (EGL.currentDrawSurface == surface) {
        EGL.currentDrawSurface = 0
    }
    EGL.setErrorCode(12288);
    return 1
}

function _eglGetConfigs(display, configs, config_size, numConfigs) {
    return EGL.chooseConfig(display, 0, configs, config_size, numConfigs)
}

function _eglGetCurrentContext() {
    return EGL.currentContext
}

function _eglGetDisplay(nativeDisplayType) {
    EGL.setErrorCode(12288);
    return 62e3
}

function _eglGetError() {
    return EGL.errorCode
}

function _eglInitialize(display, majorVersion, minorVersion) {
    if (display == 62e3) {
        if (majorVersion) {
            HEAP32[majorVersion >> 2] = 1
        }
        if (minorVersion) {
            HEAP32[minorVersion >> 2] = 4
        }
        EGL.defaultDisplayInitialized = true;
        EGL.setErrorCode(12288);
        return 1
    } else {
        EGL.setErrorCode(12296);
        return 0
    }
}

function _eglMakeCurrent(display, draw, read, context) {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (context != 0 && context != 62004) {
        EGL.setErrorCode(12294);
        return 0
    }
    if (read != 0 && read != 62006 || draw != 0 && draw != 62006) {
        EGL.setErrorCode(12301);
        return 0
    }
    GL.makeContextCurrent(context ? EGL.context : null);
    EGL.currentContext = context;
    EGL.currentDrawSurface = draw;
    EGL.currentReadSurface = read;
    EGL.setErrorCode(12288);
    return 1
}

function _eglQuerySurface(display, surface, attribute, value) {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (surface != 62006) {
        EGL.setErrorCode(12301);
        return 0
    }
    if (!value) {
        EGL.setErrorCode(12300);
        return 0
    }
    EGL.setErrorCode(12288);
    switch (attribute) {
        case 12328:
            HEAP32[value >> 2] = 62002;
            return 1;
        case 12376:
            return 1;
        case 12375:
            HEAP32[value >> 2] = Module["canvas"].width;
            return 1;
        case 12374:
            HEAP32[value >> 2] = Module["canvas"].height;
            return 1;
        case 12432:
            HEAP32[value >> 2] = -1;
            return 1;
        case 12433:
            HEAP32[value >> 2] = -1;
            return 1;
        case 12434:
            HEAP32[value >> 2] = -1;
            return 1;
        case 12422:
            HEAP32[value >> 2] = 12420;
            return 1;
        case 12441:
            HEAP32[value >> 2] = 12442;
            return 1;
        case 12435:
            HEAP32[value >> 2] = 12437;
            return 1;
        case 12416:
        case 12417:
        case 12418:
        case 12419:
            return 1;
        default:
            EGL.setErrorCode(12292);
            return 0
    }
}

function _eglSwapBuffers() {
    if (!EGL.defaultDisplayInitialized) {
        EGL.setErrorCode(12289)
    } else if (!Module.ctx) {
        EGL.setErrorCode(12290)
    } else if (Module.ctx.isContextLost()) {
        EGL.setErrorCode(12302)
    } else {
        EGL.setErrorCode(12288);
        return 1
    }
    return 0
}

function _eglTerminate(display) {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    EGL.currentContext = 0;
    EGL.currentReadSurface = 0;
    EGL.currentDrawSurface = 0;
    EGL.defaultDisplayInitialized = false;
    EGL.setErrorCode(12288);
    return 1
}
var JSEvents = {
    inEventHandler: 0,
    removeAllEventListeners: function () {
        for (var i = JSEvents.eventHandlers.length - 1; i >= 0; --i) {
            JSEvents._removeHandler(i)
        }
        JSEvents.eventHandlers = [];
        JSEvents.deferredCalls = []
    },
    registerRemoveEventListeners: function () {
        if (!JSEvents.removeEventListenersRegistered) {
            __ATEXIT__.push(JSEvents.removeAllEventListeners);
            JSEvents.removeEventListenersRegistered = true
        }
    },
    deferredCalls: [],
    deferCall: function (targetFunction, precedence, argsList) {
        function arraysHaveEqualContent(arrA, arrB) {
            if (arrA.length != arrB.length) return false;
            for (var i in arrA) {
                if (arrA[i] != arrB[i]) return false
            }
            return true
        }
        for (var i in JSEvents.deferredCalls) {
            var call = JSEvents.deferredCalls[i];
            if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
                return
            }
        }
        JSEvents.deferredCalls.push({
            targetFunction: targetFunction,
            precedence: precedence,
            argsList: argsList
        });
        JSEvents.deferredCalls.sort(function (x, y) {
            return x.precedence < y.precedence
        })
    },
    removeDeferredCalls: function (targetFunction) {
        for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
            if (JSEvents.deferredCalls[i].targetFunction == targetFunction) {
                JSEvents.deferredCalls.splice(i, 1);
                --i
            }
        }
    },
    canPerformEventHandlerRequests: function () {
        return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls
    },
    runDeferredCalls: function () {
        if (!JSEvents.canPerformEventHandlerRequests()) {
            return
        }
        for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
            var call = JSEvents.deferredCalls[i];
            JSEvents.deferredCalls.splice(i, 1);
            --i;
            call.targetFunction.apply(null, call.argsList)
        }
    },
    eventHandlers: [],
    removeAllHandlersOnTarget: function (target, eventTypeString) {
        for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
            if (JSEvents.eventHandlers[i].target == target && (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
                JSEvents._removeHandler(i--)
            }
        }
    },
    _removeHandler: function (i) {
        var h = JSEvents.eventHandlers[i];
        h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
        JSEvents.eventHandlers.splice(i, 1)
    },
    registerOrRemoveHandler: function (eventHandler) {
        var jsEventHandler = function jsEventHandler(event) {
            ++JSEvents.inEventHandler;
            JSEvents.currentEventHandler = eventHandler;
            JSEvents.runDeferredCalls();
            eventHandler.handlerFunc(event);
            JSEvents.runDeferredCalls();
            --JSEvents.inEventHandler
        };
        if (eventHandler.callbackfunc) {
            eventHandler.eventListenerFunc = jsEventHandler;
            eventHandler.target.addEventListener(eventHandler.eventTypeString, jsEventHandler, eventHandler.useCapture);
            JSEvents.eventHandlers.push(eventHandler);
            JSEvents.registerRemoveEventListeners()
        } else {
            for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
                if (JSEvents.eventHandlers[i].target == eventHandler.target && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
                    JSEvents._removeHandler(i--)
                }
            }
        }
    },
    getNodeNameForTarget: function (target) {
        if (!target) return "";
        if (target == window) return "#window";
        if (target == screen) return "#screen";
        return target && target.nodeName ? target.nodeName : ""
    },
    fullscreenEnabled: function () {
        return document.fullscreenEnabled || document.webkitFullscreenEnabled
    }
};

function requestPointerLock(target) {
    if (target.requestPointerLock) {
        target.requestPointerLock()
    } else if (target.msRequestPointerLock) {
        target.msRequestPointerLock()
    } else {
        if (document.body.requestPointerLock || document.body.msRequestPointerLock) {
            return -3
        } else {
            return -1
        }
    }
    return 0
}

function _emscripten_exit_pointerlock() {
    JSEvents.removeDeferredCalls(requestPointerLock);
    if (document.exitPointerLock) {
        document.exitPointerLock()
    } else if (document.msExitPointerLock) {
        document.msExitPointerLock()
    } else {
        return -1
    }
    return 0
}

function _emscripten_force_exit(status) {
    noExitRuntime = false;
    exit(status)
}

function maybeCStringToJsString(cString) {
    return cString > 2 ? UTF8ToString(cString) : cString
}
var specialHTMLTargets = [0, typeof document !== "undefined" ? document : 0, typeof window !== "undefined" ? window : 0];

function findEventTarget(target) {
    target = maybeCStringToJsString(target);
    var domElement = specialHTMLTargets[target] || (typeof document !== "undefined" ? document.querySelector(target) : undefined);
    return domElement
}

function findCanvasEventTarget(target) {
    return findEventTarget(target)
}

function _emscripten_get_canvas_element_size(target, width, height) {
    var canvas = findCanvasEventTarget(target);
    if (!canvas) return -4;
    HEAP32[width >> 2] = canvas.width;
    HEAP32[height >> 2] = canvas.height
}

function _emscripten_get_device_pixel_ratio() {
    return typeof devicePixelRatio === "number" && devicePixelRatio || 1
}

function fillFullscreenChangeEventData(eventStruct) {
    var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    var isFullscreen = !!fullscreenElement;
    HEAP32[eventStruct >> 2] = isFullscreen;
    HEAP32[eventStruct + 4 >> 2] = JSEvents.fullscreenEnabled();
    var reportedElement = isFullscreen ? fullscreenElement : JSEvents.previousFullscreenElement;
    var nodeName = JSEvents.getNodeNameForTarget(reportedElement);
    var id = reportedElement && reportedElement.id ? reportedElement.id : "";
    stringToUTF8(nodeName, eventStruct + 8, 128);
    stringToUTF8(id, eventStruct + 136, 128);
    HEAP32[eventStruct + 264 >> 2] = reportedElement ? reportedElement.clientWidth : 0;
    HEAP32[eventStruct + 268 >> 2] = reportedElement ? reportedElement.clientHeight : 0;
    HEAP32[eventStruct + 272 >> 2] = screen.width;
    HEAP32[eventStruct + 276 >> 2] = screen.height;
    if (isFullscreen) {
        JSEvents.previousFullscreenElement = fullscreenElement
    }
}

function _emscripten_get_fullscreen_status(fullscreenStatus) {
    if (!JSEvents.fullscreenEnabled()) return -1;
    fillFullscreenChangeEventData(fullscreenStatus);
    return 0
}

function fillGamepadEventData(eventStruct, e) {
    HEAPF64[eventStruct >> 3] = e.timestamp;
    for (var i = 0; i < e.axes.length; ++i) {
        HEAPF64[eventStruct + i * 8 + 16 >> 3] = e.axes[i]
    }
    for (var i = 0; i < e.buttons.length; ++i) {
        if (typeof e.buttons[i] === "object") {
            HEAPF64[eventStruct + i * 8 + 528 >> 3] = e.buttons[i].value
        } else {
            HEAPF64[eventStruct + i * 8 + 528 >> 3] = e.buttons[i]
        }
    }
    for (var i = 0; i < e.buttons.length; ++i) {
        if (typeof e.buttons[i] === "object") {
            HEAP32[eventStruct + i * 4 + 1040 >> 2] = e.buttons[i].pressed
        } else {
            HEAP32[eventStruct + i * 4 + 1040 >> 2] = e.buttons[i] == 1
        }
    }
    HEAP32[eventStruct + 1296 >> 2] = e.connected;
    HEAP32[eventStruct + 1300 >> 2] = e.index;
    HEAP32[eventStruct + 8 >> 2] = e.axes.length;
    HEAP32[eventStruct + 12 >> 2] = e.buttons.length;
    stringToUTF8(e.id, eventStruct + 1304, 64);
    stringToUTF8(e.mapping, eventStruct + 1368, 64)
}

function _emscripten_get_gamepad_status(index, gamepadState) {
    if (index < 0 || index >= JSEvents.lastGamepadState.length) return -5;
    if (!JSEvents.lastGamepadState[index]) return -7;
    fillGamepadEventData(gamepadState, JSEvents.lastGamepadState[index]);
    return 0
}

function _emscripten_glActiveTexture(x0) {
    GLctx["activeTexture"](x0)
}

function _emscripten_glAttachShader(program, shader) {
    GLctx.attachShader(GL.programs[program], GL.shaders[shader])
}

function _emscripten_glBeginQuery(target, id) {
    GLctx["beginQuery"](target, GL.queries[id])
}

function _emscripten_glBeginQueryEXT(target, id) {
    GLctx.disjointTimerQueryExt["beginQueryEXT"](target, GL.timerQueriesEXT[id])
}

function _emscripten_glBeginTransformFeedback(x0) {
    GLctx["beginTransformFeedback"](x0)
}

function _emscripten_glBindAttribLocation(program, index, name) {
    GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name))
}

function _emscripten_glBindBuffer(target, buffer) {
    if (target == 34962) {
        GLctx.currentArrayBufferBinding = buffer
    } else if (target == 34963) {
        GLctx.currentElementArrayBufferBinding = buffer
    }
    if (target == 35051) {
        GLctx.currentPixelPackBufferBinding = buffer
    } else if (target == 35052) {
        GLctx.currentPixelUnpackBufferBinding = buffer
    }
    GLctx.bindBuffer(target, GL.buffers[buffer])
}

function _emscripten_glBindBufferBase(target, index, buffer) {
    GLctx["bindBufferBase"](target, index, GL.buffers[buffer])
}

function _emscripten_glBindBufferRange(target, index, buffer, offset, ptrsize) {
    GLctx["bindBufferRange"](target, index, GL.buffers[buffer], offset, ptrsize)
}

function _emscripten_glBindFramebuffer(target, framebuffer) {
    GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer])
}

function _emscripten_glBindRenderbuffer(target, renderbuffer) {
    GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer])
}

function _emscripten_glBindSampler(unit, sampler) {
    GLctx["bindSampler"](unit, GL.samplers[sampler])
}

function _emscripten_glBindTexture(target, texture) {
    GLctx.bindTexture(target, GL.textures[texture])
}

function _emscripten_glBindTransformFeedback(target, id) {
    GLctx["bindTransformFeedback"](target, GL.transformFeedbacks[id])
}

function _emscripten_glBindVertexArray(vao) {
    GLctx["bindVertexArray"](GL.vaos[vao]);
    var ibo = GLctx.getParameter(34965);
    GLctx.currentElementArrayBufferBinding = ibo ? ibo.name | 0 : 0
}

function _emscripten_glBindVertexArrayOES(vao) {
    GLctx["bindVertexArray"](GL.vaos[vao]);
    var ibo = GLctx.getParameter(34965);
    GLctx.currentElementArrayBufferBinding = ibo ? ibo.name | 0 : 0
}

function _emscripten_glBlendColor(x0, x1, x2, x3) {
    GLctx["blendColor"](x0, x1, x2, x3)
}

function _emscripten_glBlendEquation(x0) {
    GLctx["blendEquation"](x0)
}

function _emscripten_glBlendEquationSeparate(x0, x1) {
    GLctx["blendEquationSeparate"](x0, x1)
}

function _emscripten_glBlendFunc(x0, x1) {
    GLctx["blendFunc"](x0, x1)
}

function _emscripten_glBlendFuncSeparate(x0, x1, x2, x3) {
    GLctx["blendFuncSeparate"](x0, x1, x2, x3)
}

function _emscripten_glBlitFramebuffer(x0, x1, x2, x3, x4, x5, x6, x7, x8, x9) {
    GLctx["blitFramebuffer"](x0, x1, x2, x3, x4, x5, x6, x7, x8, x9)
}

function _emscripten_glBufferData(target, size, data, usage) {
    if (true) {
        if (data) {
            GLctx.bufferData(target, HEAPU8, usage, data, size)
        } else {
            GLctx.bufferData(target, size, usage)
        }
    } else {
        GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage)
    }
}

function _emscripten_glBufferSubData(target, offset, size, data) {
    if (true) {
        GLctx.bufferSubData(target, offset, HEAPU8, data, size);
        return
    }
    GLctx.bufferSubData(target, offset, HEAPU8.subarray(data, data + size))
}

function _emscripten_glCheckFramebufferStatus(x0) {
    return GLctx["checkFramebufferStatus"](x0)
}

function _emscripten_glClear(x0) {
    GLctx["clear"](x0)
}

function _emscripten_glClearBufferfi(x0, x1, x2, x3) {
    GLctx["clearBufferfi"](x0, x1, x2, x3)
}

function _emscripten_glClearBufferfv(buffer, drawbuffer, value) {
    GLctx["clearBufferfv"](buffer, drawbuffer, HEAPF32, value >> 2)
}

function _emscripten_glClearBufferiv(buffer, drawbuffer, value) {
    GLctx["clearBufferiv"](buffer, drawbuffer, HEAP32, value >> 2)
}

function _emscripten_glClearBufferuiv(buffer, drawbuffer, value) {
    GLctx["clearBufferuiv"](buffer, drawbuffer, HEAPU32, value >> 2)
}

function _emscripten_glClearColor(x0, x1, x2, x3) {
    GLctx["clearColor"](x0, x1, x2, x3)
}

function _emscripten_glClearDepthf(x0) {
    GLctx["clearDepth"](x0)
}

function _emscripten_glClearStencil(x0) {
    GLctx["clearStencil"](x0)
}

function convertI32PairToI53(lo, hi) {
    return (lo >>> 0) + hi * 4294967296
}

function _emscripten_glClientWaitSync(sync, flags, timeoutLo, timeoutHi) {
    return GLctx.clientWaitSync(GL.syncs[sync], flags, convertI32PairToI53(timeoutLo, timeoutHi))
}

function _emscripten_glColorMask(red, green, blue, alpha) {
    GLctx.colorMask(!!red, !!green, !!blue, !!alpha)
}

function _emscripten_glCompileShader(shader) {
    GLctx.compileShader(GL.shaders[shader])
}

function _emscripten_glCompressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data) {
    if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx["compressedTexImage2D"](target, level, internalFormat, width, height, border, imageSize, data)
        } else {
            GLctx["compressedTexImage2D"](target, level, internalFormat, width, height, border, HEAPU8, data, imageSize)
        }
        return
    }
    GLctx["compressedTexImage2D"](target, level, internalFormat, width, height, border, data ? HEAPU8.subarray(data, data + imageSize) : null)
}

function _emscripten_glCompressedTexImage3D(target, level, internalFormat, width, height, depth, border, imageSize, data) {
    if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx["compressedTexImage3D"](target, level, internalFormat, width, height, depth, border, imageSize, data)
    } else {
        GLctx["compressedTexImage3D"](target, level, internalFormat, width, height, depth, border, HEAPU8, data, imageSize)
    }
}

function _emscripten_glCompressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data) {
    if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx["compressedTexSubImage2D"](target, level, xoffset, yoffset, width, height, format, imageSize, data)
        } else {
            GLctx["compressedTexSubImage2D"](target, level, xoffset, yoffset, width, height, format, HEAPU8, data, imageSize)
        }
        return
    }
    GLctx["compressedTexSubImage2D"](target, level, xoffset, yoffset, width, height, format, data ? HEAPU8.subarray(data, data + imageSize) : null)
}

function _emscripten_glCompressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data) {
    if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx["compressedTexSubImage3D"](target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data)
    } else {
        GLctx["compressedTexSubImage3D"](target, level, xoffset, yoffset, zoffset, width, height, depth, format, HEAPU8, data, imageSize)
    }
}

function _emscripten_glCopyBufferSubData(x0, x1, x2, x3, x4) {
    GLctx["copyBufferSubData"](x0, x1, x2, x3, x4)
}

function _emscripten_glCopyTexImage2D(x0, x1, x2, x3, x4, x5, x6, x7) {
    GLctx["copyTexImage2D"](x0, x1, x2, x3, x4, x5, x6, x7)
}

function _emscripten_glCopyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7) {
    GLctx["copyTexSubImage2D"](x0, x1, x2, x3, x4, x5, x6, x7)
}

function _emscripten_glCopyTexSubImage3D(x0, x1, x2, x3, x4, x5, x6, x7, x8) {
    GLctx["copyTexSubImage3D"](x0, x1, x2, x3, x4, x5, x6, x7, x8)
}

function _emscripten_glCreateProgram() {
    var id = GL.getNewId(GL.programs);
    var program = GLctx.createProgram();
    program.name = id;
    GL.programs[id] = program;
    return id
}

function _emscripten_glCreateShader(shaderType) {
    var id = GL.getNewId(GL.shaders);
    GL.shaders[id] = GLctx.createShader(shaderType);
    return id
}

function _emscripten_glCullFace(x0) {
    GLctx["cullFace"](x0)
}

function _emscripten_glDeleteBuffers(n, buffers) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[buffers + i * 4 >> 2];
        var buffer = GL.buffers[id];
        if (!buffer) continue;
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
        if (id == GLctx.currentArrayBufferBinding) GLctx.currentArrayBufferBinding = 0;
        if (id == GLctx.currentElementArrayBufferBinding) GLctx.currentElementArrayBufferBinding = 0;
        if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
        if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0
    }
}

function _emscripten_glDeleteFramebuffers(n, framebuffers) {
    for (var i = 0; i < n; ++i) {
        var id = HEAP32[framebuffers + i * 4 >> 2];
        var framebuffer = GL.framebuffers[id];
        if (!framebuffer) continue;
        GLctx.deleteFramebuffer(framebuffer);
        framebuffer.name = 0;
        GL.framebuffers[id] = null
    }
}

function _emscripten_glDeleteProgram(id) {
    if (!id) return;
    var program = GL.programs[id];
    if (!program) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteProgram(program);
    program.name = 0;
    GL.programs[id] = null;
    GL.programInfos[id] = null
}

function _emscripten_glDeleteQueries(n, ids) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[ids + i * 4 >> 2];
        var query = GL.queries[id];
        if (!query) continue;
        GLctx["deleteQuery"](query);
        GL.queries[id] = null
    }
}

function _emscripten_glDeleteQueriesEXT(n, ids) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[ids + i * 4 >> 2];
        var query = GL.timerQueriesEXT[id];
        if (!query) continue;
        GLctx.disjointTimerQueryExt["deleteQueryEXT"](query);
        GL.timerQueriesEXT[id] = null
    }
}

function _emscripten_glDeleteRenderbuffers(n, renderbuffers) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[renderbuffers + i * 4 >> 2];
        var renderbuffer = GL.renderbuffers[id];
        if (!renderbuffer) continue;
        GLctx.deleteRenderbuffer(renderbuffer);
        renderbuffer.name = 0;
        GL.renderbuffers[id] = null
    }
}

function _emscripten_glDeleteSamplers(n, samplers) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[samplers + i * 4 >> 2];
        var sampler = GL.samplers[id];
        if (!sampler) continue;
        GLctx["deleteSampler"](sampler);
        sampler.name = 0;
        GL.samplers[id] = null
    }
}

function _emscripten_glDeleteShader(id) {
    if (!id) return;
    var shader = GL.shaders[id];
    if (!shader) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteShader(shader);
    GL.shaders[id] = null
}

function _emscripten_glDeleteSync(id) {
    if (!id) return;
    var sync = GL.syncs[id];
    if (!sync) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteSync(sync);
    sync.name = 0;
    GL.syncs[id] = null
}

function _emscripten_glDeleteTextures(n, textures) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[textures + i * 4 >> 2];
        var texture = GL.textures[id];
        if (!texture) continue;
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null
    }
}

function _emscripten_glDeleteTransformFeedbacks(n, ids) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[ids + i * 4 >> 2];
        var transformFeedback = GL.transformFeedbacks[id];
        if (!transformFeedback) continue;
        GLctx["deleteTransformFeedback"](transformFeedback);
        transformFeedback.name = 0;
        GL.transformFeedbacks[id] = null
    }
}

function _emscripten_glDeleteVertexArrays(n, vaos) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[vaos + i * 4 >> 2];
        GLctx["deleteVertexArray"](GL.vaos[id]);
        GL.vaos[id] = null
    }
}

function _emscripten_glDeleteVertexArraysOES(n, vaos) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[vaos + i * 4 >> 2];
        GLctx["deleteVertexArray"](GL.vaos[id]);
        GL.vaos[id] = null
    }
}

function _emscripten_glDepthFunc(x0) {
    GLctx["depthFunc"](x0)
}

function _emscripten_glDepthMask(flag) {
    GLctx.depthMask(!!flag)
}

function _emscripten_glDepthRangef(x0, x1) {
    GLctx["depthRange"](x0, x1)
}

function _emscripten_glDetachShader(program, shader) {
    GLctx.detachShader(GL.programs[program], GL.shaders[shader])
}

function _emscripten_glDisable(x0) {
    GLctx["disable"](x0)
}

function _emscripten_glDisableVertexAttribArray(index) {
    var cb = GL.currentContext.clientBuffers[index];
    cb.enabled = false;
    GLctx.disableVertexAttribArray(index)
}

function _emscripten_glDrawArrays(mode, first, count) {
    GL.preDrawHandleClientVertexAttribBindings(first + count);
    GLctx.drawArrays(mode, first, count);
    GL.postDrawHandleClientVertexAttribBindings()
}

function _emscripten_glDrawArraysInstanced(mode, first, count, primcount) {
    GLctx["drawArraysInstanced"](mode, first, count, primcount)
}

function _emscripten_glDrawArraysInstancedANGLE(mode, first, count, primcount) {
    GLctx["drawArraysInstanced"](mode, first, count, primcount)
}

function _emscripten_glDrawArraysInstancedARB(mode, first, count, primcount) {
    GLctx["drawArraysInstanced"](mode, first, count, primcount)
}

function _emscripten_glDrawArraysInstancedEXT(mode, first, count, primcount) {
    GLctx["drawArraysInstanced"](mode, first, count, primcount)
}

function _emscripten_glDrawArraysInstancedNV(mode, first, count, primcount) {
    GLctx["drawArraysInstanced"](mode, first, count, primcount)
}
var tempFixedLengthArray = [];

function _emscripten_glDrawBuffers(n, bufs) {
    var bufArray = tempFixedLengthArray[n];
    for (var i = 0; i < n; i++) {
        bufArray[i] = HEAP32[bufs + i * 4 >> 2]
    }
    GLctx["drawBuffers"](bufArray)
}

function _emscripten_glDrawBuffersEXT(n, bufs) {
    var bufArray = tempFixedLengthArray[n];
    for (var i = 0; i < n; i++) {
        bufArray[i] = HEAP32[bufs + i * 4 >> 2]
    }
    GLctx["drawBuffers"](bufArray)
}

function _emscripten_glDrawBuffersWEBGL(n, bufs) {
    var bufArray = tempFixedLengthArray[n];
    for (var i = 0; i < n; i++) {
        bufArray[i] = HEAP32[bufs + i * 4 >> 2]
    }
    GLctx["drawBuffers"](bufArray)
}

function _emscripten_glDrawElements(mode, count, type, indices) {
    var buf;
    var vertices = 0;
    if (!GLctx.currentElementArrayBufferBinding) {
        var size = GL.calcBufLength(1, type, 0, count);
        buf = GL.getTempIndexBuffer(size);
        GLctx.bindBuffer(34963, buf);
        GLctx.bufferSubData(34963, 0, HEAPU8.subarray(indices, indices + size));
        var array_classes = {
            5121: Uint8Array,
            5123: Uint16Array,
            5125: Uint32Array
        };
        for (var i = 0; i < GL.currentContext.maxVertexAttribs; i++) {
            var cb = GL.currentContext.clientBuffers[i];
            if (cb.clientside && cb.enabled && array_classes[type]) {
                vertices = Math.max.apply(null, new array_classes[type](HEAPU8.buffer, indices, count)) + 1;
                break
            }
        }
        indices = 0
    }
    GL.preDrawHandleClientVertexAttribBindings(vertices);
    GLctx.drawElements(mode, count, type, indices);
    GL.postDrawHandleClientVertexAttribBindings(count);
    if (!GLctx.currentElementArrayBufferBinding) {
        GLctx.bindBuffer(34963, null)
    }
}

function _emscripten_glDrawElementsInstanced(mode, count, type, indices, primcount) {
    GLctx["drawElementsInstanced"](mode, count, type, indices, primcount)
}

function _emscripten_glDrawElementsInstancedANGLE(mode, count, type, indices, primcount) {
    GLctx["drawElementsInstanced"](mode, count, type, indices, primcount)
}

function _emscripten_glDrawElementsInstancedARB(mode, count, type, indices, primcount) {
    GLctx["drawElementsInstanced"](mode, count, type, indices, primcount)
}

function _emscripten_glDrawElementsInstancedEXT(mode, count, type, indices, primcount) {
    GLctx["drawElementsInstanced"](mode, count, type, indices, primcount)
}

function _emscripten_glDrawElementsInstancedNV(mode, count, type, indices, primcount) {
    GLctx["drawElementsInstanced"](mode, count, type, indices, primcount)
}

function _glDrawElements(mode, count, type, indices) {
    var buf;
    var vertices = 0;
    if (!GLctx.currentElementArrayBufferBinding) {
        var size = GL.calcBufLength(1, type, 0, count);
        buf = GL.getTempIndexBuffer(size);
        GLctx.bindBuffer(34963, buf);
        GLctx.bufferSubData(34963, 0, HEAPU8.subarray(indices, indices + size));
        var array_classes = {
            5121: Uint8Array,
            5123: Uint16Array,
            5125: Uint32Array
        };
        for (var i = 0; i < GL.currentContext.maxVertexAttribs; i++) {
            var cb = GL.currentContext.clientBuffers[i];
            if (cb.clientside && cb.enabled && array_classes[type]) {
                vertices = Math.max.apply(null, new array_classes[type](HEAPU8.buffer, indices, count)) + 1;
                break
            }
        }
        indices = 0
    }
    GL.preDrawHandleClientVertexAttribBindings(vertices);
    GLctx.drawElements(mode, count, type, indices);
    GL.postDrawHandleClientVertexAttribBindings(count);
    if (!GLctx.currentElementArrayBufferBinding) {
        GLctx.bindBuffer(34963, null)
    }
}

function _emscripten_glDrawRangeElements(mode, start, end, count, type, indices) {
    _glDrawElements(mode, count, type, indices)
}

function _emscripten_glEnable(x0) {
    GLctx["enable"](x0)
}

function _emscripten_glEnableVertexAttribArray(index) {
    var cb = GL.currentContext.clientBuffers[index];
    cb.enabled = true;
    GLctx.enableVertexAttribArray(index)
}

function _emscripten_glEndQuery(x0) {
    GLctx["endQuery"](x0)
}

function _emscripten_glEndQueryEXT(target) {
    GLctx.disjointTimerQueryExt["endQueryEXT"](target)
}

function _emscripten_glEndTransformFeedback() {
    GLctx["endTransformFeedback"]()
}

function _emscripten_glFenceSync(condition, flags) {
    var sync = GLctx.fenceSync(condition, flags);
    if (sync) {
        var id = GL.getNewId(GL.syncs);
        sync.name = id;
        GL.syncs[id] = sync;
        return id
    } else {
        return 0
    }
}

function _emscripten_glFinish() {
    GLctx["finish"]()
}

function _emscripten_glFlush() {
    GLctx["flush"]()
}

function emscriptenWebGLGetBufferBinding(target) {
    switch (target) {
        case 34962:
            target = 34964;
            break;
        case 34963:
            target = 34965;
            break;
        case 35051:
            target = 35053;
            break;
        case 35052:
            target = 35055;
            break;
        case 35982:
            target = 35983;
            break;
        case 36662:
            target = 36662;
            break;
        case 36663:
            target = 36663;
            break;
        case 35345:
            target = 35368;
            break
    }
    var buffer = GLctx.getParameter(target);
    if (buffer) return buffer.name | 0;
    else return 0
}

function emscriptenWebGLValidateMapBufferTarget(target) {
    switch (target) {
        case 34962:
        case 34963:
        case 36662:
        case 36663:
        case 35051:
        case 35052:
        case 35882:
        case 35982:
        case 35345:
            return true;
        default:
            return false
    }
}

function _emscripten_glFlushMappedBufferRange(target, offset, length) {
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glFlushMappedBufferRange");
        return
    }
    var mapping = GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)];
    if (!mapping) {
        GL.recordError(1282);
        err("buffer was never mapped in glFlushMappedBufferRange");
        return
    }
    if (!(mapping.access & 16)) {
        GL.recordError(1282);
        err("buffer was not mapped with GL_MAP_FLUSH_EXPLICIT_BIT in glFlushMappedBufferRange");
        return
    }
    if (offset < 0 || length < 0 || offset + length > mapping.length) {
        GL.recordError(1281);
        err("invalid range in glFlushMappedBufferRange");
        return
    }
    GLctx.bufferSubData(target, mapping.offset, HEAPU8.subarray(mapping.mem + offset, mapping.mem + offset + length))
}

function _emscripten_glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
    GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer])
}

function _emscripten_glFramebufferTexture2D(target, attachment, textarget, texture, level) {
    GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level)
}

function _emscripten_glFramebufferTextureLayer(target, attachment, texture, level, layer) {
    GLctx.framebufferTextureLayer(target, attachment, GL.textures[texture], level, layer)
}

function _emscripten_glFrontFace(x0) {
    GLctx["frontFace"](x0)
}

function _emscripten_glGenBuffers(n, buffers) {
    __glGenObject(n, buffers, "createBuffer", GL.buffers)
}

function _emscripten_glGenFramebuffers(n, ids) {
    __glGenObject(n, ids, "createFramebuffer", GL.framebuffers)
}

function _emscripten_glGenQueries(n, ids) {
    __glGenObject(n, ids, "createQuery", GL.queries)
}

function _emscripten_glGenQueriesEXT(n, ids) {
    for (var i = 0; i < n; i++) {
        var query = GLctx.disjointTimerQueryExt["createQueryEXT"]();
        if (!query) {
            GL.recordError(1282);
            while (i < n) HEAP32[ids + i++ * 4 >> 2] = 0;
            return
        }
        var id = GL.getNewId(GL.timerQueriesEXT);
        query.name = id;
        GL.timerQueriesEXT[id] = query;
        HEAP32[ids + i * 4 >> 2] = id
    }
}

function _emscripten_glGenRenderbuffers(n, renderbuffers) {
    __glGenObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers)
}

function _emscripten_glGenSamplers(n, samplers) {
    __glGenObject(n, samplers, "createSampler", GL.samplers)
}

function _emscripten_glGenTextures(n, textures) {
    __glGenObject(n, textures, "createTexture", GL.textures)
}

function _emscripten_glGenTransformFeedbacks(n, ids) {
    __glGenObject(n, ids, "createTransformFeedback", GL.transformFeedbacks)
}

function _emscripten_glGenVertexArrays(n, arrays) {
    __glGenObject(n, arrays, "createVertexArray", GL.vaos)
}

function _emscripten_glGenVertexArraysOES(n, arrays) {
    __glGenObject(n, arrays, "createVertexArray", GL.vaos)
}

function _emscripten_glGenerateMipmap(x0) {
    GLctx["generateMipmap"](x0)
}

function __glGetActiveAttribOrUniform(funcName, program, index, bufSize, length, size, type, name) {
    program = GL.programs[program];
    var info = GLctx[funcName](program, index);
    if (info) {
        var numBytesWrittenExclNull = name && stringToUTF8(info.name, name, bufSize);
        if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        if (size) HEAP32[size >> 2] = info.size;
        if (type) HEAP32[type >> 2] = info.type
    }
}

function _emscripten_glGetActiveAttrib(program, index, bufSize, length, size, type, name) {
    __glGetActiveAttribOrUniform("getActiveAttrib", program, index, bufSize, length, size, type, name)
}

function _emscripten_glGetActiveUniform(program, index, bufSize, length, size, type, name) {
    __glGetActiveAttribOrUniform("getActiveUniform", program, index, bufSize, length, size, type, name)
}

function _emscripten_glGetActiveUniformBlockName(program, uniformBlockIndex, bufSize, length, uniformBlockName) {
    program = GL.programs[program];
    var result = GLctx["getActiveUniformBlockName"](program, uniformBlockIndex);
    if (!result) return;
    if (uniformBlockName && bufSize > 0) {
        var numBytesWrittenExclNull = stringToUTF8(result, uniformBlockName, bufSize);
        if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
    } else {
        if (length) HEAP32[length >> 2] = 0
    }
}

function _emscripten_glGetActiveUniformBlockiv(program, uniformBlockIndex, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    switch (pname) {
        case 35393:
            var name = GLctx["getActiveUniformBlockName"](program, uniformBlockIndex);
            HEAP32[params >> 2] = name.length + 1;
            return;
        default:
            var result = GLctx["getActiveUniformBlockParameter"](program, uniformBlockIndex, pname);
            if (!result) return;
            if (typeof result == "number") {
                HEAP32[params >> 2] = result
            } else {
                for (var i = 0; i < result.length; i++) {
                    HEAP32[params + i * 4 >> 2] = result[i]
                }
            }
    }
}

function _emscripten_glGetActiveUniformsiv(program, uniformCount, uniformIndices, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    if (uniformCount > 0 && uniformIndices == 0) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    var ids = [];
    for (var i = 0; i < uniformCount; i++) {
        ids.push(HEAP32[uniformIndices + i * 4 >> 2])
    }
    var result = GLctx["getActiveUniforms"](program, ids, pname);
    if (!result) return;
    var len = result.length;
    for (var i = 0; i < len; i++) {
        HEAP32[params + i * 4 >> 2] = result[i]
    }
}

function _emscripten_glGetAttachedShaders(program, maxCount, count, shaders) {
    var result = GLctx.getAttachedShaders(GL.programs[program]);
    var len = result.length;
    if (len > maxCount) {
        len = maxCount
    }
    HEAP32[count >> 2] = len;
    for (var i = 0; i < len; ++i) {
        var id = GL.shaders.indexOf(result[i]);
        HEAP32[shaders + i * 4 >> 2] = id
    }
}

function _emscripten_glGetAttribLocation(program, name) {
    return GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name))
}

function _emscripten_glGetBooleanv(name_, p) {
    emscriptenWebGLGet(name_, p, 4)
}

function _emscripten_glGetBufferParameteri64v(target, value, data) {
    if (!data) {
        GL.recordError(1281);
        return
    }
    writeI53ToI64(data, GLctx.getBufferParameter(target, value))
}

function _emscripten_glGetBufferParameteriv(target, value, data) {
    if (!data) {
        GL.recordError(1281);
        return
    }
    HEAP32[data >> 2] = GLctx.getBufferParameter(target, value)
}

function _emscripten_glGetBufferPointerv(target, pname, params) {
    if (pname == 35005) {
        var ptr = 0;
        var mappedBuffer = GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)];
        if (mappedBuffer) {
            ptr = mappedBuffer.mem
        }
        HEAP32[params >> 2] = ptr
    } else {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glGetBufferPointerv")
    }
}

function _emscripten_glGetError() {
    var error = GLctx.getError() || GL.lastError;
    GL.lastError = 0;
    return error
}

function _emscripten_glGetFloatv(name_, p) {
    emscriptenWebGLGet(name_, p, 2)
}

function _emscripten_glGetFragDataLocation(program, name) {
    return GLctx["getFragDataLocation"](GL.programs[program], UTF8ToString(name))
}

function _emscripten_glGetFramebufferAttachmentParameteriv(target, attachment, pname, params) {
    var result = GLctx.getFramebufferAttachmentParameter(target, attachment, pname);
    if (result instanceof WebGLRenderbuffer || result instanceof WebGLTexture) {
        result = result.name | 0
    }
    HEAP32[params >> 2] = result
}

function emscriptenWebGLGetIndexed(target, index, data, type) {
    if (!data) {
        GL.recordError(1281);
        return
    }
    var result = GLctx["getIndexedParameter"](target, index);
    var ret;
    switch (typeof result) {
        case "boolean":
            ret = result ? 1 : 0;
            break;
        case "number":
            ret = result;
            break;
        case "object":
            if (result === null) {
                switch (target) {
                    case 35983:
                    case 35368:
                        ret = 0;
                        break;
                    default: {
                        GL.recordError(1280);
                        return
                    }
                }
            } else if (result instanceof WebGLBuffer) {
                ret = result.name | 0
            } else {
                GL.recordError(1280);
                return
            }
            break;
        default:
            GL.recordError(1280);
            return
    }
    switch (type) {
        case 1:
            writeI53ToI64(data, ret);
            break;
        case 0:
            HEAP32[data >> 2] = ret;
            break;
        case 2:
            HEAPF32[data >> 2] = ret;
            break;
        case 4:
            HEAP8[data >> 0] = ret ? 1 : 0;
            break;
        default:
            throw "internal emscriptenWebGLGetIndexed() error, bad type: " + type
    }
}

function _emscripten_glGetInteger64i_v(target, index, data) {
    emscriptenWebGLGetIndexed(target, index, data, 1)
}

function _emscripten_glGetInteger64v(name_, p) {
    emscriptenWebGLGet(name_, p, 1)
}

function _emscripten_glGetIntegeri_v(target, index, data) {
    emscriptenWebGLGetIndexed(target, index, data, 0)
}

function _emscripten_glGetIntegerv(name_, p) {
    emscriptenWebGLGet(name_, p, 0)
}

function _emscripten_glGetInternalformativ(target, internalformat, pname, bufSize, params) {
    if (bufSize < 0) {
        GL.recordError(1281);
        return
    }
    if (!params) {
        GL.recordError(1281);
        return
    }
    var ret = GLctx["getInternalformatParameter"](target, internalformat, pname);
    if (ret === null) return;
    for (var i = 0; i < ret.length && i < bufSize; ++i) {
        HEAP32[params + i >> 2] = ret[i]
    }
}

function _emscripten_glGetProgramBinary(program, bufSize, length, binaryFormat, binary) {
    GL.recordError(1282)
}

function _emscripten_glGetProgramInfoLog(program, maxLength, length, infoLog) {
    var log = GLctx.getProgramInfoLog(GL.programs[program]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}

function _emscripten_glGetProgramiv(program, pname, p) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (program >= GL.counter) {
        GL.recordError(1281);
        return
    }
    var ptable = GL.programInfos[program];
    if (!ptable) {
        GL.recordError(1282);
        return
    }
    if (pname == 35716) {
        var log = GLctx.getProgramInfoLog(GL.programs[program]);
        if (log === null) log = "(unknown error)";
        HEAP32[p >> 2] = log.length + 1
    } else if (pname == 35719) {
        HEAP32[p >> 2] = ptable.maxUniformLength
    } else if (pname == 35722) {
        if (ptable.maxAttributeLength == -1) {
            program = GL.programs[program];
            var numAttribs = GLctx.getProgramParameter(program, 35721);
            ptable.maxAttributeLength = 0;
            for (var i = 0; i < numAttribs; ++i) {
                var activeAttrib = GLctx.getActiveAttrib(program, i);
                ptable.maxAttributeLength = Math.max(ptable.maxAttributeLength, activeAttrib.name.length + 1)
            }
        }
        HEAP32[p >> 2] = ptable.maxAttributeLength
    } else if (pname == 35381) {
        if (ptable.maxUniformBlockNameLength == -1) {
            program = GL.programs[program];
            var numBlocks = GLctx.getProgramParameter(program, 35382);
            ptable.maxUniformBlockNameLength = 0;
            for (var i = 0; i < numBlocks; ++i) {
                var activeBlockName = GLctx.getActiveUniformBlockName(program, i);
                ptable.maxUniformBlockNameLength = Math.max(ptable.maxUniformBlockNameLength, activeBlockName.length + 1)
            }
        }
        HEAP32[p >> 2] = ptable.maxUniformBlockNameLength
    } else {
        HEAP32[p >> 2] = GLctx.getProgramParameter(GL.programs[program], pname)
    }
}

function _emscripten_glGetQueryObjecti64vEXT(id, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    var query = GL.timerQueriesEXT[id];
    var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
    var ret;
    if (typeof param == "boolean") {
        ret = param ? 1 : 0
    } else {
        ret = param
    }
    writeI53ToI64(params, ret)
}

function _emscripten_glGetQueryObjectivEXT(id, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    var query = GL.timerQueriesEXT[id];
    var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
    var ret;
    if (typeof param == "boolean") {
        ret = param ? 1 : 0
    } else {
        ret = param
    }
    HEAP32[params >> 2] = ret
}

function _emscripten_glGetQueryObjectui64vEXT(id, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    var query = GL.timerQueriesEXT[id];
    var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
    var ret;
    if (typeof param == "boolean") {
        ret = param ? 1 : 0
    } else {
        ret = param
    }
    writeI53ToI64(params, ret)
}

function _emscripten_glGetQueryObjectuiv(id, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    var query = GL.queries[id];
    var param = GLctx["getQueryParameter"](query, pname);
    var ret;
    if (typeof param == "boolean") {
        ret = param ? 1 : 0
    } else {
        ret = param
    }
    HEAP32[params >> 2] = ret
}

function _emscripten_glGetQueryObjectuivEXT(id, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    var query = GL.timerQueriesEXT[id];
    var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
    var ret;
    if (typeof param == "boolean") {
        ret = param ? 1 : 0
    } else {
        ret = param
    }
    HEAP32[params >> 2] = ret
}

function _emscripten_glGetQueryiv(target, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAP32[params >> 2] = GLctx["getQuery"](target, pname)
}

function _emscripten_glGetQueryivEXT(target, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAP32[params >> 2] = GLctx.disjointTimerQueryExt["getQueryEXT"](target, pname)
}

function _emscripten_glGetRenderbufferParameteriv(target, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAP32[params >> 2] = GLctx.getRenderbufferParameter(target, pname)
}

function _emscripten_glGetSamplerParameterfv(sampler, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    sampler = GL.samplers[sampler];
    HEAPF32[params >> 2] = GLctx["getSamplerParameter"](sampler, pname)
}

function _emscripten_glGetSamplerParameteriv(sampler, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    sampler = GL.samplers[sampler];
    HEAP32[params >> 2] = GLctx["getSamplerParameter"](sampler, pname)
}

function _emscripten_glGetShaderInfoLog(shader, maxLength, length, infoLog) {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}

function _emscripten_glGetShaderPrecisionFormat(shaderType, precisionType, range, precision) {
    var result = GLctx.getShaderPrecisionFormat(shaderType, precisionType);
    HEAP32[range >> 2] = result.rangeMin;
    HEAP32[range + 4 >> 2] = result.rangeMax;
    HEAP32[precision >> 2] = result.precision
}

function _emscripten_glGetShaderSource(shader, bufSize, length, source) {
    var result = GLctx.getShaderSource(GL.shaders[shader]);
    if (!result) return;
    var numBytesWrittenExclNull = bufSize > 0 && source ? stringToUTF8(result, source, bufSize) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}

function _emscripten_glGetShaderiv(shader, pname, p) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (pname == 35716) {
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = "(unknown error)";
        var logLength = log ? log.length + 1 : 0;
        HEAP32[p >> 2] = logLength
    } else if (pname == 35720) {
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        var sourceLength = source ? source.length + 1 : 0;
        HEAP32[p >> 2] = sourceLength
    } else {
        HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname)
    }
}

function stringToNewUTF8(jsString) {
    var length = lengthBytesUTF8(jsString) + 1;
    var cString = _malloc(length);
    stringToUTF8(jsString, cString, length);
    return cString
}

function _emscripten_glGetString(name_) {
    if (GL.stringCache[name_]) return GL.stringCache[name_];
    var ret;
    switch (name_) {
        case 7939:
            var exts = GLctx.getSupportedExtensions() || [];
            exts = exts.concat(exts.map(function (e) {
                return "GL_" + e
            }));
            ret = stringToNewUTF8(exts.join(" "));
            break;
        case 7936:
        case 7937:
        case 37445:
        case 37446:
            var s = GLctx.getParameter(name_);
            if (!s) {
                GL.recordError(1280)
            }
            ret = stringToNewUTF8(s);
            break;
        case 7938:
            var glVersion = GLctx.getParameter(7938);
            if (true) glVersion = "OpenGL ES 3.0 (" + glVersion + ")";
            else {
                glVersion = "OpenGL ES 2.0 (" + glVersion + ")"
            }
            ret = stringToNewUTF8(glVersion);
            break;
        case 35724:
            var glslVersion = GLctx.getParameter(35724);
            var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
            var ver_num = glslVersion.match(ver_re);
            if (ver_num !== null) {
                if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
                glslVersion = "OpenGL ES GLSL ES " + ver_num[1] + " (" + glslVersion + ")"
            }
            ret = stringToNewUTF8(glslVersion);
            break;
        default:
            GL.recordError(1280);
            return 0
    }
    GL.stringCache[name_] = ret;
    return ret
}

function _emscripten_glGetStringi(name, index) {
    if (GL.currentContext.version < 2) {
        GL.recordError(1282);
        return 0
    }
    var stringiCache = GL.stringiCache[name];
    if (stringiCache) {
        if (index < 0 || index >= stringiCache.length) {
            GL.recordError(1281);
            return 0
        }
        return stringiCache[index]
    }
    switch (name) {
        case 7939:
            var exts = GLctx.getSupportedExtensions() || [];
            exts = exts.concat(exts.map(function (e) {
                return "GL_" + e
            }));
            exts = exts.map(function (e) {
                return stringToNewUTF8(e)
            });
            stringiCache = GL.stringiCache[name] = exts;
            if (index < 0 || index >= stringiCache.length) {
                GL.recordError(1281);
                return 0
            }
            return stringiCache[index];
        default:
            GL.recordError(1280);
            return 0
    }
}

function _emscripten_glGetSynciv(sync, pname, bufSize, length, values) {
    if (bufSize < 0) {
        GL.recordError(1281);
        return
    }
    if (!values) {
        GL.recordError(1281);
        return
    }
    var ret = GLctx.getSyncParameter(GL.syncs[sync], pname);
    if (ret !== null) {
        HEAP32[values >> 2] = ret;
        if (length) HEAP32[length >> 2] = 1
    }
}

function _emscripten_glGetTexParameterfv(target, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAPF32[params >> 2] = GLctx.getTexParameter(target, pname)
}

function _emscripten_glGetTexParameteriv(target, pname, params) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAP32[params >> 2] = GLctx.getTexParameter(target, pname)
}

function _emscripten_glGetTransformFeedbackVarying(program, index, bufSize, length, size, type, name) {
    program = GL.programs[program];
    var info = GLctx["getTransformFeedbackVarying"](program, index);
    if (!info) return;
    if (name && bufSize > 0) {
        var numBytesWrittenExclNull = stringToUTF8(info.name, name, bufSize);
        if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
    } else {
        if (length) HEAP32[length >> 2] = 0
    }
    if (size) HEAP32[size >> 2] = info.size;
    if (type) HEAP32[type >> 2] = info.type
}

function _emscripten_glGetUniformBlockIndex(program, uniformBlockName) {
    return GLctx["getUniformBlockIndex"](GL.programs[program], UTF8ToString(uniformBlockName))
}

function _emscripten_glGetUniformIndices(program, uniformCount, uniformNames, uniformIndices) {
    if (!uniformIndices) {
        GL.recordError(1281);
        return
    }
    if (uniformCount > 0 && (uniformNames == 0 || uniformIndices == 0)) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    var names = [];
    for (var i = 0; i < uniformCount; i++) names.push(UTF8ToString(HEAP32[uniformNames + i * 4 >> 2]));
    var result = GLctx["getUniformIndices"](program, names);
    if (!result) return;
    var len = result.length;
    for (var i = 0; i < len; i++) {
        HEAP32[uniformIndices + i * 4 >> 2] = result[i]
    }
}

function jstoi_q(str) {
    return parseInt(str)
}

function _emscripten_glGetUniformLocation(program, name) {
    name = UTF8ToString(name);
    var arrayIndex = 0;
    if (name[name.length - 1] == "]") {
        var leftBrace = name.lastIndexOf("[");
        arrayIndex = name[leftBrace + 1] != "]" ? jstoi_q(name.slice(leftBrace + 1)) : 0;
        name = name.slice(0, leftBrace)
    }
    var uniformInfo = GL.programInfos[program] && GL.programInfos[program].uniforms[name];
    if (uniformInfo && arrayIndex >= 0 && arrayIndex < uniformInfo[0]) {
        return uniformInfo[1] + arrayIndex
    } else {
        return -1
    }
}

function emscriptenWebGLGetUniform(program, location, params, type) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    var data = GLctx.getUniform(GL.programs[program], GL.uniforms[location]);
    if (typeof data == "number" || typeof data == "boolean") {
        switch (type) {
            case 0:
                HEAP32[params >> 2] = data;
                break;
            case 2:
                HEAPF32[params >> 2] = data;
                break
        }
    } else {
        for (var i = 0; i < data.length; i++) {
            switch (type) {
                case 0:
                    HEAP32[params + i * 4 >> 2] = data[i];
                    break;
                case 2:
                    HEAPF32[params + i * 4 >> 2] = data[i];
                    break
            }
        }
    }
}

function _emscripten_glGetUniformfv(program, location, params) {
    emscriptenWebGLGetUniform(program, location, params, 2)
}

function _emscripten_glGetUniformiv(program, location, params) {
    emscriptenWebGLGetUniform(program, location, params, 0)
}

function _emscripten_glGetUniformuiv(program, location, params) {
    emscriptenWebGLGetUniform(program, location, params, 0)
}

function emscriptenWebGLGetVertexAttrib(index, pname, params, type) {
    if (!params) {
        GL.recordError(1281);
        return
    }
    if (GL.currentContext.clientBuffers[index].enabled) {
        err("glGetVertexAttrib*v on client-side array: not supported, bad data returned")
    }
    var data = GLctx.getVertexAttrib(index, pname);
    if (pname == 34975) {
        HEAP32[params >> 2] = data && data["name"]
    } else if (typeof data == "number" || typeof data == "boolean") {
        switch (type) {
            case 0:
                HEAP32[params >> 2] = data;
                break;
            case 2:
                HEAPF32[params >> 2] = data;
                break;
            case 5:
                HEAP32[params >> 2] = Math.fround(data);
                break
        }
    } else {
        for (var i = 0; i < data.length; i++) {
            switch (type) {
                case 0:
                    HEAP32[params + i * 4 >> 2] = data[i];
                    break;
                case 2:
                    HEAPF32[params + i * 4 >> 2] = data[i];
                    break;
                case 5:
                    HEAP32[params + i * 4 >> 2] = Math.fround(data[i]);
                    break
            }
        }
    }
}

function _emscripten_glGetVertexAttribIiv(index, pname, params) {
    emscriptenWebGLGetVertexAttrib(index, pname, params, 0)
}

function _emscripten_glGetVertexAttribIuiv(index, pname, params) {
    emscriptenWebGLGetVertexAttrib(index, pname, params, 0)
}

function _emscripten_glGetVertexAttribPointerv(index, pname, pointer) {
    if (!pointer) {
        GL.recordError(1281);
        return
    }
    if (GL.currentContext.clientBuffers[index].enabled) {
        err("glGetVertexAttribPointer on client-side array: not supported, bad data returned")
    }
    HEAP32[pointer >> 2] = GLctx.getVertexAttribOffset(index, pname)
}

function _emscripten_glGetVertexAttribfv(index, pname, params) {
    emscriptenWebGLGetVertexAttrib(index, pname, params, 2)
}

function _emscripten_glGetVertexAttribiv(index, pname, params) {
    emscriptenWebGLGetVertexAttrib(index, pname, params, 5)
}

function _emscripten_glHint(x0, x1) {
    GLctx["hint"](x0, x1)
}

function _emscripten_glInvalidateFramebuffer(target, numAttachments, attachments) {
    var list = tempFixedLengthArray[numAttachments];
    for (var i = 0; i < numAttachments; i++) {
        list[i] = HEAP32[attachments + i * 4 >> 2]
    }
    GLctx["invalidateFramebuffer"](target, list)
}

function _emscripten_glInvalidateSubFramebuffer(target, numAttachments, attachments, x, y, width, height) {
    var list = tempFixedLengthArray[numAttachments];
    for (var i = 0; i < numAttachments; i++) {
        list[i] = HEAP32[attachments + i * 4 >> 2]
    }
    GLctx["invalidateSubFramebuffer"](target, list, x, y, width, height)
}

function _emscripten_glIsBuffer(buffer) {
    var b = GL.buffers[buffer];
    if (!b) return 0;
    return GLctx.isBuffer(b)
}

function _emscripten_glIsEnabled(x0) {
    return GLctx["isEnabled"](x0)
}

function _emscripten_glIsFramebuffer(framebuffer) {
    var fb = GL.framebuffers[framebuffer];
    if (!fb) return 0;
    return GLctx.isFramebuffer(fb)
}

function _emscripten_glIsProgram(program) {
    program = GL.programs[program];
    if (!program) return 0;
    return GLctx.isProgram(program)
}

function _emscripten_glIsQuery(id) {
    var query = GL.queries[id];
    if (!query) return 0;
    return GLctx["isQuery"](query)
}

function _emscripten_glIsQueryEXT(id) {
    var query = GL.timerQueriesEXT[id];
    if (!query) return 0;
    return GLctx.disjointTimerQueryExt["isQueryEXT"](query)
}

function _emscripten_glIsRenderbuffer(renderbuffer) {
    var rb = GL.renderbuffers[renderbuffer];
    if (!rb) return 0;
    return GLctx.isRenderbuffer(rb)
}

function _emscripten_glIsSampler(id) {
    var sampler = GL.samplers[id];
    if (!sampler) return 0;
    return GLctx["isSampler"](sampler)
}

function _emscripten_glIsShader(shader) {
    var s = GL.shaders[shader];
    if (!s) return 0;
    return GLctx.isShader(s)
}

function _emscripten_glIsSync(sync) {
    return GLctx.isSync(GL.syncs[sync])
}

function _emscripten_glIsTexture(id) {
    var texture = GL.textures[id];
    if (!texture) return 0;
    return GLctx.isTexture(texture)
}

function _emscripten_glIsTransformFeedback(id) {
    return GLctx["isTransformFeedback"](GL.transformFeedbacks[id])
}

function _emscripten_glIsVertexArray(array) {
    var vao = GL.vaos[array];
    if (!vao) return 0;
    return GLctx["isVertexArray"](vao)
}

function _emscripten_glIsVertexArrayOES(array) {
    var vao = GL.vaos[array];
    if (!vao) return 0;
    return GLctx["isVertexArray"](vao)
}

function _emscripten_glLineWidth(x0) {
    GLctx["lineWidth"](x0)
}

function _emscripten_glLinkProgram(program) {
    GLctx.linkProgram(GL.programs[program]);
    GL.populateUniformTable(program)
}

function _emscripten_glMapBufferRange(target, offset, length, access) {
    if (access != 26 && access != 10) {
        warnOnce("glMapBufferRange is only supported when access is MAP_WRITE|INVALIDATE_BUFFER");
        return 0
    }
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glMapBufferRange");
        return 0
    }
    var mem = _malloc(length);
    if (!mem) return 0;
    GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)] = {
        offset: offset,
        length: length,
        mem: mem,
        access: access
    };
    return mem
}

function _emscripten_glPauseTransformFeedback() {
    GLctx["pauseTransformFeedback"]()
}

function _emscripten_glPixelStorei(pname, param) {
    if (pname == 3317) {
        GL.unpackAlignment = param
    }
    GLctx.pixelStorei(pname, param)
}

function _emscripten_glPolygonOffset(x0, x1) {
    GLctx["polygonOffset"](x0, x1)
}

function _emscripten_glProgramBinary(program, binaryFormat, binary, length) {
    GL.recordError(1280)
}

function _emscripten_glProgramParameteri(program, pname, value) {
    GL.recordError(1280)
}

function _emscripten_glQueryCounterEXT(id, target) {
    GLctx.disjointTimerQueryExt["queryCounterEXT"](GL.timerQueriesEXT[id], target)
}

function _emscripten_glReadBuffer(x0) {
    GLctx["readBuffer"](x0)
}

function computeUnpackAlignedImageSize(width, height, sizePerPixel, alignment) {
    function roundedToNextMultipleOf(x, y) {
        return x + y - 1 & -y
    }
    var plainRowSize = width * sizePerPixel;
    var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
    return height * alignedRowSize
}

function __colorChannelsInGlTextureFormat(format) {
    var colorChannels = {
        5: 3,
        6: 4,
        8: 2,
        29502: 3,
        29504: 4,
        26917: 2,
        26918: 2,
        29846: 3,
        29847: 4
    };
    return colorChannels[format - 6402] || 1
}

function heapObjectForWebGLType(type) {
    type -= 5120;
    if (type == 0) return HEAP8;
    if (type == 1) return HEAPU8;
    if (type == 2) return HEAP16;
    if (type == 4) return HEAP32;
    if (type == 6) return HEAPF32;
    if (type == 5 || type == 28922 || type == 28520 || type == 30779 || type == 30782) return HEAPU32;
    return HEAPU16
}

function heapAccessShiftForWebGLHeap(heap) {
    return 31 - Math.clz32(heap.BYTES_PER_ELEMENT)
}

function emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) {
    var heap = heapObjectForWebGLType(type);
    var shift = heapAccessShiftForWebGLHeap(heap);
    var byteSize = 1 << shift;
    var sizePerPixel = __colorChannelsInGlTextureFormat(format) * byteSize;
    var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel, GL.unpackAlignment);
    return heap.subarray(pixels >> shift, pixels + bytes >> shift)
}

function _emscripten_glReadPixels(x, y, width, height, format, type, pixels) {
    if (true) {
        if (GLctx.currentPixelPackBufferBinding) {
            GLctx.readPixels(x, y, width, height, format, type, pixels)
        } else {
            var heap = heapObjectForWebGLType(type);
            GLctx.readPixels(x, y, width, height, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
        }
        return
    }
    var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
    if (!pixelData) {
        GL.recordError(1280);
        return
    }
    GLctx.readPixels(x, y, width, height, format, type, pixelData)
}

function _emscripten_glReleaseShaderCompiler() {}

function _emscripten_glRenderbufferStorage(x0, x1, x2, x3) {
    GLctx["renderbufferStorage"](x0, x1, x2, x3)
}

function _emscripten_glRenderbufferStorageMultisample(x0, x1, x2, x3, x4) {
    GLctx["renderbufferStorageMultisample"](x0, x1, x2, x3, x4)
}

function _emscripten_glResumeTransformFeedback() {
    GLctx["resumeTransformFeedback"]()
}

function _emscripten_glSampleCoverage(value, invert) {
    GLctx.sampleCoverage(value, !!invert)
}

function _emscripten_glSamplerParameterf(sampler, pname, param) {
    GLctx["samplerParameterf"](GL.samplers[sampler], pname, param)
}

function _emscripten_glSamplerParameterfv(sampler, pname, params) {
    var param = HEAPF32[params >> 2];
    GLctx["samplerParameterf"](GL.samplers[sampler], pname, param)
}

function _emscripten_glSamplerParameteri(sampler, pname, param) {
    GLctx["samplerParameteri"](GL.samplers[sampler], pname, param)
}

function _emscripten_glSamplerParameteriv(sampler, pname, params) {
    var param = HEAP32[params >> 2];
    GLctx["samplerParameteri"](GL.samplers[sampler], pname, param)
}

function _emscripten_glScissor(x0, x1, x2, x3) {
    GLctx["scissor"](x0, x1, x2, x3)
}

function _emscripten_glShaderBinary() {
    GL.recordError(1280)
}

function _emscripten_glShaderSource(shader, count, string, length) {
    var source = GL.getSource(shader, count, string, length);
    GLctx.shaderSource(GL.shaders[shader], source)
}

function _emscripten_glStencilFunc(x0, x1, x2) {
    GLctx["stencilFunc"](x0, x1, x2)
}

function _emscripten_glStencilFuncSeparate(x0, x1, x2, x3) {
    GLctx["stencilFuncSeparate"](x0, x1, x2, x3)
}

function _emscripten_glStencilMask(x0) {
    GLctx["stencilMask"](x0)
}

function _emscripten_glStencilMaskSeparate(x0, x1) {
    GLctx["stencilMaskSeparate"](x0, x1)
}

function _emscripten_glStencilOp(x0, x1, x2) {
    GLctx["stencilOp"](x0, x1, x2)
}

function _emscripten_glStencilOpSeparate(x0, x1, x2, x3) {
    GLctx["stencilOpSeparate"](x0, x1, x2, x3)
}

function _emscripten_glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
    if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels)
        } else if (pixels) {
            var heap = heapObjectForWebGLType(type);
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
        } else {
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, null)
        }
        return
    }
    GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null)
}

function _emscripten_glTexImage3D(target, level, internalFormat, width, height, depth, border, format, type, pixels) {
    if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx["texImage3D"](target, level, internalFormat, width, height, depth, border, format, type, pixels)
    } else if (pixels) {
        var heap = heapObjectForWebGLType(type);
        GLctx["texImage3D"](target, level, internalFormat, width, height, depth, border, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
    } else {
        GLctx["texImage3D"](target, level, internalFormat, width, height, depth, border, format, type, null)
    }
}

function _emscripten_glTexParameterf(x0, x1, x2) {
    GLctx["texParameterf"](x0, x1, x2)
}

function _emscripten_glTexParameterfv(target, pname, params) {
    var param = HEAPF32[params >> 2];
    GLctx.texParameterf(target, pname, param)
}

function _emscripten_glTexParameteri(x0, x1, x2) {
    GLctx["texParameteri"](x0, x1, x2)
}

function _emscripten_glTexParameteriv(target, pname, params) {
    var param = HEAP32[params >> 2];
    GLctx.texParameteri(target, pname, param)
}

function _emscripten_glTexStorage2D(x0, x1, x2, x3, x4) {
    GLctx["texStorage2D"](x0, x1, x2, x3, x4)
}

function _emscripten_glTexStorage3D(x0, x1, x2, x3, x4, x5) {
    GLctx["texStorage3D"](x0, x1, x2, x3, x4, x5)
}

function _emscripten_glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
    if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels)
        } else if (pixels) {
            var heap = heapObjectForWebGLType(type);
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
        } else {
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, null)
        }
        return
    }
    var pixelData = null;
    if (pixels) pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0);
    GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData)
}

function _emscripten_glTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels) {
    if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx["texSubImage3D"](target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels)
    } else if (pixels) {
        var heap = heapObjectForWebGLType(type);
        GLctx["texSubImage3D"](target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
    } else {
        GLctx["texSubImage3D"](target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, null)
    }
}

function _emscripten_glTransformFeedbackVaryings(program, count, varyings, bufferMode) {
    program = GL.programs[program];
    var vars = [];
    for (var i = 0; i < count; i++) vars.push(UTF8ToString(HEAP32[varyings + i * 4 >> 2]));
    GLctx["transformFeedbackVaryings"](program, vars, bufferMode)
}

function _emscripten_glUniform1f(location, v0) {
    GLctx.uniform1f(GL.uniforms[location], v0)
}

function _emscripten_glUniform1fv(location, count, value) {
    GLctx.uniform1fv(GL.uniforms[location], HEAPF32, value >> 2, count)
}

function _emscripten_glUniform1i(location, v0) {
    GLctx.uniform1i(GL.uniforms[location], v0)
}

function _emscripten_glUniform1iv(location, count, value) {
    GLctx.uniform1iv(GL.uniforms[location], HEAP32, value >> 2, count)
}

function _emscripten_glUniform1ui(location, v0) {
    GLctx.uniform1ui(GL.uniforms[location], v0)
}

function _emscripten_glUniform1uiv(location, count, value) {
    GLctx.uniform1uiv(GL.uniforms[location], HEAPU32, value >> 2, count)
}

function _emscripten_glUniform2f(location, v0, v1) {
    GLctx.uniform2f(GL.uniforms[location], v0, v1)
}

function _emscripten_glUniform2fv(location, count, value) {
    GLctx.uniform2fv(GL.uniforms[location], HEAPF32, value >> 2, count * 2)
}

function _emscripten_glUniform2i(location, v0, v1) {
    GLctx.uniform2i(GL.uniforms[location], v0, v1)
}

function _emscripten_glUniform2iv(location, count, value) {
    GLctx.uniform2iv(GL.uniforms[location], HEAP32, value >> 2, count * 2)
}

function _emscripten_glUniform2ui(location, v0, v1) {
    GLctx.uniform2ui(GL.uniforms[location], v0, v1)
}

function _emscripten_glUniform2uiv(location, count, value) {
    GLctx.uniform2uiv(GL.uniforms[location], HEAPU32, value >> 2, count * 2)
}

function _emscripten_glUniform3f(location, v0, v1, v2) {
    GLctx.uniform3f(GL.uniforms[location], v0, v1, v2)
}

function _emscripten_glUniform3fv(location, count, value) {
    GLctx.uniform3fv(GL.uniforms[location], HEAPF32, value >> 2, count * 3)
}

function _emscripten_glUniform3i(location, v0, v1, v2) {
    GLctx.uniform3i(GL.uniforms[location], v0, v1, v2)
}

function _emscripten_glUniform3iv(location, count, value) {
    GLctx.uniform3iv(GL.uniforms[location], HEAP32, value >> 2, count * 3)
}

function _emscripten_glUniform3ui(location, v0, v1, v2) {
    GLctx.uniform3ui(GL.uniforms[location], v0, v1, v2)
}

function _emscripten_glUniform3uiv(location, count, value) {
    GLctx.uniform3uiv(GL.uniforms[location], HEAPU32, value >> 2, count * 3)
}

function _emscripten_glUniform4f(location, v0, v1, v2, v3) {
    GLctx.uniform4f(GL.uniforms[location], v0, v1, v2, v3)
}

function _emscripten_glUniform4fv(location, count, value) {
    GLctx.uniform4fv(GL.uniforms[location], HEAPF32, value >> 2, count * 4)
}

function _emscripten_glUniform4i(location, v0, v1, v2, v3) {
    GLctx.uniform4i(GL.uniforms[location], v0, v1, v2, v3)
}

function _emscripten_glUniform4iv(location, count, value) {
    GLctx.uniform4iv(GL.uniforms[location], HEAP32, value >> 2, count * 4)
}

function _emscripten_glUniform4ui(location, v0, v1, v2, v3) {
    GLctx.uniform4ui(GL.uniforms[location], v0, v1, v2, v3)
}

function _emscripten_glUniform4uiv(location, count, value) {
    GLctx.uniform4uiv(GL.uniforms[location], HEAPU32, value >> 2, count * 4)
}

function _emscripten_glUniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding) {
    program = GL.programs[program];
    GLctx["uniformBlockBinding"](program, uniformBlockIndex, uniformBlockBinding)
}

function _emscripten_glUniformMatrix2fv(location, count, transpose, value) {
    GLctx.uniformMatrix2fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 4)
}

function _emscripten_glUniformMatrix2x3fv(location, count, transpose, value) {
    GLctx.uniformMatrix2x3fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 6)
}

function _emscripten_glUniformMatrix2x4fv(location, count, transpose, value) {
    GLctx.uniformMatrix2x4fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 8)
}

function _emscripten_glUniformMatrix3fv(location, count, transpose, value) {
    GLctx.uniformMatrix3fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 9)
}

function _emscripten_glUniformMatrix3x2fv(location, count, transpose, value) {
    GLctx.uniformMatrix3x2fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 6)
}

function _emscripten_glUniformMatrix3x4fv(location, count, transpose, value) {
    GLctx.uniformMatrix3x4fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 12)
}

function _emscripten_glUniformMatrix4fv(location, count, transpose, value) {
    GLctx.uniformMatrix4fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 16)
}

function _emscripten_glUniformMatrix4x2fv(location, count, transpose, value) {
    GLctx.uniformMatrix4x2fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 8)
}

function _emscripten_glUniformMatrix4x3fv(location, count, transpose, value) {
    GLctx.uniformMatrix4x3fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 12)
}

function _emscripten_glUnmapBuffer(target) {
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glUnmapBuffer");
        return 0
    }
    var buffer = emscriptenWebGLGetBufferBinding(target);
    var mapping = GL.mappedBuffers[buffer];
    if (!mapping) {
        GL.recordError(1282);
        err("buffer was never mapped in glUnmapBuffer");
        return 0
    }
    GL.mappedBuffers[buffer] = null;
    if (!(mapping.access & 16))
        if (true) {
            GLctx.bufferSubData(target, mapping.offset, HEAPU8, mapping.mem, mapping.length)
        } else {
            GLctx.bufferSubData(target, mapping.offset, HEAPU8.subarray(mapping.mem, mapping.mem + mapping.length))
        } _free(mapping.mem);
    return 1
}

function _emscripten_glUseProgram(program) {
    GLctx.useProgram(GL.programs[program])
}

function _emscripten_glValidateProgram(program) {
    GLctx.validateProgram(GL.programs[program])
}

function _emscripten_glVertexAttrib1f(x0, x1) {
    GLctx["vertexAttrib1f"](x0, x1)
}

function _emscripten_glVertexAttrib1fv(index, v) {
    GLctx.vertexAttrib1f(index, HEAPF32[v >> 2])
}

function _emscripten_glVertexAttrib2f(x0, x1, x2) {
    GLctx["vertexAttrib2f"](x0, x1, x2)
}

function _emscripten_glVertexAttrib2fv(index, v) {
    GLctx.vertexAttrib2f(index, HEAPF32[v >> 2], HEAPF32[v + 4 >> 2])
}

function _emscripten_glVertexAttrib3f(x0, x1, x2, x3) {
    GLctx["vertexAttrib3f"](x0, x1, x2, x3)
}

function _emscripten_glVertexAttrib3fv(index, v) {
    GLctx.vertexAttrib3f(index, HEAPF32[v >> 2], HEAPF32[v + 4 >> 2], HEAPF32[v + 8 >> 2])
}

function _emscripten_glVertexAttrib4f(x0, x1, x2, x3, x4) {
    GLctx["vertexAttrib4f"](x0, x1, x2, x3, x4)
}

function _emscripten_glVertexAttrib4fv(index, v) {
    GLctx.vertexAttrib4f(index, HEAPF32[v >> 2], HEAPF32[v + 4 >> 2], HEAPF32[v + 8 >> 2], HEAPF32[v + 12 >> 2])
}

function _emscripten_glVertexAttribDivisor(index, divisor) {
    GLctx["vertexAttribDivisor"](index, divisor)
}

function _emscripten_glVertexAttribDivisorANGLE(index, divisor) {
    GLctx["vertexAttribDivisor"](index, divisor)
}

function _emscripten_glVertexAttribDivisorARB(index, divisor) {
    GLctx["vertexAttribDivisor"](index, divisor)
}

function _emscripten_glVertexAttribDivisorEXT(index, divisor) {
    GLctx["vertexAttribDivisor"](index, divisor)
}

function _emscripten_glVertexAttribDivisorNV(index, divisor) {
    GLctx["vertexAttribDivisor"](index, divisor)
}

function _emscripten_glVertexAttribI4i(x0, x1, x2, x3, x4) {
    GLctx["vertexAttribI4i"](x0, x1, x2, x3, x4)
}

function _emscripten_glVertexAttribI4iv(index, v) {
    GLctx.vertexAttribI4i(index, HEAP32[v >> 2], HEAP32[v + 4 >> 2], HEAP32[v + 8 >> 2], HEAP32[v + 12 >> 2])
}

function _emscripten_glVertexAttribI4ui(x0, x1, x2, x3, x4) {
    GLctx["vertexAttribI4ui"](x0, x1, x2, x3, x4)
}

function _emscripten_glVertexAttribI4uiv(index, v) {
    GLctx.vertexAttribI4ui(index, HEAPU32[v >> 2], HEAPU32[v + 4 >> 2], HEAPU32[v + 8 >> 2], HEAPU32[v + 12 >> 2])
}

function _emscripten_glVertexAttribIPointer(index, size, type, stride, ptr) {
    var cb = GL.currentContext.clientBuffers[index];
    if (!GLctx.currentArrayBufferBinding) {
        cb.size = size;
        cb.type = type;
        cb.normalized = false;
        cb.stride = stride;
        cb.ptr = ptr;
        cb.clientside = true;
        cb.vertexAttribPointerAdaptor = function (index, size, type, normalized, stride, ptr) {
            this.vertexAttribIPointer(index, size, type, stride, ptr)
        };
        return
    }
    cb.clientside = false;
    GLctx["vertexAttribIPointer"](index, size, type, stride, ptr)
}

function _emscripten_glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
    var cb = GL.currentContext.clientBuffers[index];
    if (!GLctx.currentArrayBufferBinding) {
        cb.size = size;
        cb.type = type;
        cb.normalized = normalized;
        cb.stride = stride;
        cb.ptr = ptr;
        cb.clientside = true;
        cb.vertexAttribPointerAdaptor = function (index, size, type, normalized, stride, ptr) {
            this.vertexAttribPointer(index, size, type, normalized, stride, ptr)
        };
        return
    }
    cb.clientside = false;
    GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr)
}

function _emscripten_glViewport(x0, x1, x2, x3) {
    GLctx["viewport"](x0, x1, x2, x3)
}

function _emscripten_glWaitSync(sync, flags, timeoutLo, timeoutHi) {
    GLctx.waitSync(GL.syncs[sync], flags, convertI32PairToI53(timeoutLo, timeoutHi))
}

function _emscripten_html5_remove_all_event_listeners() {
    JSEvents.removeAllEventListeners()
}

function _longjmp(env, value) {
    _setThrew(env, value || 1);
    throw "longjmp"
}

function _emscripten_longjmp(a0, a1) {
    return _longjmp(a0, a1)
}

function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.copyWithin(dest, src, src + num)
}

function _emscripten_request_pointerlock(target, deferUntilInEventHandler) {
    target = findEventTarget(target);
    if (!target) return -4;
    if (!target.requestPointerLock && !target.msRequestPointerLock) {
        return -1
    }
    var canPerformRequests = JSEvents.canPerformEventHandlerRequests();
    if (!canPerformRequests) {
        if (deferUntilInEventHandler) {
            JSEvents.deferCall(requestPointerLock, 2, [target]);
            return 1
        } else {
            return -2
        }
    }
    return requestPointerLock(target)
}

function _emscripten_get_heap_size() {
    return HEAPU8.length
}

function emscripten_realloc_buffer(size) {
    try {
        wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
        updateGlobalBufferAndViews(wasmMemory.buffer);
        return 1
    } catch (e) {}
}

function _emscripten_resize_heap(requestedSize) {
    var oldSize = _emscripten_get_heap_size();
    var maxHeapSize = 2147483648;
    if (requestedSize > maxHeapSize) {
        return false
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
            return true
        }
    }
    return false
}

function _emscripten_sample_gamepad_data() {
    return (JSEvents.lastGamepadState = navigator.getGamepads ? navigator.getGamepads() : navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : null) ? 0 : -1
}

function registerGamepadEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    if (!JSEvents.gamepadEvent) JSEvents.gamepadEvent = _malloc(1432);
    var gamepadEventHandlerFunc = function (ev) {
        var e = ev || event;
        var gamepadEvent = JSEvents.gamepadEvent;
        fillGamepadEventData(gamepadEvent, e["gamepad"]);
        if (wasmTable.get(callbackfunc)(eventTypeId, gamepadEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: findEventTarget(target),
        allowsDeferredCalls: true,
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: gamepadEventHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_gamepadconnected_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
    if (!navigator.getGamepads && !navigator.webkitGetGamepads) return -1;
    registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 26, "gamepadconnected", targetThread);
    return 0
}

function _emscripten_set_gamepaddisconnected_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
    if (!navigator.getGamepads && !navigator.webkitGetGamepads) return -1;
    registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 27, "gamepaddisconnected", targetThread);
    return 0
}

function registerKeyEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    if (!JSEvents.keyEvent) JSEvents.keyEvent = _malloc(164);
    var keyEventHandlerFunc = function (e) {
        var keyEventData = JSEvents.keyEvent;
        var idx = keyEventData >> 2;
        HEAP32[idx + 0] = e.location;
        HEAP32[idx + 1] = e.ctrlKey;
        HEAP32[idx + 2] = e.shiftKey;
        HEAP32[idx + 3] = e.altKey;
        HEAP32[idx + 4] = e.metaKey;
        HEAP32[idx + 5] = e.repeat;
        HEAP32[idx + 6] = e.charCode;
        HEAP32[idx + 7] = e.keyCode;
        HEAP32[idx + 8] = e.which;
        stringToUTF8(e.key || "", keyEventData + 36, 32);
        stringToUTF8(e.code || "", keyEventData + 68, 32);
        stringToUTF8(e.char || "", keyEventData + 100, 32);
        stringToUTF8(e.locale || "", keyEventData + 132, 32);
        if (wasmTable.get(callbackfunc)(eventTypeId, keyEventData, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: findEventTarget(target),
        allowsDeferredCalls: true,
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: keyEventHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_keydown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerKeyEventCallback(target, userData, useCapture, callbackfunc, 2, "keydown", targetThread);
    return 0
}

function _emscripten_set_keypress_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerKeyEventCallback(target, userData, useCapture, callbackfunc, 1, "keypress", targetThread);
    return 0
}

function _emscripten_set_keyup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerKeyEventCallback(target, userData, useCapture, callbackfunc, 3, "keyup", targetThread);
    return 0
}

function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop) {
    var browserIterationFunc = wasmTable.get(func);
    setMainLoop(browserIterationFunc, fps, simulateInfiniteLoop)
}

function getBoundingClientRect(e) {
    return specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {
        "left": 0,
        "top": 0
    }
}

function fillMouseEventData(eventStruct, e, target) {
    var idx = eventStruct >> 2;
    HEAP32[idx + 0] = e.screenX;
    HEAP32[idx + 1] = e.screenY;
    HEAP32[idx + 2] = e.clientX;
    HEAP32[idx + 3] = e.clientY;
    HEAP32[idx + 4] = e.ctrlKey;
    HEAP32[idx + 5] = e.shiftKey;
    HEAP32[idx + 6] = e.altKey;
    HEAP32[idx + 7] = e.metaKey;
    HEAP16[idx * 2 + 16] = e.button;
    HEAP16[idx * 2 + 17] = e.buttons;
    HEAP32[idx + 9] = e["movementX"];
    HEAP32[idx + 10] = e["movementY"];
    var rect = getBoundingClientRect(target);
    HEAP32[idx + 11] = e.clientX - rect.left;
    HEAP32[idx + 12] = e.clientY - rect.top
}

function registerMouseEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    if (!JSEvents.mouseEvent) JSEvents.mouseEvent = _malloc(64);
    target = findEventTarget(target);
    var mouseEventHandlerFunc = function (ev) {
        var e = ev || event;
        fillMouseEventData(JSEvents.mouseEvent, e, target);
        if (wasmTable.get(callbackfunc)(eventTypeId, JSEvents.mouseEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: target,
        allowsDeferredCalls: eventTypeString != "mousemove" && eventTypeString != "mouseenter" && eventTypeString != "mouseleave",
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: mouseEventHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_mousedown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerMouseEventCallback(target, userData, useCapture, callbackfunc, 5, "mousedown", targetThread);
    return 0
}

function _emscripten_set_mousemove_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerMouseEventCallback(target, userData, useCapture, callbackfunc, 8, "mousemove", targetThread);
    return 0
}

function _emscripten_set_mouseup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerMouseEventCallback(target, userData, useCapture, callbackfunc, 6, "mouseup", targetThread);
    return 0
}

function fillPointerlockChangeEventData(eventStruct) {
    var pointerLockElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement || document.msPointerLockElement;
    var isPointerlocked = !!pointerLockElement;
    HEAP32[eventStruct >> 2] = isPointerlocked;
    var nodeName = JSEvents.getNodeNameForTarget(pointerLockElement);
    var id = pointerLockElement && pointerLockElement.id ? pointerLockElement.id : "";
    stringToUTF8(nodeName, eventStruct + 4, 128);
    stringToUTF8(id, eventStruct + 132, 128)
}

function registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    if (!JSEvents.pointerlockChangeEvent) JSEvents.pointerlockChangeEvent = _malloc(260);
    var pointerlockChangeEventHandlerFunc = function (ev) {
        var e = ev || event;
        var pointerlockChangeEvent = JSEvents.pointerlockChangeEvent;
        fillPointerlockChangeEventData(pointerlockChangeEvent);
        if (wasmTable.get(callbackfunc)(eventTypeId, pointerlockChangeEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: target,
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: pointerlockChangeEventHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_pointerlockchange_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    if (!document || !document.body || !document.body.requestPointerLock && !document.body.mozRequestPointerLock && !document.body.webkitRequestPointerLock && !document.body.msRequestPointerLock) {
        return -1
    }
    target = findEventTarget(target);
    if (!target) return -4;
    registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "pointerlockchange", targetThread);
    registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "mozpointerlockchange", targetThread);
    registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "webkitpointerlockchange", targetThread);
    registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "mspointerlockchange", targetThread);
    return 0
}

function registerWheelEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    if (!JSEvents.wheelEvent) JSEvents.wheelEvent = _malloc(96);
    var wheelHandlerFunc = function (ev) {
        var e = ev || event;
        var wheelEvent = JSEvents.wheelEvent;
        fillMouseEventData(wheelEvent, e, target);
        HEAPF64[wheelEvent + 64 >> 3] = e["deltaX"];
        HEAPF64[wheelEvent + 72 >> 3] = e["deltaY"];
        HEAPF64[wheelEvent + 80 >> 3] = e["deltaZ"];
        HEAP32[wheelEvent + 88 >> 2] = e["deltaMode"];
        if (wasmTable.get(callbackfunc)(eventTypeId, wheelEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: target,
        allowsDeferredCalls: true,
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: wheelHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_wheel_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    target = findEventTarget(target);
    if (typeof target.onwheel !== "undefined") {
        registerWheelEventCallback(target, userData, useCapture, callbackfunc, 9, "wheel", targetThread);
        return 0
    } else {
        return -1
    }
}

function _emscripten_thread_sleep(msecs) {
    var start = _emscripten_get_now();
    while (_emscripten_get_now() - start < msecs) {}
}
var ENV = {};

function getExecutableName() {
    return thisProgram || "./this.program"
}

function getEnvStrings() {
    if (!getEnvStrings.strings) {
        var lang = (typeof navigator === "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env = {
            "USER": "web_user",
            "LOGNAME": "web_user",
            "PATH": "/",
            "PWD": "/",
            "HOME": "/home/web_user",
            "LANG": lang,
            "_": getExecutableName()
        };
        for (var x in ENV) {
            env[x] = ENV[x]
        }
        var strings = [];
        for (var x in env) {
            strings.push(x + "=" + env[x])
        }
        getEnvStrings.strings = strings
    }
    return getEnvStrings.strings
}

function _environ_get(__environ, environ_buf) {
    try {
        var bufSize = 0;
        getEnvStrings().forEach(function (string, i) {
            var ptr = environ_buf + bufSize;
            HEAP32[__environ + i * 4 >> 2] = ptr;
            writeAsciiToMemory(string, ptr);
            bufSize += string.length + 1
        });
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return e.errno
    }
}

function _environ_sizes_get(penviron_count, penviron_buf_size) {
    try {
        var strings = getEnvStrings();
        HEAP32[penviron_count >> 2] = strings.length;
        var bufSize = 0;
        strings.forEach(function (string) {
            bufSize += string.length + 1
        });
        HEAP32[penviron_buf_size >> 2] = bufSize;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return e.errno
    }
}

function _exit(status) {
    exit(status)
}

function _fd_close(fd) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return e.errno
    }
}

function _fd_fdstat_get(fd, pbuf) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
        HEAP8[pbuf >> 0] = type;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return e.errno
    }
}

function _fd_read(fd, iov, iovcnt, pnum) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = SYSCALLS.doReadv(stream, iov, iovcnt);
        HEAP32[pnum >> 2] = num;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return e.errno
    }
}

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var HIGH_OFFSET = 4294967296;
        var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0);
        var DOUBLE_LIMIT = 9007199254740992;
        if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {
            return -61
        }
        FS.llseek(stream, offset, whence);
        tempI64 = [stream.position >>> 0, (tempDouble = stream.position, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[newOffset >> 2] = tempI64[0], HEAP32[newOffset + 4 >> 2] = tempI64[1];
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return e.errno
    }
}

function _fd_write(fd, iov, iovcnt, pnum) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = SYSCALLS.doWritev(stream, iov, iovcnt);
        HEAP32[pnum >> 2] = num;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return e.errno
    }
}

function _getTempRet0() {
    return getTempRet0() | 0
}

function _glActiveTexture(x0) {
    GLctx["activeTexture"](x0)
}

function _glAttachShader(program, shader) {
    GLctx.attachShader(GL.programs[program], GL.shaders[shader])
}

function _glBindBuffer(target, buffer) {
    if (target == 34962) {
        GLctx.currentArrayBufferBinding = buffer
    } else if (target == 34963) {
        GLctx.currentElementArrayBufferBinding = buffer
    }
    if (target == 35051) {
        GLctx.currentPixelPackBufferBinding = buffer
    } else if (target == 35052) {
        GLctx.currentPixelUnpackBufferBinding = buffer
    }
    GLctx.bindBuffer(target, GL.buffers[buffer])
}

function _glBindFramebuffer(target, framebuffer) {
    GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer])
}

function _glBindRenderbuffer(target, renderbuffer) {
    GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer])
}

function _glBindVertexArray(vao) {
    GLctx["bindVertexArray"](GL.vaos[vao]);
    var ibo = GLctx.getParameter(34965);
    GLctx.currentElementArrayBufferBinding = ibo ? ibo.name | 0 : 0
}

function _glBlendColor(x0, x1, x2, x3) {
    GLctx["blendColor"](x0, x1, x2, x3)
}

function _glBlendEquation(x0) {
    GLctx["blendEquation"](x0)
}

function _glBlendEquationSeparate(x0, x1) {
    GLctx["blendEquationSeparate"](x0, x1)
}

function _glBlendFunc(x0, x1) {
    GLctx["blendFunc"](x0, x1)
}

function _glBlendFuncSeparate(x0, x1, x2, x3) {
    GLctx["blendFuncSeparate"](x0, x1, x2, x3)
}

function _glBufferData(target, size, data, usage) {
    if (true) {
        if (data) {
            GLctx.bufferData(target, HEAPU8, usage, data, size)
        } else {
            GLctx.bufferData(target, size, usage)
        }
    } else {
        GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage)
    }
}

function _glCheckFramebufferStatus(x0) {
    return GLctx["checkFramebufferStatus"](x0)
}

function _glClear(x0) {
    GLctx["clear"](x0)
}

function _glClearColor(x0, x1, x2, x3) {
    GLctx["clearColor"](x0, x1, x2, x3)
}

function _glClearStencil(x0) {
    GLctx["clearStencil"](x0)
}

function _glColorMask(red, green, blue, alpha) {
    GLctx.colorMask(!!red, !!green, !!blue, !!alpha)
}

function _glCompileShader(shader) {
    GLctx.compileShader(GL.shaders[shader])
}

function _glCopyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7) {
    GLctx["copyTexSubImage2D"](x0, x1, x2, x3, x4, x5, x6, x7)
}

function _glCreateProgram() {
    var id = GL.getNewId(GL.programs);
    var program = GLctx.createProgram();
    program.name = id;
    GL.programs[id] = program;
    return id
}

function _glCreateShader(shaderType) {
    var id = GL.getNewId(GL.shaders);
    GL.shaders[id] = GLctx.createShader(shaderType);
    return id
}

function _glCullFace(x0) {
    GLctx["cullFace"](x0)
}

function _glDeleteBuffers(n, buffers) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[buffers + i * 4 >> 2];
        var buffer = GL.buffers[id];
        if (!buffer) continue;
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
        if (id == GLctx.currentArrayBufferBinding) GLctx.currentArrayBufferBinding = 0;
        if (id == GLctx.currentElementArrayBufferBinding) GLctx.currentElementArrayBufferBinding = 0;
        if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
        if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0
    }
}

function _glDeleteFramebuffers(n, framebuffers) {
    for (var i = 0; i < n; ++i) {
        var id = HEAP32[framebuffers + i * 4 >> 2];
        var framebuffer = GL.framebuffers[id];
        if (!framebuffer) continue;
        GLctx.deleteFramebuffer(framebuffer);
        framebuffer.name = 0;
        GL.framebuffers[id] = null
    }
}

function _glDeleteProgram(id) {
    if (!id) return;
    var program = GL.programs[id];
    if (!program) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteProgram(program);
    program.name = 0;
    GL.programs[id] = null;
    GL.programInfos[id] = null
}

function _glDeleteRenderbuffers(n, renderbuffers) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[renderbuffers + i * 4 >> 2];
        var renderbuffer = GL.renderbuffers[id];
        if (!renderbuffer) continue;
        GLctx.deleteRenderbuffer(renderbuffer);
        renderbuffer.name = 0;
        GL.renderbuffers[id] = null
    }
}

function _glDeleteShader(id) {
    if (!id) return;
    var shader = GL.shaders[id];
    if (!shader) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteShader(shader);
    GL.shaders[id] = null
}

function _glDeleteVertexArrays(n, vaos) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[vaos + i * 4 >> 2];
        GLctx["deleteVertexArray"](GL.vaos[id]);
        GL.vaos[id] = null
    }
}

function _glDepthFunc(x0) {
    GLctx["depthFunc"](x0)
}

function _glDepthMask(flag) {
    GLctx.depthMask(!!flag)
}

function _glDepthRangef(x0, x1) {
    GLctx["depthRange"](x0, x1)
}

function _glDetachShader(program, shader) {
    GLctx.detachShader(GL.programs[program], GL.shaders[shader])
}

function _glDisable(x0) {
    GLctx["disable"](x0)
}

function _glDisableVertexAttribArray(index) {
    var cb = GL.currentContext.clientBuffers[index];
    cb.enabled = false;
    GLctx.disableVertexAttribArray(index)
}

function _glDrawArrays(mode, first, count) {
    GL.preDrawHandleClientVertexAttribBindings(first + count);
    GLctx.drawArrays(mode, first, count);
    GL.postDrawHandleClientVertexAttribBindings()
}

function _glDrawBuffers(n, bufs) {
    var bufArray = tempFixedLengthArray[n];
    for (var i = 0; i < n; i++) {
        bufArray[i] = HEAP32[bufs + i * 4 >> 2]
    }
    GLctx["drawBuffers"](bufArray)
}

function _glEnable(x0) {
    GLctx["enable"](x0)
}

function _glEnableVertexAttribArray(index) {
    var cb = GL.currentContext.clientBuffers[index];
    cb.enabled = true;
    GLctx.enableVertexAttribArray(index)
}

function _glFinish() {
    GLctx["finish"]()
}

function _glFlush() {
    GLctx["flush"]()
}

function _glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
    GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer])
}

function _glFramebufferTexture2D(target, attachment, textarget, texture, level) {
    GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level)
}

function _glFrontFace(x0) {
    GLctx["frontFace"](x0)
}

function _glGenBuffers(n, buffers) {
    __glGenObject(n, buffers, "createBuffer", GL.buffers)
}

function _glGenFramebuffers(n, ids) {
    __glGenObject(n, ids, "createFramebuffer", GL.framebuffers)
}

function _glGenRenderbuffers(n, renderbuffers) {
    __glGenObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers)
}

function _glGenVertexArrays(n, arrays) {
    __glGenObject(n, arrays, "createVertexArray", GL.vaos)
}

function _glGenerateMipmap(x0) {
    GLctx["generateMipmap"](x0)
}

function _glGetActiveUniform(program, index, bufSize, length, size, type, name) {
    __glGetActiveAttribOrUniform("getActiveUniform", program, index, bufSize, length, size, type, name)
}

function _glGetAttribLocation(program, name) {
    return GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name))
}

function _glGetError() {
    var error = GLctx.getError() || GL.lastError;
    GL.lastError = 0;
    return error
}

function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
    var log = GLctx.getProgramInfoLog(GL.programs[program]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}

function _glGetProgramiv(program, pname, p) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (program >= GL.counter) {
        GL.recordError(1281);
        return
    }
    var ptable = GL.programInfos[program];
    if (!ptable) {
        GL.recordError(1282);
        return
    }
    if (pname == 35716) {
        var log = GLctx.getProgramInfoLog(GL.programs[program]);
        if (log === null) log = "(unknown error)";
        HEAP32[p >> 2] = log.length + 1
    } else if (pname == 35719) {
        HEAP32[p >> 2] = ptable.maxUniformLength
    } else if (pname == 35722) {
        if (ptable.maxAttributeLength == -1) {
            program = GL.programs[program];
            var numAttribs = GLctx.getProgramParameter(program, 35721);
            ptable.maxAttributeLength = 0;
            for (var i = 0; i < numAttribs; ++i) {
                var activeAttrib = GLctx.getActiveAttrib(program, i);
                ptable.maxAttributeLength = Math.max(ptable.maxAttributeLength, activeAttrib.name.length + 1)
            }
        }
        HEAP32[p >> 2] = ptable.maxAttributeLength
    } else if (pname == 35381) {
        if (ptable.maxUniformBlockNameLength == -1) {
            program = GL.programs[program];
            var numBlocks = GLctx.getProgramParameter(program, 35382);
            ptable.maxUniformBlockNameLength = 0;
            for (var i = 0; i < numBlocks; ++i) {
                var activeBlockName = GLctx.getActiveUniformBlockName(program, i);
                ptable.maxUniformBlockNameLength = Math.max(ptable.maxUniformBlockNameLength, activeBlockName.length + 1)
            }
        }
        HEAP32[p >> 2] = ptable.maxUniformBlockNameLength
    } else {
        HEAP32[p >> 2] = GLctx.getProgramParameter(GL.programs[program], pname)
    }
}

function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}

function _glGetShaderiv(shader, pname, p) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (pname == 35716) {
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = "(unknown error)";
        var logLength = log ? log.length + 1 : 0;
        HEAP32[p >> 2] = logLength
    } else if (pname == 35720) {
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        var sourceLength = source ? source.length + 1 : 0;
        HEAP32[p >> 2] = sourceLength
    } else {
        HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname)
    }
}

function _glGetString(name_) {
    if (GL.stringCache[name_]) return GL.stringCache[name_];
    var ret;
    switch (name_) {
        case 7939:
            var exts = GLctx.getSupportedExtensions() || [];
            exts = exts.concat(exts.map(function (e) {
                return "GL_" + e
            }));
            ret = stringToNewUTF8(exts.join(" "));
            break;
        case 7936:
        case 7937:
        case 37445:
        case 37446:
            var s = GLctx.getParameter(name_);
            if (!s) {
                GL.recordError(1280)
            }
            ret = stringToNewUTF8(s);
            break;
        case 7938:
            var glVersion = GLctx.getParameter(7938);
            if (true) glVersion = "OpenGL ES 3.0 (" + glVersion + ")";
            else {
                glVersion = "OpenGL ES 2.0 (" + glVersion + ")"
            }
            ret = stringToNewUTF8(glVersion);
            break;
        case 35724:
            var glslVersion = GLctx.getParameter(35724);
            var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
            var ver_num = glslVersion.match(ver_re);
            if (ver_num !== null) {
                if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
                glslVersion = "OpenGL ES GLSL ES " + ver_num[1] + " (" + glslVersion + ")"
            }
            ret = stringToNewUTF8(glslVersion);
            break;
        default:
            GL.recordError(1280);
            return 0
    }
    GL.stringCache[name_] = ret;
    return ret
}

function _glGetStringi(name, index) {
    if (GL.currentContext.version < 2) {
        GL.recordError(1282);
        return 0
    }
    var stringiCache = GL.stringiCache[name];
    if (stringiCache) {
        if (index < 0 || index >= stringiCache.length) {
            GL.recordError(1281);
            return 0
        }
        return stringiCache[index]
    }
    switch (name) {
        case 7939:
            var exts = GLctx.getSupportedExtensions() || [];
            exts = exts.concat(exts.map(function (e) {
                return "GL_" + e
            }));
            exts = exts.map(function (e) {
                return stringToNewUTF8(e)
            });
            stringiCache = GL.stringiCache[name] = exts;
            if (index < 0 || index >= stringiCache.length) {
                GL.recordError(1281);
                return 0
            }
            return stringiCache[index];
        default:
            GL.recordError(1280);
            return 0
    }
}

function _glGetUniformLocation(program, name) {
    name = UTF8ToString(name);
    var arrayIndex = 0;
    if (name[name.length - 1] == "]") {
        var leftBrace = name.lastIndexOf("[");
        arrayIndex = name[leftBrace + 1] != "]" ? jstoi_q(name.slice(leftBrace + 1)) : 0;
        name = name.slice(0, leftBrace)
    }
    var uniformInfo = GL.programInfos[program] && GL.programInfos[program].uniforms[name];
    if (uniformInfo && arrayIndex >= 0 && arrayIndex < uniformInfo[0]) {
        return uniformInfo[1] + arrayIndex
    } else {
        return -1
    }
}

function _glIsProgram(program) {
    program = GL.programs[program];
    if (!program) return 0;
    return GLctx.isProgram(program)
}

function _glLineWidth(x0) {
    GLctx["lineWidth"](x0)
}

function _glLinkProgram(program) {
    GLctx.linkProgram(GL.programs[program]);
    GL.populateUniformTable(program)
}

function _glMapBufferRange(target, offset, length, access) {
    if (access != 26 && access != 10) {
        warnOnce("glMapBufferRange is only supported when access is MAP_WRITE|INVALIDATE_BUFFER");
        return 0
    }
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glMapBufferRange");
        return 0
    }
    var mem = _malloc(length);
    if (!mem) return 0;
    GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)] = {
        offset: offset,
        length: length,
        mem: mem,
        access: access
    };
    return mem
}

function _glPixelStorei(pname, param) {
    if (pname == 3317) {
        GL.unpackAlignment = param
    }
    GLctx.pixelStorei(pname, param)
}

function _glPolygonOffset(x0, x1) {
    GLctx["polygonOffset"](x0, x1)
}

function _glReadBuffer(x0) {
    GLctx["readBuffer"](x0)
}

function _glReadPixels(x, y, width, height, format, type, pixels) {
    if (true) {
        if (GLctx.currentPixelPackBufferBinding) {
            GLctx.readPixels(x, y, width, height, format, type, pixels)
        } else {
            var heap = heapObjectForWebGLType(type);
            GLctx.readPixels(x, y, width, height, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
        }
        return
    }
    var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
    if (!pixelData) {
        GL.recordError(1280);
        return
    }
    GLctx.readPixels(x, y, width, height, format, type, pixelData)
}

function _glRenderbufferStorage(x0, x1, x2, x3) {
    GLctx["renderbufferStorage"](x0, x1, x2, x3)
}

function _glScissor(x0, x1, x2, x3) {
    GLctx["scissor"](x0, x1, x2, x3)
}

function _glShaderSource(shader, count, string, length) {
    var source = GL.getSource(shader, count, string, length);
    GLctx.shaderSource(GL.shaders[shader], source)
}

function _glStencilFunc(x0, x1, x2) {
    GLctx["stencilFunc"](x0, x1, x2)
}

function _glStencilMask(x0) {
    GLctx["stencilMask"](x0)
}

function _glStencilOp(x0, x1, x2) {
    GLctx["stencilOp"](x0, x1, x2)
}

function _glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
    if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels)
        } else if (pixels) {
            var heap = heapObjectForWebGLType(type);
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
        } else {
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, null)
        }
        return
    }
    GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null)
}

function _glTexStorage2D(x0, x1, x2, x3, x4) {
    GLctx["texStorage2D"](x0, x1, x2, x3, x4)
}

function _glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
    if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels)
        } else if (pixels) {
            var heap = heapObjectForWebGLType(type);
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap))
        } else {
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, null)
        }
        return
    }
    var pixelData = null;
    if (pixels) pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0);
    GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData)
}

function _glUniform1f(location, v0) {
    GLctx.uniform1f(GL.uniforms[location], v0)
}

function _glUniform1fv(location, count, value) {
    GLctx.uniform1fv(GL.uniforms[location], HEAPF32, value >> 2, count)
}

function _glUniform1i(location, v0) {
    GLctx.uniform1i(GL.uniforms[location], v0)
}

function _glUniform1ui(location, v0) {
    GLctx.uniform1ui(GL.uniforms[location], v0)
}

function _glUniform2f(location, v0, v1) {
    GLctx.uniform2f(GL.uniforms[location], v0, v1)
}

function _glUniform2fv(location, count, value) {
    GLctx.uniform2fv(GL.uniforms[location], HEAPF32, value >> 2, count * 2)
}

function _glUniform2i(location, v0, v1) {
    GLctx.uniform2i(GL.uniforms[location], v0, v1)
}

function _glUniform2ui(location, v0, v1) {
    GLctx.uniform2ui(GL.uniforms[location], v0, v1)
}

function _glUniform3f(location, v0, v1, v2) {
    GLctx.uniform3f(GL.uniforms[location], v0, v1, v2)
}

function _glUniform3fv(location, count, value) {
    GLctx.uniform3fv(GL.uniforms[location], HEAPF32, value >> 2, count * 3)
}

function _glUniform4f(location, v0, v1, v2, v3) {
    GLctx.uniform4f(GL.uniforms[location], v0, v1, v2, v3)
}

function _glUniform4fv(location, count, value) {
    GLctx.uniform4fv(GL.uniforms[location], HEAPF32, value >> 2, count * 4)
}

function _glUniformMatrix4fv(location, count, transpose, value) {
    GLctx.uniformMatrix4fv(GL.uniforms[location], !!transpose, HEAPF32, value >> 2, count * 16)
}

function _glUnmapBuffer(target) {
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glUnmapBuffer");
        return 0
    }
    var buffer = emscriptenWebGLGetBufferBinding(target);
    var mapping = GL.mappedBuffers[buffer];
    if (!mapping) {
        GL.recordError(1282);
        err("buffer was never mapped in glUnmapBuffer");
        return 0
    }
    GL.mappedBuffers[buffer] = null;
    if (!(mapping.access & 16))
        if (true) {
            GLctx.bufferSubData(target, mapping.offset, HEAPU8, mapping.mem, mapping.length)
        } else {
            GLctx.bufferSubData(target, mapping.offset, HEAPU8.subarray(mapping.mem, mapping.mem + mapping.length))
        } _free(mapping.mem);
    return 1
}

function _glUseProgram(program) {
    GLctx.useProgram(GL.programs[program])
}

function _glVertexAttribIPointer(index, size, type, stride, ptr) {
    var cb = GL.currentContext.clientBuffers[index];
    if (!GLctx.currentArrayBufferBinding) {
        cb.size = size;
        cb.type = type;
        cb.normalized = false;
        cb.stride = stride;
        cb.ptr = ptr;
        cb.clientside = true;
        cb.vertexAttribPointerAdaptor = function (index, size, type, normalized, stride, ptr) {
            this.vertexAttribIPointer(index, size, type, stride, ptr)
        };
        return
    }
    cb.clientside = false;
    GLctx["vertexAttribIPointer"](index, size, type, stride, ptr)
}

function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
    var cb = GL.currentContext.clientBuffers[index];
    if (!GLctx.currentArrayBufferBinding) {
        cb.size = size;
        cb.type = type;
        cb.normalized = normalized;
        cb.stride = stride;
        cb.ptr = ptr;
        cb.clientside = true;
        cb.vertexAttribPointerAdaptor = function (index, size, type, normalized, stride, ptr) {
            this.vertexAttribPointer(index, size, type, normalized, stride, ptr)
        };
        return
    }
    cb.clientside = false;
    GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr)
}

function _glViewport(x0, x1, x2, x3) {
    GLctx["viewport"](x0, x1, x2, x3)
}

function _mktime(tmPtr) {
    _tzset();
    var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0);
    var dst = HEAP32[tmPtr + 32 >> 2];
    var guessedOffset = date.getTimezoneOffset();
    var start = new Date(date.getFullYear(), 0, 1);
    var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    var winterOffset = start.getTimezoneOffset();
    var dstOffset = Math.min(winterOffset, summerOffset);
    if (dst < 0) {
        HEAP32[tmPtr + 32 >> 2] = Number(summerOffset != winterOffset && dstOffset == guessedOffset)
    } else if (dst > 0 != (dstOffset == guessedOffset)) {
        var nonDstOffset = Math.max(winterOffset, summerOffset);
        var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
        date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4)
    }
    HEAP32[tmPtr + 24 >> 2] = date.getDay();
    var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday;
    HEAP32[tmPtr >> 2] = date.getSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getHours();
    HEAP32[tmPtr + 12 >> 2] = date.getDate();
    HEAP32[tmPtr + 16 >> 2] = date.getMonth();
    return date.getTime() / 1e3 | 0
}

function _setTempRet0($i) {
    setTempRet0($i | 0)
}

function __isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function __arraySum(array, index) {
    var sum = 0;
    for (var i = 0; i <= index; sum += array[i++]) {}
    return sum
}
var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function __addDays(date, days) {
    var newDate = new Date(date.getTime());
    while (days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
        if (days > daysInCurrentMonth - newDate.getDate()) {
            days -= daysInCurrentMonth - newDate.getDate() + 1;
            newDate.setDate(1);
            if (currentMonth < 11) {
                newDate.setMonth(currentMonth + 1)
            } else {
                newDate.setMonth(0);
                newDate.setFullYear(newDate.getFullYear() + 1)
            }
        } else {
            newDate.setDate(newDate.getDate() + days);
            return newDate
        }
    }
    return newDate
}

function _strftime(s, maxsize, format, tm) {
    var tm_zone = HEAP32[tm + 40 >> 2];
    var date = {
        tm_sec: HEAP32[tm >> 2],
        tm_min: HEAP32[tm + 4 >> 2],
        tm_hour: HEAP32[tm + 8 >> 2],
        tm_mday: HEAP32[tm + 12 >> 2],
        tm_mon: HEAP32[tm + 16 >> 2],
        tm_year: HEAP32[tm + 20 >> 2],
        tm_wday: HEAP32[tm + 24 >> 2],
        tm_yday: HEAP32[tm + 28 >> 2],
        tm_isdst: HEAP32[tm + 32 >> 2],
        tm_gmtoff: HEAP32[tm + 36 >> 2],
        tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
    };
    var pattern = UTF8ToString(format);
    var EXPANSION_RULES_1 = {
        "%c": "%a %b %d %H:%M:%S %Y",
        "%D": "%m/%d/%y",
        "%F": "%Y-%m-%d",
        "%h": "%b",
        "%r": "%I:%M:%S %p",
        "%R": "%H:%M",
        "%T": "%H:%M:%S",
        "%x": "%m/%d/%y",
        "%X": "%H:%M:%S",
        "%Ec": "%c",
        "%EC": "%C",
        "%Ex": "%m/%d/%y",
        "%EX": "%H:%M:%S",
        "%Ey": "%y",
        "%EY": "%Y",
        "%Od": "%d",
        "%Oe": "%e",
        "%OH": "%H",
        "%OI": "%I",
        "%Om": "%m",
        "%OM": "%M",
        "%OS": "%S",
        "%Ou": "%u",
        "%OU": "%U",
        "%OV": "%V",
        "%Ow": "%w",
        "%OW": "%W",
        "%Oy": "%y"
    };
    for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule])
    }
    var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    function leadingSomething(value, digits, character) {
        var str = typeof value === "number" ? value.toString() : value || "";
        while (str.length < digits) {
            str = character[0] + str
        }
        return str
    }

    function leadingNulls(value, digits) {
        return leadingSomething(value, digits, "0")
    }

    function compareByDay(date1, date2) {
        function sgn(value) {
            return value < 0 ? -1 : value > 0 ? 1 : 0
        }
        var compare;
        if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
            if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
                compare = sgn(date1.getDate() - date2.getDate())
            }
        }
        return compare
    }

    function getFirstWeekStartDate(janFourth) {
        switch (janFourth.getDay()) {
            case 0:
                return new Date(janFourth.getFullYear() - 1, 11, 29);
            case 1:
                return janFourth;
            case 2:
                return new Date(janFourth.getFullYear(), 0, 3);
            case 3:
                return new Date(janFourth.getFullYear(), 0, 2);
            case 4:
                return new Date(janFourth.getFullYear(), 0, 1);
            case 5:
                return new Date(janFourth.getFullYear() - 1, 11, 31);
            case 6:
                return new Date(janFourth.getFullYear() - 1, 11, 30)
        }
    }

    function getWeekBasedYear(date) {
        var thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
        var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
        var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
        if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
                return thisDate.getFullYear() + 1
            } else {
                return thisDate.getFullYear()
            }
        } else {
            return thisDate.getFullYear() - 1
        }
    }
    var EXPANSION_RULES_2 = {
        "%a": function (date) {
            return WEEKDAYS[date.tm_wday].substring(0, 3)
        },
        "%A": function (date) {
            return WEEKDAYS[date.tm_wday]
        },
        "%b": function (date) {
            return MONTHS[date.tm_mon].substring(0, 3)
        },
        "%B": function (date) {
            return MONTHS[date.tm_mon]
        },
        "%C": function (date) {
            var year = date.tm_year + 1900;
            return leadingNulls(year / 100 | 0, 2)
        },
        "%d": function (date) {
            return leadingNulls(date.tm_mday, 2)
        },
        "%e": function (date) {
            return leadingSomething(date.tm_mday, 2, " ")
        },
        "%g": function (date) {
            return getWeekBasedYear(date).toString().substring(2)
        },
        "%G": function (date) {
            return getWeekBasedYear(date)
        },
        "%H": function (date) {
            return leadingNulls(date.tm_hour, 2)
        },
        "%I": function (date) {
            var twelveHour = date.tm_hour;
            if (twelveHour == 0) twelveHour = 12;
            else if (twelveHour > 12) twelveHour -= 12;
            return leadingNulls(twelveHour, 2)
        },
        "%j": function (date) {
            return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3)
        },
        "%m": function (date) {
            return leadingNulls(date.tm_mon + 1, 2)
        },
        "%M": function (date) {
            return leadingNulls(date.tm_min, 2)
        },
        "%n": function () {
            return "\n"
        },
        "%p": function (date) {
            if (date.tm_hour >= 0 && date.tm_hour < 12) {
                return "AM"
            } else {
                return "PM"
            }
        },
        "%S": function (date) {
            return leadingNulls(date.tm_sec, 2)
        },
        "%t": function () {
            return "\t"
        },
        "%u": function (date) {
            return date.tm_wday || 7
        },
        "%U": function (date) {
            var janFirst = new Date(date.tm_year + 1900, 0, 1);
            var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
            var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
            if (compareByDay(firstSunday, endDate) < 0) {
                var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
                var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
                var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
                return leadingNulls(Math.ceil(days / 7), 2)
            }
            return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00"
        },
        "%V": function (date) {
            var janFourthThisYear = new Date(date.tm_year + 1900, 0, 4);
            var janFourthNextYear = new Date(date.tm_year + 1901, 0, 4);
            var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
            var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
            var endDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
            if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
                return "53"
            }
            if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
                return "01"
            }
            var daysDifference;
            if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
                daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate()
            } else {
                daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate()
            }
            return leadingNulls(Math.ceil(daysDifference / 7), 2)
        },
        "%w": function (date) {
            return date.tm_wday
        },
        "%W": function (date) {
            var janFirst = new Date(date.tm_year, 0, 1);
            var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
            var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
            if (compareByDay(firstMonday, endDate) < 0) {
                var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
                var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
                var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
                return leadingNulls(Math.ceil(days / 7), 2)
            }
            return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00"
        },
        "%y": function (date) {
            return (date.tm_year + 1900).toString().substring(2)
        },
        "%Y": function (date) {
            return date.tm_year + 1900
        },
        "%z": function (date) {
            var off = date.tm_gmtoff;
            var ahead = off >= 0;
            off = Math.abs(off) / 60;
            off = off / 60 * 100 + off % 60;
            return (ahead ? "+" : "-") + String("0000" + off).slice(-4)
        },
        "%Z": function (date) {
            return date.tm_zone
        },
        "%%": function () {
            return "%"
        }
    };
    for (var rule in EXPANSION_RULES_2) {
        if (pattern.indexOf(rule) >= 0) {
            pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date))
        }
    }
    var bytes = intArrayFromString(pattern, false);
    if (bytes.length > maxsize) {
        return 0
    }
    writeArrayToMemory(bytes, s);
    return bytes.length - 1
}

function _sysconf(name) {
    switch (name) {
        case 30:
            return 16384;
        case 85:
            var maxHeapSize = 2147483648;
            return maxHeapSize / 16384;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
            return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
        case 80:
        case 81:
        case 79:
            return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
            return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
            return 1024;
        case 31:
        case 42:
        case 72:
            return 32;
        case 87:
        case 26:
        case 33:
            return 2147483647;
        case 34:
        case 1:
            return 47839;
        case 38:
        case 36:
            return 99;
        case 43:
        case 37:
            return 2048;
        case 0:
            return 2097152;
        case 3:
            return 65536;
        case 28:
            return 32768;
        case 44:
            return 32767;
        case 75:
            return 16384;
        case 39:
            return 1e3;
        case 89:
            return 700;
        case 71:
            return 256;
        case 40:
            return 255;
        case 2:
            return 100;
        case 180:
            return 64;
        case 25:
            return 20;
        case 5:
            return 16;
        case 6:
            return 6;
        case 73:
            return 4;
        case 84: {
            if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
            return 1
        }
    }
    setErrNo(28);
    return -1
}

function _time(ptr) {
    var ret = Date.now() / 1e3 | 0;
    if (ptr) {
        HEAP32[ptr >> 2] = ret
    }
    return ret
}
Module["requestFullscreen"] = function Module_requestFullscreen(lockPointer, resizeCanvas) {
    Browser.requestFullscreen(lockPointer, resizeCanvas)
};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
    Browser.requestAnimationFrame(func)
};
Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) {
    Browser.setCanvasSize(width, height, noUpdates)
};
Module["pauseMainLoop"] = function Module_pauseMainLoop() {
    Browser.mainLoop.pause()
};
Module["resumeMainLoop"] = function Module_resumeMainLoop() {
    Browser.mainLoop.resume()
};
Module["getUserMedia"] = function Module_getUserMedia() {
    Browser.getUserMedia()
};
Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) {
    return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes)
};
var GLctx;
var FSNode = function (parent, name, mode, rdev) {
    if (!parent) {
        parent = this
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev
};
var readMode = 292 | 73;
var writeMode = 146;
Object.defineProperties(FSNode.prototype, {
    read: {
        get: function () {
            return (this.mode & readMode) === readMode
        },
        set: function (val) {
            val ? this.mode |= readMode : this.mode &= ~readMode
        }
    },
    write: {
        get: function () {
            return (this.mode & writeMode) === writeMode
        },
        set: function (val) {
            val ? this.mode |= writeMode : this.mode &= ~writeMode
        }
    },
    isFolder: {
        get: function () {
            return FS.isDir(this.mode)
        }
    },
    isDevice: {
        get: function () {
            return FS.isChrdev(this.mode)
        }
    }
});
FS.FSNode = FSNode;
FS.staticInit();
for (var i = 0; i < 32; ++i) tempFixedLengthArray.push(new Array(i));

function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array
}
var asmLibraryArg = {
    "mb": _RWebAudioBufferSize,
    "Cb": _RWebAudioFree,
    "Jc": _RWebAudioInit,
    "Je": _RWebAudioRecalibrateTime,
    "yc": _RWebAudioSampleRate,
    "Jb": _RWebAudioSetNonblockState,
    "Tb": _RWebAudioStart,
    "cc": _RWebAudioStop,
    "nc": _RWebAudioWrite,
    "sb": _RWebAudioWriteAvail,
    "lb": _RWebCamFree,
    "ob": _RWebCamInit,
    "hb": _RWebCamPoll,
    "jb": _RWebCamStart,
    "ib": _RWebCamStop,
    "r": ___assert_fail,
    "A": ___cxa_allocate_exception,
    "N": ___cxa_atexit,
    "z": ___cxa_throw,
    "xb": ___localtime_r,
    "Ca": ___sys_fcntl64,
    "Hb": ___sys_fstat64,
    "Db": ___sys_ftruncate64,
    "Fb": ___sys_getcwd,
    "Ib": ___sys_getdents64,
    "Eb": ___sys_getpid,
    "zb": ___sys_ioctl,
    "Kb": ___sys_mkdir,
    "ea": ___sys_open,
    "Gb": ___sys_readlink,
    "yb": ___sys_rename,
    "Ab": ___sys_rmdir,
    "Ea": ___sys_stat64,
    "Bb": ___sys_unlink,
    "c": _abort,
    "Ga": _clock_gettime,
    "qg": _dummyErrnoCodes,
    "_a": _eglBindAPI,
    "Mh": _eglChooseConfig,
    "Va": _eglCreateContext,
    "Kh": _eglCreateWindowSurface,
    "Ya": _eglDestroyContext,
    "Qh": _eglDestroySurface,
    "Nh": _eglGetConfigs,
    "Oh": _eglGetCurrentContext,
    "Lh": _eglGetDisplay,
    "bb": _eglGetError,
    "$a": _eglInitialize,
    "ua": _eglMakeCurrent,
    "Xa": _eglQuerySurface,
    "Ph": _eglSwapBuffers,
    "ab": _eglTerminate,
    "Sd": _emscripten_exit_pointerlock,
    "kb": _emscripten_force_exit,
    "va": _emscripten_get_canvas_element_size,
    "fa": _emscripten_get_device_pixel_ratio,
    "cb": _emscripten_get_fullscreen_status,
    "S": _emscripten_get_gamepad_status,
    "Tg": _emscripten_glActiveTexture,
    "Sg": _emscripten_glAttachShader,
    "Jd": _emscripten_glBeginQuery,
    "jh": _emscripten_glBeginQueryEXT,
    "ld": _emscripten_glBeginTransformFeedback,
    "Rg": _emscripten_glBindAttribLocation,
    "Qg": _emscripten_glBindBuffer,
    "id": _emscripten_glBindBufferBase,
    "jd": _emscripten_glBindBufferRange,
    "Pg": _emscripten_glBindFramebuffer,
    "Og": _emscripten_glBindRenderbuffer,
    "mc": _emscripten_glBindSampler,
    "Ng": _emscripten_glBindTexture,
    "ec": _emscripten_glBindTransformFeedback,
    "rd": _emscripten_glBindVertexArray,
    "ah": _emscripten_glBindVertexArrayOES,
    "Mg": _emscripten_glBlendColor,
    "Lg": _emscripten_glBlendEquation,
    "Kg": _emscripten_glBlendEquationSeparate,
    "Jg": _emscripten_glBlendFunc,
    "Ig": _emscripten_glBlendFuncSeparate,
    "wd": _emscripten_glBlitFramebuffer,
    "Hg": _emscripten_glBufferData,
    "Gg": _emscripten_glBufferSubData,
    "Fg": _emscripten_glCheckFramebufferStatus,
    "Eg": _emscripten_glClear,
    "Mc": _emscripten_glClearBufferfi,
    "Nc": _emscripten_glClearBufferfv,
    "Pc": _emscripten_glClearBufferiv,
    "Oc": _emscripten_glClearBufferuiv,
    "Dg": _emscripten_glClearColor,
    "Cg": _emscripten_glClearDepthf,
    "Ag": _emscripten_glClearStencil,
    "wc": _emscripten_glClientWaitSync,
    "zg": _emscripten_glColorMask,
    "yg": _emscripten_glCompileShader,
    "xg": _emscripten_glCompressedTexImage2D,
    "Od": _emscripten_glCompressedTexImage3D,
    "wg": _emscripten_glCompressedTexSubImage2D,
    "Nd": _emscripten_glCompressedTexSubImage3D,
    "Kc": _emscripten_glCopyBufferSubData,
    "vg": _emscripten_glCopyTexImage2D,
    "ug": _emscripten_glCopyTexSubImage2D,
    "Pd": _emscripten_glCopyTexSubImage3D,
    "tg": _emscripten_glCreateProgram,
    "sg": _emscripten_glCreateShader,
    "rg": _emscripten_glCullFace,
    "pg": _emscripten_glDeleteBuffers,
    "og": _emscripten_glDeleteFramebuffers,
    "ng": _emscripten_glDeleteProgram,
    "Ld": _emscripten_glDeleteQueries,
    "lh": _emscripten_glDeleteQueriesEXT,
    "mg": _emscripten_glDeleteRenderbuffers,
    "pc": _emscripten_glDeleteSamplers,
    "lg": _emscripten_glDeleteShader,
    "xc": _emscripten_glDeleteSync,
    "kg": _emscripten_glDeleteTextures,
    "dc": _emscripten_glDeleteTransformFeedbacks,
    "qd": _emscripten_glDeleteVertexArrays,
    "$g": _emscripten_glDeleteVertexArraysOES,
    "jg": _emscripten_glDepthFunc,
    "ig": _emscripten_glDepthMask,
    "hg": _emscripten_glDepthRangef,
    "gg": _emscripten_glDetachShader,
    "eg": _emscripten_glDisable,
    "dg": _emscripten_glDisableVertexAttribArray,
    "cg": _emscripten_glDrawArrays,
    "Cc": _emscripten_glDrawArraysInstanced,
    "Xg": _emscripten_glDrawArraysInstancedANGLE,
    "Nb": _emscripten_glDrawArraysInstancedARB,
    "Xd": _emscripten_glDrawArraysInstancedEXT,
    "Ob": _emscripten_glDrawArraysInstancedNV,
    "Dd": _emscripten_glDrawBuffers,
    "Vd": _emscripten_glDrawBuffersEXT,
    "Yg": _emscripten_glDrawBuffersWEBGL,
    "bg": _emscripten_glDrawElements,
    "Bc": _emscripten_glDrawElementsInstanced,
    "Vg": _emscripten_glDrawElementsInstancedANGLE,
    "Lb": _emscripten_glDrawElementsInstancedARB,
    "Mb": _emscripten_glDrawElementsInstancedEXT,
    "Wd": _emscripten_glDrawElementsInstancedNV,
    "Td": _emscripten_glDrawRangeElements,
    "ag": _emscripten_glEnable,
    "$f": _emscripten_glEnableVertexAttribArray,
    "Id": _emscripten_glEndQuery,
    "ih": _emscripten_glEndQueryEXT,
    "kd": _emscripten_glEndTransformFeedback,
    "Ac": _emscripten_glFenceSync,
    "_f": _emscripten_glFinish,
    "Zf": _emscripten_glFlush,
    "sd": _emscripten_glFlushMappedBufferRange,
    "Yf": _emscripten_glFramebufferRenderbuffer,
    "Xf": _emscripten_glFramebufferTexture2D,
    "ud": _emscripten_glFramebufferTextureLayer,
    "Vf": _emscripten_glFrontFace,
    "Uf": _emscripten_glGenBuffers,
    "Sf": _emscripten_glGenFramebuffers,
    "Md": _emscripten_glGenQueries,
    "mh": _emscripten_glGenQueriesEXT,
    "Rf": _emscripten_glGenRenderbuffers,
    "qc": _emscripten_glGenSamplers,
    "Qf": _emscripten_glGenTextures,
    "bc": _emscripten_glGenTransformFeedbacks,
    "pd": _emscripten_glGenVertexArrays,
    "_g": _emscripten_glGenVertexArraysOES,
    "Tf": _emscripten_glGenerateMipmap,
    "Pf": _emscripten_glGetActiveAttrib,
    "Of": _emscripten_glGetActiveUniform,
    "Ec": _emscripten_glGetActiveUniformBlockName,
    "Fc": _emscripten_glGetActiveUniformBlockiv,
    "Hc": _emscripten_glGetActiveUniformsiv,
    "Nf": _emscripten_glGetAttachedShaders,
    "Mf": _emscripten_glGetAttribLocation,
    "Kf": _emscripten_glGetBooleanv,
    "rc": _emscripten_glGetBufferParameteri64v,
    "Jf": _emscripten_glGetBufferParameteriv,
    "Ed": _emscripten_glGetBufferPointerv,
    "If": _emscripten_glGetError,
    "Hf": _emscripten_glGetFloatv,
    "Yc": _emscripten_glGetFragDataLocation,
    "Gf": _emscripten_glGetFramebufferAttachmentParameteriv,
    "sc": _emscripten_glGetInteger64i_v,
    "uc": _emscripten_glGetInteger64v,
    "md": _emscripten_glGetIntegeri_v,
    "Ff": _emscripten_glGetIntegerv,
    "Rb": _emscripten_glGetInternalformativ,
    "Zb": _emscripten_glGetProgramBinary,
    "Df": _emscripten_glGetProgramInfoLog,
    "Ef": _emscripten_glGetProgramiv,
    "ch": _emscripten_glGetQueryObjecti64vEXT,
    "eh": _emscripten_glGetQueryObjectivEXT,
    "bh": _emscripten_glGetQueryObjectui64vEXT,
    "Gd": _emscripten_glGetQueryObjectuiv,
    "dh": _emscripten_glGetQueryObjectuivEXT,
    "Hd": _emscripten_glGetQueryiv,
    "gh": _emscripten_glGetQueryivEXT,
    "Cf": _emscripten_glGetRenderbufferParameteriv,
    "gc": _emscripten_glGetSamplerParameterfv,
    "hc": _emscripten_glGetSamplerParameteriv,
    "zf": _emscripten_glGetShaderInfoLog,
    "yf": _emscripten_glGetShaderPrecisionFormat,
    "xf": _emscripten_glGetShaderSource,
    "Bf": _emscripten_glGetShaderiv,
    "wf": _emscripten_glGetString,
    "Lc": _emscripten_glGetStringi,
    "tc": _emscripten_glGetSynciv,
    "vf": _emscripten_glGetTexParameterfv,
    "uf": _emscripten_glGetTexParameteriv,
    "gd": _emscripten_glGetTransformFeedbackVarying,
    "Gc": _emscripten_glGetUniformBlockIndex,
    "Ic": _emscripten_glGetUniformIndices,
    "rf": _emscripten_glGetUniformLocation,
    "tf": _emscripten_glGetUniformfv,
    "sf": _emscripten_glGetUniformiv,
    "Zc": _emscripten_glGetUniformuiv,
    "ed": _emscripten_glGetVertexAttribIiv,
    "dd": _emscripten_glGetVertexAttribIuiv,
    "nf": _emscripten_glGetVertexAttribPointerv,
    "qf": _emscripten_glGetVertexAttribfv,
    "of": _emscripten_glGetVertexAttribiv,
    "mf": _emscripten_glHint,
    "Wb": _emscripten_glInvalidateFramebuffer,
    "Vb": _emscripten_glInvalidateSubFramebuffer,
    "lf": _emscripten_glIsBuffer,
    "kf": _emscripten_glIsEnabled,
    "jf": _emscripten_glIsFramebuffer,
    "hf": _emscripten_glIsProgram,
    "Kd": _emscripten_glIsQuery,
    "kh": _emscripten_glIsQueryEXT,
    "gf": _emscripten_glIsRenderbuffer,
    "oc": _emscripten_glIsSampler,
    "ff": _emscripten_glIsShader,
    "zc": _emscripten_glIsSync,
    "ef": _emscripten_glIsTexture,
    "ac": _emscripten_glIsTransformFeedback,
    "od": _emscripten_glIsVertexArray,
    "Zg": _emscripten_glIsVertexArrayOES,
    "cf": _emscripten_glLineWidth,
    "bf": _emscripten_glLinkProgram,
    "td": _emscripten_glMapBufferRange,
    "$b": _emscripten_glPauseTransformFeedback,
    "af": _emscripten_glPixelStorei,
    "$e": _emscripten_glPolygonOffset,
    "Yb": _emscripten_glProgramBinary,
    "Xb": _emscripten_glProgramParameteri,
    "hh": _emscripten_glQueryCounterEXT,
    "Ud": _emscripten_glReadBuffer,
    "_e": _emscripten_glReadPixels,
    "Ze": _emscripten_glReleaseShaderCompiler,
    "Ye": _emscripten_glRenderbufferStorage,
    "vd": _emscripten_glRenderbufferStorageMultisample,
    "_b": _emscripten_glResumeTransformFeedback,
    "Xe": _emscripten_glSampleCoverage,
    "jc": _emscripten_glSamplerParameterf,
    "ic": _emscripten_glSamplerParameterfv,
    "lc": _emscripten_glSamplerParameteri,
    "kc": _emscripten_glSamplerParameteriv,
    "We": _emscripten_glScissor,
    "Ve": _emscripten_glShaderBinary,
    "Te": _emscripten_glShaderSource,
    "Se": _emscripten_glStencilFunc,
    "Re": _emscripten_glStencilFuncSeparate,
    "Qe": _emscripten_glStencilMask,
    "Pe": _emscripten_glStencilMaskSeparate,
    "Oe": _emscripten_glStencilOp,
    "Ne": _emscripten_glStencilOpSeparate,
    "Me": _emscripten_glTexImage2D,
    "Rd": _emscripten_glTexImage3D,
    "Le": _emscripten_glTexParameterf,
    "Ke": _emscripten_glTexParameterfv,
    "He": _emscripten_glTexParameteri,
    "Ge": _emscripten_glTexParameteriv,
    "Ub": _emscripten_glTexStorage2D,
    "Sb": _emscripten_glTexStorage3D,
    "Fe": _emscripten_glTexSubImage2D,
    "Qd": _emscripten_glTexSubImage3D,
    "hd": _emscripten_glTransformFeedbackVaryings,
    "Ee": _emscripten_glUniform1f,
    "De": _emscripten_glUniform1fv,
    "Ce": _emscripten_glUniform1i,
    "Be": _emscripten_glUniform1iv,
    "Xc": _emscripten_glUniform1ui,
    "Tc": _emscripten_glUniform1uiv,
    "Ae": _emscripten_glUniform2f,
    "ze": _emscripten_glUniform2fv,
    "ye": _emscripten_glUniform2i,
    "we": _emscripten_glUniform2iv,
    "Wc": _emscripten_glUniform2ui,
    "Sc": _emscripten_glUniform2uiv,
    "ve": _emscripten_glUniform3f,
    "ue": _emscripten_glUniform3fv,
    "te": _emscripten_glUniform3i,
    "se": _emscripten_glUniform3iv,
    "Vc": _emscripten_glUniform3ui,
    "Rc": _emscripten_glUniform3uiv,
    "re": _emscripten_glUniform4f,
    "qe": _emscripten_glUniform4fv,
    "pe": _emscripten_glUniform4i,
    "oe": _emscripten_glUniform4iv,
    "Uc": _emscripten_glUniform4ui,
    "Qc": _emscripten_glUniform4uiv,
    "Dc": _emscripten_glUniformBlockBinding,
    "ne": _emscripten_glUniformMatrix2fv,
    "Cd": _emscripten_glUniformMatrix2x3fv,
    "Ad": _emscripten_glUniformMatrix2x4fv,
    "le": _emscripten_glUniformMatrix3fv,
    "Bd": _emscripten_glUniformMatrix3x2fv,
    "yd": _emscripten_glUniformMatrix3x4fv,
    "ke": _emscripten_glUniformMatrix4fv,
    "zd": _emscripten_glUniformMatrix4x2fv,
    "xd": _emscripten_glUniformMatrix4x3fv,
    "Fd": _emscripten_glUnmapBuffer,
    "je": _emscripten_glUseProgram,
    "ie": _emscripten_glValidateProgram,
    "he": _emscripten_glVertexAttrib1f,
    "ge": _emscripten_glVertexAttrib1fv,
    "fe": _emscripten_glVertexAttrib2f,
    "ee": _emscripten_glVertexAttrib2fv,
    "de": _emscripten_glVertexAttrib3f,
    "ce": _emscripten_glVertexAttrib3fv,
    "ae": _emscripten_glVertexAttrib4f,
    "$d": _emscripten_glVertexAttrib4fv,
    "fc": _emscripten_glVertexAttribDivisor,
    "Ug": _emscripten_glVertexAttribDivisorANGLE,
    "Pb": _emscripten_glVertexAttribDivisorARB,
    "Yd": _emscripten_glVertexAttribDivisorEXT,
    "Qb": _emscripten_glVertexAttribDivisorNV,
    "bd": _emscripten_glVertexAttribI4i,
    "$c": _emscripten_glVertexAttribI4iv,
    "ad": _emscripten_glVertexAttribI4ui,
    "_c": _emscripten_glVertexAttribI4uiv,
    "fd": _emscripten_glVertexAttribIPointer,
    "_d": _emscripten_glVertexAttribPointer,
    "Zd": _emscripten_glViewport,
    "vc": _emscripten_glWaitSync,
    "me": _emscripten_html5_remove_all_event_listeners,
    "V": _emscripten_longjmp,
    "qb": _emscripten_memcpy_big,
    "be": _emscripten_request_pointerlock,
    "rb": _emscripten_resize_heap,
    "Fa": _emscripten_sample_gamepad_data,
    "nd": _emscripten_set_gamepadconnected_callback_on_thread,
    "cd": _emscripten_set_gamepaddisconnected_callback_on_thread,
    "Wf": _emscripten_set_keydown_callback_on_thread,
    "Af": _emscripten_set_keypress_callback_on_thread,
    "Lf": _emscripten_set_keyup_callback_on_thread,
    "fg": _emscripten_set_main_loop,
    "db": _emscripten_set_main_loop_timing,
    "pf": _emscripten_set_mousedown_callback_on_thread,
    "Ue": _emscripten_set_mousemove_callback_on_thread,
    "df": _emscripten_set_mouseup_callback_on_thread,
    "xe": _emscripten_set_pointerlockchange_callback_on_thread,
    "Ie": _emscripten_set_wheel_callback_on_thread,
    "wb": _emscripten_thread_sleep,
    "ub": _environ_get,
    "vb": _environ_sizes_get,
    "la": _exit,
    "R": _fd_close,
    "tb": _fd_fdstat_get,
    "Da": _fd_read,
    "nb": _fd_seek,
    "da": _fd_write,
    "b": _getTempRet0,
    "t": _glActiveTexture,
    "sa": _glAttachShader,
    "m": _glBindBuffer,
    "k": _glBindFramebuffer,
    "Z": _glBindRenderbuffer,
    "d": _glBindTexture,
    "l": _glBindVertexArray,
    "qh": _glBlendColor,
    "U": _glBlendEquation,
    "ph": _glBlendEquationSeparate,
    "v": _glBlendFunc,
    "ka": _glBlendFuncSeparate,
    "Q": _glBufferData,
    "O": _glCheckFramebufferStatus,
    "y": _glClear,
    "P": _glClearColor,
    "Ch": _glClearStencil,
    "Ma": _glColorMask,
    "Oa": _glCompileShader,
    "Bh": _glCopyTexSubImage2D,
    "Sa": _glCreateProgram,
    "ta": _glCreateShader,
    "La": _glCullFace,
    "$": _glDeleteBuffers,
    "F": _glDeleteFramebuffers,
    "W": _glDeleteProgram,
    "za": _glDeleteRenderbuffers,
    "J": _glDeleteShader,
    "j": _glDeleteTextures,
    "nh": _glDeleteVertexArrays,
    "ia": _glDepthFunc,
    "Ka": _glDepthMask,
    "zh": _glDepthRangef,
    "uh": _glDetachShader,
    "e": _glDisable,
    "o": _glDisableVertexAttribArray,
    "u": _glDrawArrays,
    "rh": _glDrawBuffers,
    "yh": _glDrawElements,
    "h": _glEnable,
    "pa": _glEnableVertexAttribArray,
    "Rh": _glFinish,
    "Za": _glFlush,
    "wa": _glFramebufferRenderbuffer,
    "M": _glFramebufferTexture2D,
    "Ia": _glFrontFace,
    "ba": _glGenBuffers,
    "_": _glGenFramebuffers,
    "fb": _glGenRenderbuffers,
    "x": _glGenTextures,
    "oh": _glGenVertexArrays,
    "aa": _glGenerateMipmap,
    "xh": _glGetActiveUniform,
    "qa": _glGetAttribLocation,
    "Ba": _glGetError,
    "H": _glGetIntegerv,
    "Qa": _glGetProgramInfoLog,
    "ra": _glGetProgramiv,
    "Na": _glGetShaderInfoLog,
    "na": _glGetShaderiv,
    "w": _glGetString,
    "eb": _glGetStringi,
    "K": _glGetUniformLocation,
    "X": _glIsProgram,
    "ma": _glLineWidth,
    "Ra": _glLinkProgram,
    "ya": _glMapBufferRange,
    "I": _glPixelStorei,
    "Ja": _glPolygonOffset,
    "Ah": _glReadBuffer,
    "Aa": _glReadPixels,
    "xa": _glRenderbufferStorage,
    "Y": _glScissor,
    "Pa": _glShaderSource,
    "ga": _glStencilFunc,
    "ja": _glStencilMask,
    "ha": _glStencilOp,
    "D": _glTexImage2D,
    "f": _glTexParameteri,
    "ca": _glTexStorage2D,
    "T": _glTexSubImage2D,
    "Ua": _glUniform1f,
    "Gh": _glUniform1fv,
    "C": _glUniform1i,
    "wh": _glUniform1ui,
    "Jh": _glUniform2f,
    "p": _glUniform2fv,
    "sh": _glUniform2i,
    "vh": _glUniform2ui,
    "Ih": _glUniform3f,
    "Fh": _glUniform3fv,
    "Hh": _glUniform4f,
    "Eh": _glUniform4fv,
    "Dh": _glUniformMatrix4fv,
    "gb": _glUnmapBuffer,
    "B": _glUseProgram,
    "th": _glVertexAttribIPointer,
    "oa": _glVertexAttribPointer,
    "q": _glViewport,
    "Ha": invoke_i,
    "E": invoke_ii,
    "s": invoke_iii,
    "Wa": invoke_iiii,
    "Ta": invoke_iiiiii,
    "pb": invoke_j,
    "n": invoke_v,
    "g": invoke_vi,
    "i": invoke_vii,
    "fh": invoke_viii,
    "Wg": _mktime,
    "a": _setTempRet0,
    "L": _strftime,
    "Bg": _sysconf,
    "G": _time
};
var asm = createWasm();
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function () {
    return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["Th"]).apply(null, arguments)
};
var _free = Module["_free"] = function () {
    return (_free = Module["_free"] = Module["asm"]["Uh"]).apply(null, arguments)
};
var _malloc = Module["_malloc"] = function () {
    return (_malloc = Module["_malloc"] = Module["asm"]["Vh"]).apply(null, arguments)
};
var _fflush = Module["_fflush"] = function () {
    return (_fflush = Module["_fflush"] = Module["asm"]["Xh"]).apply(null, arguments)
};
var ___errno_location = Module["___errno_location"] = function () {
    return (___errno_location = Module["___errno_location"] = Module["asm"]["Yh"]).apply(null, arguments)
};
var _cmd_savefiles = Module["_cmd_savefiles"] = function () {
    return (_cmd_savefiles = Module["_cmd_savefiles"] = Module["asm"]["Zh"]).apply(null, arguments)
};
var _cmd_save_state = Module["_cmd_save_state"] = function () {
    return (_cmd_save_state = Module["_cmd_save_state"] = Module["asm"]["_h"]).apply(null, arguments)
};
var _cmd_load_state = Module["_cmd_load_state"] = function () {
    return (_cmd_load_state = Module["_cmd_load_state"] = Module["asm"]["$h"]).apply(null, arguments)
};
var _cmd_undo_save_state = Module["_cmd_undo_save_state"] = function () {
    return (_cmd_undo_save_state = Module["_cmd_undo_save_state"] = Module["asm"]["ai"]).apply(null, arguments)
};
var _cmd_undo_load_state = Module["_cmd_undo_load_state"] = function () {
    return (_cmd_undo_load_state = Module["_cmd_undo_load_state"] = Module["asm"]["bi"]).apply(null, arguments)
};
var _cmd_take_screenshot = Module["_cmd_take_screenshot"] = function () {
    return (_cmd_take_screenshot = Module["_cmd_take_screenshot"] = Module["asm"]["ci"]).apply(null, arguments)
};
var _cmd_toggle_menu = Module["_cmd_toggle_menu"] = function () {
    return (_cmd_toggle_menu = Module["_cmd_toggle_menu"] = Module["asm"]["di"]).apply(null, arguments)
};
var _cmd_reload_config = Module["_cmd_reload_config"] = function () {
    return (_cmd_reload_config = Module["_cmd_reload_config"] = Module["asm"]["ei"]).apply(null, arguments)
};
var _cmd_toggle_grab_mouse = Module["_cmd_toggle_grab_mouse"] = function () {
    return (_cmd_toggle_grab_mouse = Module["_cmd_toggle_grab_mouse"] = Module["asm"]["fi"]).apply(null, arguments)
};
var _cmd_toggle_game_focus = Module["_cmd_toggle_game_focus"] = function () {
    return (_cmd_toggle_game_focus = Module["_cmd_toggle_game_focus"] = Module["asm"]["gi"]).apply(null, arguments)
};
var _cmd_reset = Module["_cmd_reset"] = function () {
    return (_cmd_reset = Module["_cmd_reset"] = Module["asm"]["hi"]).apply(null, arguments)
};
var _cmd_toggle_pause = Module["_cmd_toggle_pause"] = function () {
    return (_cmd_toggle_pause = Module["_cmd_toggle_pause"] = Module["asm"]["ii"]).apply(null, arguments)
};
var _cmd_pause = Module["_cmd_pause"] = function () {
    return (_cmd_pause = Module["_cmd_pause"] = Module["asm"]["ji"]).apply(null, arguments)
};
var _cmd_unpause = Module["_cmd_unpause"] = function () {
    return (_cmd_unpause = Module["_cmd_unpause"] = Module["asm"]["ki"]).apply(null, arguments)
};
var _cmd_set_volume = Module["_cmd_set_volume"] = function () {
    return (_cmd_set_volume = Module["_cmd_set_volume"] = Module["asm"]["li"]).apply(null, arguments)
};
var _cmd_set_shader = Module["_cmd_set_shader"] = function () {
    return (_cmd_set_shader = Module["_cmd_set_shader"] = Module["asm"]["mi"]).apply(null, arguments)
};
var _cmd_cheat_set_code = Module["_cmd_cheat_set_code"] = function () {
    return (_cmd_cheat_set_code = Module["_cmd_cheat_set_code"] = Module["asm"]["ni"]).apply(null, arguments)
};
var _cmd_cheat_get_code = Module["_cmd_cheat_get_code"] = function () {
    return (_cmd_cheat_get_code = Module["_cmd_cheat_get_code"] = Module["asm"]["oi"]).apply(null, arguments)
};
var _cmd_cheat_toggle_index = Module["_cmd_cheat_toggle_index"] = function () {
    return (_cmd_cheat_toggle_index = Module["_cmd_cheat_toggle_index"] = Module["asm"]["pi"]).apply(null, arguments)
};
var _cmd_cheat_get_code_state = Module["_cmd_cheat_get_code_state"] = function () {
    return (_cmd_cheat_get_code_state = Module["_cmd_cheat_get_code_state"] = Module["asm"]["qi"]).apply(null, arguments)
};
var _cmd_cheat_realloc = Module["_cmd_cheat_realloc"] = function () {
    return (_cmd_cheat_realloc = Module["_cmd_cheat_realloc"] = Module["asm"]["ri"]).apply(null, arguments)
};
var _cmd_cheat_get_size = Module["_cmd_cheat_get_size"] = function () {
    return (_cmd_cheat_get_size = Module["_cmd_cheat_get_size"] = Module["asm"]["si"]).apply(null, arguments)
};
var _cmd_cheat_apply_cheats = Module["_cmd_cheat_apply_cheats"] = function () {
    return (_cmd_cheat_apply_cheats = Module["_cmd_cheat_apply_cheats"] = Module["asm"]["ti"]).apply(null, arguments)
};
var _main = Module["_main"] = function () {
    return (_main = Module["_main"] = Module["asm"]["ui"]).apply(null, arguments)
};
var __get_tzname = Module["__get_tzname"] = function () {
    return (__get_tzname = Module["__get_tzname"] = Module["asm"]["vi"]).apply(null, arguments)
};
var __get_daylight = Module["__get_daylight"] = function () {
    return (__get_daylight = Module["__get_daylight"] = Module["asm"]["wi"]).apply(null, arguments)
};
var __get_timezone = Module["__get_timezone"] = function () {
    return (__get_timezone = Module["__get_timezone"] = Module["asm"]["xi"]).apply(null, arguments)
};
var stackSave = Module["stackSave"] = function () {
    return (stackSave = Module["stackSave"] = Module["asm"]["yi"]).apply(null, arguments)
};
var stackRestore = Module["stackRestore"] = function () {
    return (stackRestore = Module["stackRestore"] = Module["asm"]["zi"]).apply(null, arguments)
};
var stackAlloc = Module["stackAlloc"] = function () {
    return (stackAlloc = Module["stackAlloc"] = Module["asm"]["Ai"]).apply(null, arguments)
};
var _setThrew = Module["_setThrew"] = function () {
    return (_setThrew = Module["_setThrew"] = Module["asm"]["Bi"]).apply(null, arguments)
};
var dynCall_j = Module["dynCall_j"] = function () {
    return (dynCall_j = Module["dynCall_j"] = Module["asm"]["Ci"]).apply(null, arguments)
};

function invoke_ii(index, a1) {
    var sp = stackSave();
    try {
        return wasmTable.get(index)(a1)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}

function invoke_vii(index, a1, a2) {
    var sp = stackSave();
    try {
        wasmTable.get(index)(a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        return wasmTable.get(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
        return wasmTable.get(index)(a1, a2, a3, a4, a5)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}

function invoke_vi(index, a1) {
    var sp = stackSave();
    try {
        wasmTable.get(index)(a1)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}

function invoke_v(index) {
    var sp = stackSave();
    try {
        wasmTable.get(index)()
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}

function invoke_iii(index, a1, a2) {
    var sp = stackSave();
    try {
        return wasmTable.get(index)(a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}

function invoke_i(index) {
    var sp = stackSave();
    try {
        return wasmTable.get(index)()
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}

function invoke_viii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        wasmTable.get(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}

function invoke_j(index) {
    var sp = stackSave();
    try {
        return dynCall_j(index)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0 && e !== "longjmp") throw e;
        _setThrew(1, 0)
    }
}
Module["callMain"] = callMain;
Module["FS"] = FS;
var calledRun;

function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
}
var calledMain = false;
dependenciesFulfilled = function runCaller() {
    if (!calledRun) run();
    if (!calledRun) dependenciesFulfilled = runCaller
};

function callMain(args) {
    var entryFunction = Module["_main"];
    args = args || [];
    var argc = args.length + 1;
    var argv = stackAlloc((argc + 1) * 4);
    HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram);
    for (var i = 1; i < argc; i++) {
        HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1])
    }
    HEAP32[(argv >> 2) + argc] = 0;
    try {
        var ret = entryFunction(argc, argv);
        exit(ret, true)
    } catch (e) {
        if (e instanceof ExitStatus) {
            return
        } else if (e == "unwind") {
            noExitRuntime = true;
            return
        } else {
            var toLog = e;
            if (e && typeof e === "object" && e.stack) {
                toLog = [e, e.stack]
            }
            err("exception thrown: " + toLog);
            quit_(1, e)
        }
    } finally {
        calledMain = true
    }
}

function run(args) {
    args = args || arguments_;
    if (runDependencies > 0) {
        return
    }
    preRun();
    if (runDependencies > 0) {
        return
    }

    function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
        if (shouldRunNow) callMain(args);
        postRun()
    }
    if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(function () {
            setTimeout(function () {
                Module["setStatus"]("")
            }, 1);
            doRun()
        }, 1)
    } else {
        doRun()
    }
}
Module["run"] = run;

function exit(status, implicit) {
    if (implicit && noExitRuntime && status === 0) {
        return
    }
    if (noExitRuntime) {} else {
        EXITSTATUS = status;
        exitRuntime();
        if (Module["onExit"]) Module["onExit"](status);
        ABORT = true
    }
    quit_(status, new ExitStatus(status))
}
if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
        Module["preInit"].pop()()
    }
}
var shouldRunNow = true;
if (Module["noInitialRun"]) shouldRunNow = false;
run();