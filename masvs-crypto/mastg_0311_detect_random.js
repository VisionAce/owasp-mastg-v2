// 1. 擴大目標範圍：找出 App 主程式與其自帶的所有 Framework
const targetModules = [];
Process.enumerateModules().forEach(function(module) {
    // 只要路徑中包含 ".app/"，就代表是這個 App 自己打包的程式碼
    if (module.path.indexOf(".app/") !== -1) {
        targetModules.push(module.name);
    }
});
console.log(`[i] 監聽範圍已擴大至 ${targetModules.length} 個模組 (包含主程式與內建 Frameworks)`);

// 2. 定義不安全與安全的 API 清單
const insecureApis = [
    "rand", "srand", "random", "srandom",
    "drand48", "erand48", "lrand48", "nrand48",
    "mrand48", "jrand48", "srand48", "seed48", "lcong48"
];

const secureApis = [
    "SecRandomCopyBytes",
    "CCRandomGenerateBytes"
];

let callCount = 0;
const MAX_LOGS = 100; // 稍微調高日誌上限

// 3. 共用的 Hook 邏輯
function hookRandomAPI(apiName, isSecure) {
    // 使用 null 代表在所有系統函式庫中尋找該函數
    const ptr = Module.findExportByName(null, apiName);

    if (ptr) {
        Interceptor.attach(ptr, {
            onEnter: function(args) {
                if (callCount > MAX_LOGS) return;

                const backtrace = Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress);
                
                // 檢查呼叫來源是否在我們的「目標模組清單」內
                const isFromApp = backtrace.some(symbol => targetModules.includes(symbol.moduleName));
                
                if (isFromApp) {
                    callCount++;
                    const statusIcon = isSecure ? "[安全]" : "[不安全]";
                    console.warn(`\n${statusIcon} 偵測到隨機數 API 呼叫 -> ${apiName}()`);
                    
                    console.log("[-] 呼叫堆疊 (Call Stack):");
                    backtrace.forEach(symbol => {
                        const highlight = targetModules.includes(symbol.moduleName) ? "👉 " : "   ";
                        console.log(`${highlight}${symbol.toString()}`);
                    });
                    
                    if (callCount === MAX_LOGS) {
                        console.warn(`\n[i] 達到最大日誌數量 (${MAX_LOGS})，已暫停輸出以保護效能。`);
                    }
                }
            }
        });
        console.log(`[+] 成功掛鉤: ${apiName} (${isSecure ? '安全' : '不安全'})`);
    } else {
        console.log(`[-] 找不到函數: ${apiName}`);
    }
}

// 4. 執行 Hook
console.log("\n[i] --- 開始掛鉤不安全 API ---");
insecureApis.forEach(api => hookRandomAPI(api, false));

console.log("\n[i] --- 開始掛鉤安全 API ---");
secureApis.forEach(api => hookRandomAPI(api, true));
