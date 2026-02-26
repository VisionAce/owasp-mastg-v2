if (ObjC.available) {
    console.log("[*] Starting Hook for NSURLIsExcludedFromBackupKey...");

    var NSURL = ObjC.classes.NSURL;
    var targetMethod = NSURL["- setResourceValue:forKey:error:"];

    if (targetMethod) {
        Interceptor.attach(targetMethod.implementation, {
            onEnter: function(args) {
                // Objective-C 的方法參數從 args[2] 開始
                // args[0] = self (NSURL 物件)
                // args[1] = _cmd (選擇器/方法名稱)
                // args[2] = value (要設定的值，通常是 @YES)
                // args[3] = key (屬性名稱，我們關注的是 NSURLIsExcludedFromBackupKey)
                
                var keyObj = new ObjC.Object(args[3]);
                
                // 檢查 Key 是否為我們要找的目標
                if (keyObj !== null && keyObj.toString() === "NSURLIsExcludedFromBackupKey") {
                    var urlObj = new ObjC.Object(args[0]);
                    var valObj = new ObjC.Object(args[2]);
                    
                    console.log("\n[+] 偵測到排除備份設定 (Excluded From Backup)!");
                    console.log("    -> 目標檔案路徑: " + urlObj.toString());
                    console.log("    -> 設定的值: " + valObj.toString());
                    
                    // 這裡可以幫助你追蹤是誰呼叫了這個方法
                    // console.log("    -> 呼叫堆疊:\n" + Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join("\n"));
                }
            }
        });
    } else {
        console.log("[-] 找不到目標方法。");
    }
} else {
    console.log("[-] Objective-C Runtime 無法使用。");
}
