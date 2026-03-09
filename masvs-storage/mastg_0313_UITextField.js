if (ObjC.available) {
    console.log("[*] 正在啟動 MASTG-TEST-0313 動態檢測腳本...");
    console.log("[*] 監控 UITextField 的安全與快取相關屬性設定...\n");

    var UITextField = ObjC.classes.UITextField;

    // 輔助函數：取得輸入框的 Placeholder 或當前文字，方便辨識是哪一個輸入框
    function getTextFieldInfo(textFieldPtr) {
        try {
            var tf = new ObjC.Object(textFieldPtr);
            var placeholder = tf.placeholder() ? tf.placeholder().toString() : "無 Placeholder";
            var text = tf.text() ? tf.text().toString() : "空";
            return "元件特徵 -> [提示字: '" + placeholder + "', 當前輸入: '" + text + "']";
        } catch (e) {
            return "無法解析元件特徵";
        }
    }

    // 1. Hook 密碼隱藏屬性 (setSecureTextEntry:)
    var secureTextEntrySel = UITextField["- setSecureTextEntry:"];
    if (secureTextEntrySel) {
        Interceptor.attach(secureTextEntrySel.implementation, {
            onEnter: function(args) {
                // args[0] 是 self (物件實例), args[1] 是 selector, args[2] 是第一個參數
                var isSecure = args[2].toInt32() === 1;
                var info = getTextFieldInfo(args[0]);
                var status = isSecure ? "✅ 已啟用密碼隱藏" : "未隱藏密碼";
                console.log("[SecureTextEntry] 設為: " + isSecure + " | " + status);
                console.log("    " + info + "\n");
            }
        });
    }

    // 2. Hook 自動校正屬性 (setAutocorrectionType:)
    // UITextAutocorrectionType: 1 = Default, 2 = No, 3 = Yes
    var autoCorSel = UITextField["- setAutocorrectionType:"];
    if (autoCorSel) {
        Interceptor.attach(autoCorSel.implementation, {
            onEnter: function(args) {
                var type = args[2].toInt32();
                var typeStr = (type === 2) ? "NO (停用)" : (type === 3 ? "YES (啟用)" : "Default (預設)");
                var info = getTextFieldInfo(args[0]);
                var status = (type === 2) ? "✅ 安全 (停用自動校正)" : "❌ 危險 (允許自動校正/快取)";
                console.log("[AutocorrectionType] 設為: " + typeStr + " (" + type + ") | " + status);
                console.log("    " + info + "\n");
            }
        });
    }

    // 3. Hook 拼字檢查屬性 (setSpellCheckingType:)
    // UITextSpellCheckingType: 1 = Default, 2 = No, 3 = Yes
    var spellCheckSel = UITextField["- setSpellCheckingType:"];
    if (spellCheckSel) {
        Interceptor.attach(spellCheckSel.implementation, {
            onEnter: function(args) {
                var type = args[2].toInt32();
                var typeStr = (type === 2) ? "NO (停用)" : (type === 3 ? "YES (啟用)" : "Default (預設)");
                var info = getTextFieldInfo(args[0]);
                console.log("[SpellCheckingType] 設為: " + typeStr + " (" + type + ")");
                console.log("    " + info + "\n");
            }
        });
    }
} else {
    console.log("[-] 找不到 Objective-C Runtime，此腳本僅適用於 iOS 原生層。");
}
