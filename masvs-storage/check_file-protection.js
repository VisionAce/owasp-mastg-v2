if (ObjC.available) {
    console.log("\n[*] 啟動全面掃描：檢查 Library 目錄及其子目錄的防護等級...\n");
    console.log("[*] 正在掃描，請稍候...\n");
    
    var NSFileManager = ObjC.classes.NSFileManager.defaultManager();
    var NSString = ObjC.classes.NSString;

    var homePathStr = ObjC.classes.NSProcessInfo.processInfo().environment().objectForKey_("HOME").toString();
    var libraryPathStr = homePathStr + "/Library";
    
    var libraryPathObj = NSString.stringWithString_(libraryPathStr);
    var enumerator = NSFileManager.enumeratorAtPath_(libraryPathObj);
    
    // 用來分類儲存結果的物件
    var reportData = {
        "NSFileProtectionComplete (最高防護)": [],
        "NSFileProtectionCompleteUnlessOpen (背景寫入防護)": [],
        "NSFileProtectionCompleteUntilFirstUserAuthentication (系統預設防護)": [],
        "NSFileProtectionNone (無防護)": [],
        "未明確設定 (系統預設)": [],
        "無法讀取屬性": []
    };
    
    var fileCount = 0;

    if (enumerator !== null) {
        var fileNameObj;
        
        while ((fileNameObj = enumerator.nextObject()) !== null) {
            var fileNameStr = fileNameObj.toString();
            var fullPathStr = libraryPathStr + "/" + fileNameStr;
            var fullPathObj = NSString.stringWithString_(fullPathStr);

            var attrErrPtr = Memory.alloc(Process.pointerSize);
            Memory.writePointer(attrErrPtr, NULL);
            
            var attributes = NSFileManager.attributesOfItemAtPath_error_(fullPathObj, attrErrPtr);
            
            if (attributes !== null) {
                var fileType = attributes.objectForKey_("NSFileType");
                if (fileType !== null && fileType.toString().indexOf("NSFileTypeDirectory") === -1) {
                    fileCount++;
                    
                    var protectionClass = attributes.objectForKey_("NSFileProtectionKey");
                    var category = "";
                    
                    if (protectionClass) {
                        var pStr = protectionClass.toString();
                        if (pStr.indexOf("NSFileProtectionComplete") !== -1 && pStr.indexOf("Unless") === -1 && pStr.indexOf("Until") === -1) {
                            category = "NSFileProtectionComplete (最高防護)";
                        } else if (pStr.indexOf("NSFileProtectionCompleteUnlessOpen") !== -1) {
                            category = "NSFileProtectionCompleteUnlessOpen (背景寫入防護)";
                        } else if (pStr.indexOf("NSFileProtectionCompleteUntilFirstUserAuthentication") !== -1) {
                            category = "NSFileProtectionCompleteUntilFirstUserAuthentication (系統預設防護)";
                        } else if (pStr.indexOf("NSFileProtectionNone") !== -1) {
                            category = "NSFileProtectionNone (無防護)";
                        } else {
                            category = pStr; // 處理未來可能新增的其他類型
                        }
                    } else {
                        category = "未明確設定 (系統預設)";
                    }
                    
                    // 將檔案路徑加入對應的分類陣列中
                    if (!reportData[category]) {
                        reportData[category] = [];
                    }
                    reportData[category].push(fileNameStr);
                }
            } else {
                reportData["無法讀取屬性"].push(fileNameStr);
            }
        }
        
        // ==========================================
        // 產生統整報告
        // ==========================================
        console.log("==================================================");
        console.log("📊 MASTG-TEST-0299 資料保護層級統整報告");
        console.log("==================================================");
        console.log("總計掃描檔案數: " + fileCount + "\n");
        
        // 依照防護等級的順序印出 (從最高防護到無防護)
        var categoriesToPrint = [
            "NSFileProtectionComplete (最高防護)",
            "NSFileProtectionCompleteUnlessOpen (背景寫入防護)",
            "NSFileProtectionCompleteUntilFirstUserAuthentication (系統預設防護)",
            "未明確設定 (系統預設)",
            "NSFileProtectionNone (無防護)",
            "無法讀取屬性"
        ];
        
        categoriesToPrint.forEach(function(cat) {
            var files = reportData[cat] || [];
            if (files.length > 0) {
                var icon = "📄";
                if (cat.indexOf("最高防護") !== -1) icon = "✅";
                if (cat.indexOf("無防護") !== -1) icon = "❌";
                
                console.log(icon + " 【" + cat + "】 (" + files.length + " 個檔案):");
                files.forEach(function(f) {
                    console.log("    - " + f);
                });
                console.log("\n--------------------------------------------------");
            }
        });
        
    } else {
        console.log("[-] 無法讀取 Library 目錄。");
    }
} else {
    console.log("[-] 錯誤：Objective-C Runtime 尚未準備好。");
}
