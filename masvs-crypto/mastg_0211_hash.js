if (ObjC.available) {
    console.log("[*] 正在載入 MASTG-0211 弱雜湊演算法檢測腳本 (MD5 / SHA-1)...");

    // 我們要監控的不安全雜湊函數清單
    var insecureHashes = ["CC_MD5", "CC_SHA1"];

    insecureHashes.forEach(function (funcName) {
        // 在 iOS 中，這些函數通常位於 libcommonCrypto.dylib 裡
        var funcPtr = Module.findExportByName(null, funcName);

        if (funcPtr) {
            Interceptor.attach(funcPtr, {
                onEnter: function (args) {
                    // CC_MD5 / CC_SHA1 的參數定義:
                    // args[0] = const void *data (要被 Hash 的原始資料指標)
                    // args[1] = CC_LONG len (資料的長度)
                    // args[2] = unsigned char *md (輸出 Hash 值的緩衝區)
                    
                    var dataPtr = args[0];
                    var dataLen = args[1].toInt32();
                    
                    console.warn("\n[!] 偵測到呼叫不安全的雜湊演算法 -> " + funcName);
                    console.log("    => 輸入資料長度: " + dataLen + " bytes");

                    if (dataLen > 0) {
                        try {
                            // 嘗試將記憶體中的資料轉換為人類可讀的字串 (UTF-8)
                            var rawString = dataPtr.readUtf8String(dataLen);
                            
                            // 為了避免印出過長的無意義亂碼，我們做個簡單的過濾
                            // 如果真的是有意義的字串，通常會包含英數字
                            if (/^[a-zA-Z0-9\-_@\.\s]+$/.test(rawString)) {
                                console.log("    => 原始明文內容: " + rawString);
                            } else {
                                console.log("    => 原始內容可能為二進制資料或無法完美解析為純文字。");
                            }
                        } catch (e) {
                            // 如果讀取 UTF-8 失敗（代表它是純二進制資料，如圖片或檔案），則印出 Hex Dump (十六進制)
                            console.log("    => 原始資料 (Hex Dump，僅顯示前 48 bytes):");
                            console.log(hexdump(dataPtr, { length: Math.min(dataLen, 48), header: false, ansi: false }));
                        }
                    }
                }
            });
        } else {
            console.log("[-] 找不到函數: " + funcName);
        }
    });

} else {
    console.log("[-] Objective-C Runtime 無法使用。");
}
