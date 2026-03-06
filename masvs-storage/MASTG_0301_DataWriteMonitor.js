if (ObjC.available) {
    console.log("[*] MASTG-TEST-0301: 啟動敏感資料寫入 API 動態監聽...\n");

    // ==========================================
    // 1. 監聽 NSUserDefaults 的寫入
    // ==========================================
    var nsUserDefaults = ObjC.classes.NSUserDefaults;
    if (nsUserDefaults) {
        Interceptor.attach(nsUserDefaults["- setObject:forKey:"].implementation, {
            onEnter: function(args) {
                var valueObj = new ObjC.Object(args[2]);
                var keyObj = new ObjC.Object(args[3]);
                var keyStr = keyObj.toString();
                
                // 過濾掉系統預設的無關 Key，只關注可能與業務有關的
                if (keyStr.indexOf("WebKit") === -1 && keyStr.indexOf("Apple") === -1) {
                    console.log("⚠️ [UserDefaults 寫入攔截]");
                    console.log("   🔑 Key  : " + keyStr);
                    console.log("   📦 Value: " + (valueObj ? valueObj.toString() : "null"));
                    console.log("----------------------------------------");
                }
            }
        });
    }

    // ==========================================
    // 2. 監聽 NSString 直接寫入檔案
    // ==========================================
    var nsString = ObjC.classes.NSString;
    if (nsString) {
        Interceptor.attach(nsString["- writeToFile:atomically:encoding:error:"].implementation, {
            onEnter: function(args) {
                var content = new ObjC.Object(args[0]).toString(); // 要寫入的字串內容
                var path = new ObjC.Object(args[2]).toString();    // 目標路徑
                
                console.log("🚨 [NSString 寫入檔案攔截]");
                console.log("   📂 路徑: " + path);
                console.log("   📝 內容: " + content.substring(0, 100) + " ... (擷取前100字元)");
                console.log("----------------------------------------");
            }
        });
    }

    // ==========================================
    // 3. 監聽 Keychain (SecItemAdd) 寫入
    // ==========================================
    var secItemAdd = Module.findExportByName("Security", "SecItemAdd");
    if (secItemAdd) {
        Interceptor.attach(secItemAdd, {
            onEnter: function(args) {
                console.log("🔐 [Keychain (SecItemAdd) 寫入攔截]");
                
                // 第一個參數 args[0] 是 CFDictionary 包含寫入的屬性與資料
                var dict = new ObjC.Object(args[0]);
                console.log("   📦 寫入字典內容:\n" + dict.toString());
                console.log("----------------------------------------");
            }
        });
    }

} else {
    console.log("[-] Objective-C Runtime 尚未準備好。");
}
