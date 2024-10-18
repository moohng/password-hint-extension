// 添加上下文菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'passwordHintMenu',
    title: 'Password Hint - 账号密码辅助记忆',
    contexts: ['all'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
  if (info.menuItemId === 'passwordHintMenu') {
    try {
      await chrome.tabs.sendMessage(tab!.id!, { type: 'open-hint-dialog', tab, info });
    } catch (error) {
      // 动态注入脚本
      await chrome.scripting.executeScript({
        target: { tabId: tab!.id! },
        files: ['hint.js'],
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab!.id! },
        files: ['hint.css'],
      });
      chrome.tabs.sendMessage(tab!.id!, { type: 'open-hint-dialog', tab, info });
    }
  }
});
