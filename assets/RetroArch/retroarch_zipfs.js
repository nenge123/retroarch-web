(function(){
    let T = this;
    this.action['upload-zip-fs'] = ()=>{
        T.runaction('upload',[file=>{
            T.addJS(file);
            T.setItem('data-libjs','myzipfs',file);
            T.$('.test-result').innerHTML ='zip-fs is save and load!';
        }]);
    };
    this.action['reset-cores'] = async ()=>{
        let result = await Promise.all(['myzipfs',"cores-vba_next_libretro","cores-mgba_libretro"].map(async key=>await T.removeItem('data-libjs',key)));
        console.log(result);
        T.$('.test-result').innerHTML = result.join('<br>');
        //location.reload();
    };
    T.docload(async () => {
        let data = await T.getContent('data-libjs', 'myzipfs');
        if(data)await T.addJS(data);
        Object.defineProperty(T.unitl,'unZip',{value:async function (u8, ARG = {}) {
            let {
                process,
                password,
                packtext
            } = ARG, F = this, T = F.T;
            await F.ZipInitJS();
            let zipFs = new zip.fs.FS(),
                contents = {};
            await zipFs['importBlob'](u8 instanceof Blob ? u8 : new Blob([u8]), {
                'filenameEncoding': T.Encoding
            });
            await Promise.all(
                zipFs.entries.map(async entry => {
                    let data = entry.data;
                    if (!data || data.directory) return;
                    let opt = {
                        'onprogress': (a, b) => process && process(packtext + entry.name + ':' + Math.ceil(a * 100 / b) + '%')
                    };
                    contents[data.filename] = await entry.getUint8Array(opt);
                    return true;
                }));
            delete F.ZipPassword;
            return contents;
        }});
        if(!window.zip) T.$('.test-result').innerHTML ='you must upload a zip-fs.js!';
        else T.$('.test-result').innerHTML ='load ready! you can test!';
    
    });

}).call(Nenge)