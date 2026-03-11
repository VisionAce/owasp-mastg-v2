if (ObjC.available) {
    console.log("\n[+] 生物辨識 綜合安全檢測腳本 (OWASP MASTG 專用版) 已啟動...");

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
                console.log("\n" + "=".repeat(15) + " [UI 邏輯偵測] " + "=".repeat(15));
                console.log("[!] 觸發 LAContext 驗證 (Event-Bound)");
                console.log("    使用LAContext.evaluatePolicy");
                console.log("    策略類型: " + (policy === 1 ? "生物辨識" : "設備密碼"));
                console.log("    提示文字: " + reason);
                console.log("=".repeat(44));
            }
        });
    }

    // === 2. 監控 SecAccessControlCreateWithFlags (核心：策略建立) ===
    var SecAccessControlCreateWithFlags = Module.findExportByName(null, "SecAccessControlCreateWithFlags");
    if (SecAccessControlCreateWithFlags) {
        Interceptor.attach(SecAccessControlCreateWithFlags, {
            onEnter: function(args) {
                var protectionObj = new ObjC.Object(args[1]);
                var protectionStr = protectionObj.toString();
                var flags = args[2].toInt32();
                
                console.log("\n" + "★".repeat(15) + " [策略建立] " + "★".repeat(15));
                console.log("[★] SecAccessControlCreateWithFlags 被呼叫");
                
                var readableProtection = accessibilityDesc[protectionStr] || protectionStr;
                console.log("[▹] 保護層級: " + readableProtection);
                console.log("[▹] Flag 數值: " + flags);
                
                // --- 修正後的 Flag 位元解析 (符合現代 iOS SDK) ---
                var flagDesc = [];
                if (flags & 1)    flagDesc.push("UserPresence (1)");
                if (flags & 2)    flagDesc.push("BiometryAny (2)");
                if (flags & 8)    flagDesc.push("BiometryCurrentSet (8)"); // ✅ 修正重點
                if (flags & 16)   flagDesc.push("DevicePasscode (16)");
                if (flags & 32)   flagDesc.push("Watch (32)");
                if (flags & 16384) flagDesc.push("Or (16384)");
                if (flags & 32768) flagDesc.push("And (32768)");
                
                console.log("[▹] 解析旗標: " + flagDesc.join(" | "));

                // --- MASTG 判定邏輯 ---
                if (flags & 8) {
                    console.log("符合最高安全：偵測到 BiometryCurrentSet (異動即失效)");
                } else if (flags & 2) {
                    console.log("僅使用 BiometryAny (無法偵測異動)");
                }

                if ((flags & 1) || (flags & 16)) {
                    console.log("允許 Fallback 至設備密碼");
                } else {
                    console.log("符合安全：強制僅限生物辨識 (無密碼回退)");
                }
                console.log("★".repeat(40));
            }
        });
    }

    // === 3. 監控 SecItemAdd (驗證策略應用) ===
    var SecItemAdd = Module.findExportByName(null, "SecItemAdd");
    Interceptor.attach(SecItemAdd, {
        onEnter: function(args) {
            var params = new ObjC.Object(args[0]);
            var desc = params.toString();
            
            if (desc.indexOf("accc") !== -1) {
                console.log("\n[▹] 資料寫入 (SecItemAdd)：已綁定存取控制政策");
                console.log("    標籤 (labl): " + params.objectForKey_("labl"));
                
                // 顯示實際寫入的 pdmn (保護等級)
                var pdmn = params.objectForKey_("pdmn");
                if (pdmn) {
                    var pdmnStr = pdmn.toString();
                    console.log("    保護等級 (pdmn): " + (accessibilityDesc[pdmnStr] || pdmnStr));
                }
                console.log("-".repeat(40));
            }
        }
    });
}
