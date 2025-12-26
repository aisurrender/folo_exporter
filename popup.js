document.getElementById('exportBtn').addEventListener('click', () => {
    const onlyUnread = document.getElementById('onlyUnread').checked;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "extract", onlyUnread: onlyUnread }, (response) => {
            if (response && response.data) {
                navigator.clipboard.writeText(response.data).then(() => {
                    document.getElementById('status').innerText = `✅ Copied ${response.count} items!`;
                });
            } else {
                document.getElementById('status').innerText = "❌ Failed or Empty";
            }
        });
    });
});
