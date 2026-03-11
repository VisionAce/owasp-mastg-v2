if (ObjC.available) {
    console.log("\n[+] iLEO 綜合安全檢測腳本已啟動...");

    // 建立保護層級對照表 (針對 MASTG-TEST-0263)
    var accessibilityDesc = {
        "ak": "kSecAttrAccessibleWhenUnlocked (解鎖後可用/可同步)",
        "ck": "kSecAttrAccessibleAfterFirstUnlock (首次解鎖後可用/可同步)",
        "akpu": "kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly (✅ 必須設密碼/不可同步/最高安全)",
        "cku": "kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly (✅ 首次解鎖後可用/不可同步)",
        "dk": "kSecAttrAccessibleWhenUnlockedThisDeviceOnly (✅ 解鎖後可用/不可同步)"
    };

    // === 1. 監控 LAContext (Event-Bound 偵測) ===
    var LAContext = ObjC.classes.LAContext;
    if (LAContext) {
        Interceptor.attach(LAContext["- evaluatePolicy:localizedReason:reply:"].implementation, {
            onEnter: function(args) {
                var policy = args[2].toInt32(); // 1: biometrics, 2: passcode
                var reason = new ObjC.Object(args[3]).toString();
                console.log("\n[!] 觸發 LAContext 驗證 (Event-Bound)\n    使用LAContext.evaluatePolicy");
                console.log("    策略類型: " + (policy === 1 ? "生物辨識" : "設備密碼"));
                console.log("    提示文字: " + reason);
            }
        });
    }

    // === 2. 監控 SecAccessControlCreateWithFlags (核心：策略建立) ===
    var SecAccessControlCreateWithFlags = Module.findExportByName(null, "SecAccessControlCreateWithFlags");
    if (SecAccessControlCreateWithFlags) {
        Interceptor.attach(SecAccessControlCreateWithFlags, {
            onEnter: function(args) {
                // 將位址轉為可讀字串 (解決 0x1ef0d60a8 的問題)
                var protectionObj = new ObjC.Object(args[1]);
                var protectionStr = protectionObj.toString();
                var flags = args[2].toInt32();
                
                console.log("\n" + "=".repeat(30));
                console.log("[★] 建立 Keychain 存取控制政策 (SecAccessControl)");
                
                // 顯示直接解讀的保護層級
                var readableProtection = accessibilityDesc[protectionStr] || protectionStr;
                console.log("[✔] 保護層級 (Accessible): " + readableProtection);
                
                console.log("[✔] Flag 數值: " + flags);
                
                // 解析 Flags
                var flagDesc = [];
                if (flags & 1) flagDesc.push("UserPresence");
                if (flags & 2) flagDesc.push("BiometryAny");
                if (flags & 4) flagDesc.push("BiometryCurrentSet");
                if (flags & 8) flagDesc.push("DevicePasscode");
                console.log("[✔] 解析旗標: " + flagDesc.join(" | "));
                console.log("=".repeat(30));
            }
        });
    }

    // === 3. 監控 SecItemAdd (驗證策略應用) ===
    var SecItemAdd = Module.findExportByName(null, "SecItemAdd");
    Interceptor.attach(SecItemAdd, {
        onEnter: function(args) {
            var params = new ObjC.Object(args[0]);
            var desc = params.toString();
            
            // 檢查是否有 accc (Access Control)
            if (desc.indexOf("accc") !== -1) {
                console.log("\n[✔] 資料寫入：已綁定上述存取控制政策");
                console.log("    標籤 (labl): " + params.objectForKey_("labl"));
            }
            
            // 額外檢查 MASTG-TEST-0263 (pdmn)
            var pdmn = params.objectForKey_("pdmn");
            if (pdmn) {
                var pdmnStr = pdmn.toString();
                console.log("[✔] 資料保護等級 (pdmn): " + (accessibilityDesc[pdmnStr] || pdmnStr));
            }
        }
    });
}
