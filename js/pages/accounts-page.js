pages['accounts-page'] = function ($self) { }
$(function () {

    $("#sign-in").click(function () {
        chrome.tabs.update({
            url: "https://webcull.com/accounts"
        });
        window.close();
    });
})