if (ObjC.available) {
    console.log("[*] 正在載入進階加密 API 攔截腳本 (包含演算法解析)...");

    // 建立 Apple CommonCrypto 的演算法對應表 (參考 CommonCryptor.h)
    var algorithms = {
        0: "AES",
        1: "DES",
        2: "3DES",
        3: "CAST",
        4: "RC4",
        5: "RC2",
        11: "Blowfish"
    };

    // 建立操作類型對應表
    var operations = {
        0: "Encrypt (加密)",
        1: "Decrypt (解密)"
    };

    var CCCryptPtr = Module.findExportByName(null, "CCCrypt");
    if (CCCryptPtr) {
        Interceptor.attach(CCCryptPtr, {
            onEnter: function (args) {
                var op = args[0].toInt32();
                var alg = args[1].toInt32();
                var keyLength = args[4].toInt32();
                
                var algName = algorithms[alg] || ("Unknown (" + alg + ")");
                var opName = operations[op] || ("Unknown (" + op + ")");

                // 只針對我們關心的長度或不安全的演算法進行重點輸出，避免畫面太亂
                console.log("\n[+] 偵測到 CCCrypt 呼叫!");
                console.log("    => 操作: " + opName);
                console.log("    => 演算法: " + algName);
                console.log("    => 金鑰長度: " + keyLength + " Bytes (" + (keyLength * 8) + "-bit)");

                // 安全性判定邏輯
                if (alg === 2) {
                    console.warn("    [!] Fail: 偵測到使用 3DES，這是已被淘汰且不安全的演算法");
                } else if (alg === 1 || alg === 4 || alg === 5) {
                    console.warn("    [!] Fail: 偵測到使用極度不安全的演算法 (" + algName + ")");
                } else if (alg === 0 && keyLength === 24) {
                    console.log("    [OK] 狀態: 這是 AES-192，符合基本的安全規範。");
                } else if (alg === 0 && keyLength < 16) {
                    console.warn("    [!] Fail: AES 金鑰長度小於 128-bit，長度不足");
                }
            }
        });
    } else {
        console.log("[-] 找不到 CCCrypt");
    }

} else {
    console.log("[-] Objective-C Runtime 無法使用。");
}
