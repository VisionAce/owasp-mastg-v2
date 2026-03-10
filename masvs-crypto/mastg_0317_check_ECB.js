if (ObjC.available) {
    var CCCryptPtr = Module.findExportByName("libcommonCrypto.dylib", "CCCrypt");

    if (CCCryptPtr) {
        Interceptor.attach(CCCryptPtr, {
            onEnter: function (args) {
                // CCCrypt 的第 3 個參數 (args[2]) 是 CCOptions
                var options = args[2].toInt32();
                
                // 使用位元 AND 運算來檢查 0x0002 (kCCOptionECBMode) 是否被設置
                var isECB = (options & 2) === 2;

                if (isECB) {
                    console.warn("[!] 警告：偵測到使用 ECB 模式加密");
                    console.log("    Options 數值: " + options);
                    
                    // 印出呼叫堆疊 (Call Stack) 以找出是哪段程式碼呼叫的
                    console.log("    呼叫堆疊:\n" + Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join('\n'));
                }
            }
        });
        console.log("[*] 已成功 Hook CCCrypt，正在監聽是否使用ECB模式加密...");
    } else {
        console.log("[-] 找不到 CCCrypt 函式。");
    }
}
