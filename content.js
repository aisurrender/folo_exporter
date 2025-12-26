function extractLinks(onlyUnread) {
    // Select all links (including relative ones)
    const links = Array.from(document.querySelectorAll('a'));
    const uniqueLinks = new Set();
    const markdownList = [];

    links.forEach(a => {
        const url = a.href;

        // CLEANUP TITLE: Split by newline and take the first line to avoid capturing summary/time
        const rawTitle = a.innerText.trim();
        const title = rawTitle.split('\n')[0].trim();

        // UNREAD DETECTION
        // Previous approach (font-medium) failed because it seems widely used.
        // New approach: Check for 'text-text-secondary' on the title element or its parent.
        // Read items are visually gray (text-text-secondary). Unread are black (text-text).

        let isUnread = true;

        // Find the element that actually holds the title text
        // (We iterate over span/div/h* to find the one matching the title string)
        const allElements = Array.from(a.querySelectorAll('*'));
        const titleEl = allElements.find(el => el.innerText && el.innerText.trim() === title && el.children.length === 0) || a;

        // Check if the title element (or its direct parent) has the gray text class
        // 'text-text-secondary' usually indicates read/grayed out status.
        if (titleEl.classList.contains('text-text-secondary') || (titleEl.parentElement && titleEl.parentElement.classList.contains('text-text-secondary'))) {
            isUnread = false;
        }

        // Apply filters
        if (title.length > 5 && url.startsWith('http') && !uniqueLinks.has(url) && !url.includes('/feed/') && !url.includes('/profile/')) {
            if (onlyUnread && !isUnread) return; // Skip read items if requested

            uniqueLinks.add(url);
            markdownList.push(`- [ ] [${title}](${url})`);
        }
    });

    if (markdownList.length === 0) return "";
    return markdownList.join('\n');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {
        const data = extractLinks(request.onlyUnread);
        const count = data ? data.split('\n').length : 0;
        sendResponse({ data: data, count: count });
    }
});
