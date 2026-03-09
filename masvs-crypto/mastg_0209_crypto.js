if (ObjC.available) {
    console.log("[*] 正在載入 MASTG-0209 終極檢測腳本 (涵蓋對稱與非對稱加密)...");

    // ==========================================
    // 1. 攔截對稱加密 (CCCrypt)
    // ==========================================
    var algorithms = { 0: "AES", 1: "DES", 2: "3DES", 3: "CAST", 4: "RC4", 5: "RC2", 11: "Blowfish" };
    var operations = { 0: "Encrypt (加密)", 1: "Decrypt (解密)" };

    var CCCryptPtr = Module.findExportByName(null, "CCCrypt");
    if (CCCryptPtr) {
        Interceptor.attach(CCCryptPtr, {
            onEnter: function (args) {
                var op = args[0].toInt32();
                var alg = args[1].toInt32();
                var keyLength = args[4].toInt32();
                
                var algName = algorithms[alg] || ("Unknown (" + alg + ")");
                var opName = operations[op] || ("Unknown (" + op + ")");

                console.log("\n[+] 偵測到對稱加密 (CCCrypt):");
                console.log("    => 操作: " + opName + " | 演算法: " + algName + " | 金鑰長度: " + (keyLength * 8) + "-bit");

                if (alg === 2) {
                    console.warn("    [!] Fail: 偵測到使用 3DES (已被淘汰且不安全)");
                } else if (alg === 1 || alg === 4 || alg === 5) {
                    console.warn("    [!] Fail: 偵測到使用極度不安全的演算法 (" + algName + ")");
                } else if (alg === 0 && keyLength < 16) {
                    console.warn("    [!] Fail: AES 金鑰長度小於 128-bit，長度不足");
                }
            }
        });
    }

    // ==========================================
    // 2. 攔截非對稱加密 / 金鑰生成 (SecKeyCreateRandomKey)
    // ==========================================
    var SecKeyCreateRandomKeyPtr = Module.findExportByName("Security", "SecKeyCreateRandomKey");
    if (SecKeyCreateRandomKeyPtr) {
        Interceptor.attach(SecKeyCreateRandomKeyPtr, {
            onEnter: function (args) {
                console.log("\n[+] 偵測到非對稱金鑰生成 (SecKeyCreateRandomKey):");
                try {
                    var parameters = new ObjC.Object(args[0]);
                    var dictString = parameters.toString();
                    
                    // 簡易解析字典中的 type 和 bsiz
                    var typeMatch = dictString.match(/type\s*=\s*(\d+)/);
                    var bsizMatch = dictString.match(/bsiz\s*=\s*(\d+)/);
                    
                    if (typeMatch && bsizMatch) {
                        var typeCode = parseInt(typeMatch[1]);
                        var keySize = parseInt(bsizMatch[1]);
                        
                        var typeName = "Unknown";
                        if (typeCode === 42) typeName = "RSA";
                        else if (typeCode === 73) typeName = "ECC (橢圓曲線)";
                        
                        console.log("    => 金鑰類型: " + typeName + " (" + typeCode + ")");
                        console.log("    => 金鑰長度: " + keySize + "-bit");

                        // 針對 RSA 和 ECC 進行安全長度檢查
                        if (typeCode === 42 && keySize < 2048) {
                            console.warn("    [!] Fail: RSA 金鑰長度 (" + keySize + ") 小於 2048-bit，不安全");
                        } else if (typeCode === 73 && keySize < 224) {
                            console.warn("    [!] Fail: ECC 金鑰長度 (" + keySize + ") 小於 224-bit，不安全");
                        } else {
                            console.log("    [OK] 狀態: 金鑰長度符合當前安全標準。");
                        }
                    } else {
                        console.log("    => 原始參數:\n" + dictString);
                    }
                } catch (e) {
                    console.log("    [!] 無法解析參數字典: " + e);
                }
            }
        });
    }
}
