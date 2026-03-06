/**
 * OWASP MASTG-TEST-0298: Runtime Monitoring of Files Eligible for Backup
 * 目的：監控所有寫入 App 沙盒內，且符合 iOS 備份資格的檔案路徑。
 */

if (ObjC.available) {
    console.log("[*] ========================================================");
    console.log("[*] MASTG-TEST-0298: 啟動具備份資格檔案之動態監控");
    console.log("[*] 攔截範圍：open, openat, fopen, NSFileManager, NSData, NSString");
    console.log("[*] ========================================================\n");

    // =====================================================================
    // 核心過濾邏輯：判斷路徑是否在沙盒內，且不屬於 tmp/ 或 Library/Caches/
    // =====================================================================
    function checkAndLogBackupEligibleFile(filePath, sourceAPI) {
        if (!filePath) return;
        
        // 將路徑轉為字串並統一格式
        var pathStr = filePath.toString();

        // 條件 1：必須在 App 沙盒目錄內 (Data/Application)
        if (pathStr.indexOf("/Application/") !== -1 || pathStr.indexOf("/Containers/Data/") !== -1) {
            
            // 條件 2：排除 iOS 預設【不會】備份的目錄
            if (pathStr.indexOf("/tmp/") === -1 && pathStr.indexOf("/Library/Caches/") === -1) {
                
                console.log("\n[!]  發現符合備份資格的檔案寫入！");
                console.log("    📂 路徑: " + pathStr);
                console.log("    🛠️ 來源 API: " + sourceAPI);
                
                // (進階稽核) 若需要追蹤是哪段程式碼寫入的，可取消註解下方這行印出 Call Stack：
                // console.log("    🔍 呼叫堆疊:\n" + Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join("\n"));
            }
        }
    }

    // =====================================================================
    // 第一層：底層 POSIX / C 標準 API (涵蓋 SQLite, 系統底層寫入)
    // =====================================================================
    
    // 1. 攔截 open
    var openPtr = Module.findExportByName(null, "open");
    if (openPtr) {
        Interceptor.attach(openPtr, {
            onEnter: function(args) {
                var path = Memory.readUtf8String(args[0]);
                var flags = args[1].toInt32();
                // 檢查是否包含寫入權限：O_WRONLY (1), O_RDWR (2), O_CREAT (0x0200), O_APPEND (0x0008)
                var isWrite = (flags & 1) !== 0 || (flags & 2) !== 0 || (flags & 0x0200) !== 0 || (flags & 0x0008) !== 0;
                if (isWrite) checkAndLogBackupEligibleFile(path, "POSIX open()");
            }
        });
    }

    // 2. 攔截 openat (iOS 最常用的底層呼叫)
    var openatPtr = Module.findExportByName(null, "openat");
    if (openatPtr) {
        Interceptor.attach(openatPtr, {
            onEnter: function(args) {
                var path = Memory.readUtf8String(args[1]); // openat 路徑在第二個參數
                var flags = args[2].toInt32();
                var isWrite = (flags & 1) !== 0 || (flags & 2) !== 0 || (flags & 0x0200) !== 0 || (flags & 0x0008) !== 0;
                if (isWrite) checkAndLogBackupEligibleFile(path, "POSIX openat()");
            }
        });
    }

    // 3. 攔截 fopen (C 標準函式庫)
    var fopenPtr = Module.findExportByName(null, "fopen");
    if (fopenPtr) {
        Interceptor.attach(fopenPtr, {
            onEnter: function(args) {
                var path = Memory.readUtf8String(args[0]);
                var mode = Memory.readUtf8String(args[1]);
                // 模式包含 w (write), a (append), 或 + (update) 視為寫入
                if (mode && (mode.indexOf('w') !== -1 || mode.indexOf('a') !== -1 || mode.indexOf('+') !== -1)) {
                    checkAndLogBackupEligibleFile(path, "C Lib fopen()");
                }
            }
        });
    }

    // =====================================================================
    // 第二層：高階 Objective-C Foundation API (涵蓋開發者常規開發行為)
    // =====================================================================

    // 4. 攔截 NSFileManager (建立檔案)
    var nsFileManager = ObjC.classes.NSFileManager;
    if (nsFileManager && nsFileManager["- createFileAtPath:contents:attributes:"]) {
        Interceptor.attach(nsFileManager["- createFileAtPath:contents:attributes:"].implementation, {
            onEnter: function(args) {
                var pathObj = new ObjC.Object(args[2]); // args[2] 是 NSString
                checkAndLogBackupEligibleFile(pathObj.toString(), "NSFileManager createFileAtPath:");
            }
        });
    }

    // 5. 攔截 NSData (二進位資料存檔)
    var nsDataWrite1 = ObjC.classes.NSData["- writeToFile:atomically:"];
    if (nsDataWrite1) {
        Interceptor.attach(nsDataWrite1.implementation, {
            onEnter: function(args) {
                var pathObj = new ObjC.Object(args[2]);
                checkAndLogBackupEligibleFile(pathObj.toString(), "NSData writeToFile:atomically:");
            }
        });
    }

    var nsDataWriteURL = ObjC.classes.NSData["- writeToURL:atomically:"];
    if (nsDataWriteURL) {
        Interceptor.attach(nsDataWriteURL.implementation, {
            onEnter: function(args) {
                var urlObj = new ObjC.Object(args[2]); // 這裡是 NSURL
                checkAndLogBackupEligibleFile(urlObj.path().toString(), "NSData writeToURL:atomically:");
            }
        });
    }

    // 6. 攔截 NSString (純文字存檔)
    var nsStringWrite = ObjC.classes.NSString["- writeToFile:atomically:encoding:error:"];
    if (nsStringWrite) {
        Interceptor.attach(nsStringWrite.implementation, {
            onEnter: function(args) {
                var pathObj = new ObjC.Object(args[2]);
                checkAndLogBackupEligibleFile(pathObj.toString(), "NSString writeToFile:atomically:encoding:error:");
            }
        });
    }

} else {
    console.log("[-] 錯誤：Objective-C Runtime 尚未準備好或無法使用。");
}
