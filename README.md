# NY DROP - P2P File Transfer

**NY DROP** 是一個基於 WebRTC 技術的點對點（P2P）檔案傳輸工具。它允許使用者在不同裝置之間用「6位數代碼」快速配對，並直接在瀏覽器端進行檔案傳輸，檔案**不經過伺服器儲存**，確保了傳輸的速度與隱私安全性。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v18-green)
![Socket.io](https://img.shields.io/badge/Socket.io-v4-black)
![WebRTC](https://img.shields.io/badge/WebRTC-Native-orange)

## 特色

* **無伺服器儲存**：檔案透過 P2P 隧道直接傳輸，保障隱私，無檔案大小限制
* **簡單配對**：捨棄複雜的 URL 分享，採用直覺的「6位數房間代碼」。
* **跨平台**：基於 Web 技術，支援電腦、手機、平板等任何現代瀏覽器。

## 技術堆疊

* **Frontend**: HTML5, CSS3, Bootstrap 5, JavaScript.
* **Backend**: Node.js, Express.
* **Real-time Communication**: Socket.io (用於信令交換 Signaling).
* **P2P Protocol**: WebRTC (RTCPeerConnection, DataChannel).
* **Database**: Redis (用於暫存房間代碼與 Socket ID 的對應關係).
* **Infrastructure**: Render (Backend Hosting), GitHub Pages (Frontend Hosting).

## 系統架構

1.  **Signaling (信令)**: 使用 Socket.io 交換雙方的 SDP (Session Description Protocol) 和 ICE Candidates。
2.  **Room Management**: 使用 Redis 設定 TTL (Time-To-Live)，讓配對代碼在 5 分鐘後自動過期。
3.  **Data Transfer**: 建立 WebRTC `DataChannel`，繞過伺服器直接傳輸二進位檔案資料 (ArrayBuffer)。

## ⚠️開發挑戰與解決方案

在開發過程中，我遇到很多 WebRTC 與網路通訊的經典難題，以下是狀況跟解決過程記錄：

### 1. 跨域資源共享限制 (CORS）
* **問題**: 前端部署於 GitHub Pages，後端位於 Render，瀏覽器阻擋了跨域的 Socket 連線請求。
* **解決**: 在 Express 與 Socket.io 伺服器端同步設定 CORS Header，並允許 `origin: "*"` 以及 `methods: ["GET", "POST"]`，徹底解決握手失敗問題。

### 2. WebRTC 競態條件
* **問題**: 網路環境較快時，ICE Candidates (網路路徑資訊) 往往比 SDP Offer/Answer 先抵達。導致瀏覽器拋出 `Remote description was null` 錯誤，無法建立連線。
* **解決**: 實作 **Candidate Queue (候選列隊)** 機制。當 `remoteDescription` 尚未設定時，將收到的 ICE Candidate 暫存入陣列；待 SDP 設定完成後，再透過 `processQueue()` 一次性處理。

### 3. 信號反射與無限迴圈
* **問題**: 使用 `io.to(room).emit` 廣播時，發送者 (Sender) 收到了自己發出的 Offer，導致瀏覽器混淆角色，拋出 `Failed to set SSL role` 錯誤，甚至造成無限重連。
* **解決**: 
    1.  嚴格區分 **Sender (Host)** 與 **Receiver (Guest)** 角色。
    2.  後端改用 `socket.to(room).emit`，確保訊息只傳給「房間內的其他人」，而不傳回給自己。
    3.  前端加入 `if (isInitiator)` 判斷，發送者只處理 Answer，接收者只處理 Offer。
### 4. UI 狀態同步
* **問題**: 雖然 Console 顯示連線成功，但 UI 仍卡在「等待中」。
* **解決**: 監聽 WebRTC 的 `dataChannel.onopen` 事件，將其作為「絕對成功」的指標，強制觸發 UI 頁面切換 (`showStep`)，確保使用者體驗與底層狀態一致。

**Created by Nasir Lin @**
